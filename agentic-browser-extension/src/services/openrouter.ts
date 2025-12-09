// ============================================
// OpenRouter LLM Service
// Multi-model support with Perplexity integration
// ============================================

import { LLMMessage, Tool, ToolCall } from '../shared/types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  model: string;
  choices: {
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Partial<ToolCall>[];
    };
    finish_reason: string | null;
  }[];
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export class OpenRouterService {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(apiKey: string, defaultModel: string = 'anthropic/claude-3.5-sonnet') {
    this.apiKey = apiKey;
    this.baseUrl = OPENROUTER_BASE_URL;
    this.defaultModel = defaultModel;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model;
  }

  async chat(
    messages: LLMMessage[],
    model?: string,
    tools?: Tool[],
    options: LLMOptions = {}
  ): Promise<OpenRouterResponse> {
    const selectedModel = model || this.defaultModel;

    const requestBody: any = {
      model: selectedModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        ...(msg.name && { name: msg.name }),
        ...(msg.tool_calls && { tool_calls: msg.tool_calls })
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stream: false
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    if (options.stop) {
      requestBody.stop = options.stop;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'chrome-extension://agentic-browser',
        'X-Title': 'Agentic Browser Extension'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async *streamChat(
    messages: LLMMessage[],
    model?: string,
    tools?: Tool[],
    options: LLMOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const selectedModel = model || this.defaultModel;

    const requestBody: any = {
      model: selectedModel,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.tool_call_id && { tool_call_id: msg.tool_call_id }),
        ...(msg.name && { name: msg.name }),
        ...(msg.tool_calls && { tool_calls: msg.tool_calls })
      })),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true
    };

    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'chrome-extension://agentic-browser',
        'X-Title': 'Agentic Browser Extension'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const chunk: StreamChunk = JSON.parse(data);
            yield chunk;
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  // Perplexity-specific search query
  async searchWithPerplexity(
    query: string,
    model: string = 'perplexity/llama-3.1-sonar-large-128k-online'
  ): Promise<string> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful search assistant. Provide accurate, up-to-date information based on web search results.'
      },
      {
        role: 'user',
        content: query
      }
    ];

    const response = await this.chat(messages, model, undefined, {
      temperature: 0.3,
      maxTokens: 2048
    });

    return response.choices[0]?.message?.content || '';
  }

  // Execute tool calls and return results
  async executeToolCalls(
    toolCalls: ToolCall[],
    toolExecutor: (name: string, args: Record<string, any>) => Promise<string>
  ): Promise<LLMMessage[]> {
    const toolResults: LLMMessage[] = [];

    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        const result = await toolExecutor(toolCall.function.name, args);

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: result
        });
      } catch (error) {
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return toolResults;
  }

  // Run agent loop with tool execution
  async runAgentLoop(
    messages: LLMMessage[],
    tools: Tool[],
    toolExecutor: (name: string, args: Record<string, any>) => Promise<string>,
    model?: string,
    maxIterations: number = 10,
    onIteration?: (iteration: number, message: LLMMessage) => void
  ): Promise<string> {
    let currentMessages = [...messages];
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await this.chat(currentMessages, model, tools);
      const assistantMessage = response.choices[0]?.message;

      if (!assistantMessage) {
        throw new Error('No response from model');
      }

      const llmMessage: LLMMessage = {
        role: 'assistant',
        content: assistantMessage.content || '',
        tool_calls: assistantMessage.tool_calls
      };

      currentMessages.push(llmMessage);
      onIteration?.(iteration, llmMessage);

      // If no tool calls, we're done
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        return assistantMessage.content || '';
      }

      // Execute tool calls
      const toolResults = await this.executeToolCalls(
        assistantMessage.tool_calls,
        toolExecutor
      );

      currentMessages.push(...toolResults);
      iteration++;
    }

    throw new Error(`Agent loop exceeded max iterations (${maxIterations})`);
  }

  // Get available models from OpenRouter
  async getAvailableModels(): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  // Check API key validity
  async validateApiKey(): Promise<boolean> {
    try {
      await this.getAvailableModels();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let openRouterInstance: OpenRouterService | null = null;

export function getOpenRouterService(apiKey?: string): OpenRouterService {
  if (!openRouterInstance && apiKey) {
    openRouterInstance = new OpenRouterService(apiKey);
  }
  if (!openRouterInstance) {
    throw new Error('OpenRouter service not initialized. Provide an API key.');
  }
  return openRouterInstance;
}

export function initOpenRouterService(apiKey: string, defaultModel?: string): OpenRouterService {
  openRouterInstance = new OpenRouterService(apiKey, defaultModel);
  return openRouterInstance;
}
