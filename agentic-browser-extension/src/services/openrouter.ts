// ============================================
// OpenRouter LLM Service
// Multi-model support with compatibility for all major AI families
// ============================================

import { LLMMessage, Tool, ToolCall } from '../shared/types';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Model family detection
type ModelFamily = 'claude' | 'openai' | 'gemini' | 'llama' | 'mistral' | 'perplexity' | 'other';

function detectModelFamily(model: string): ModelFamily {
  const modelLower = model.toLowerCase();
  if (modelLower.includes('claude') || modelLower.includes('anthropic')) return 'claude';
  if (modelLower.includes('gpt') || modelLower.includes('openai') || modelLower.includes('o1')) return 'openai';
  if (modelLower.includes('gemini') || modelLower.includes('google')) return 'gemini';
  if (modelLower.includes('llama') || modelLower.includes('meta')) return 'llama';
  if (modelLower.includes('mistral') || modelLower.includes('mixtral')) return 'mistral';
  if (modelLower.includes('perplexity') || modelLower.includes('sonar')) return 'perplexity';
  return 'other';
}

// Check if model supports tool/function calling
function supportsToolCalls(model: string): boolean {
  const family = detectModelFamily(model);
  // Most modern models support tool calls
  // Perplexity models are for search, not tool use
  if (family === 'perplexity') return false;
  return true;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
      reasoning?: string; // Gemini reasoning tokens
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

  // Store reasoning blocks for Gemini models
  private reasoningCache: Map<string, string> = new Map();

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

  // Get model-specific request configuration
  private getModelConfig(model: string, hasTools: boolean): Record<string, any> {
    const family = detectModelFamily(model);
    const config: Record<string, any> = {};

    switch (family) {
      case 'gemini':
        // Gemini requires reasoning to be included for tool calls
        if (hasTools) {
          config.include_reasoning = true;
          // Gemini also needs this provider setting
          config.provider = {
            order: ['Google AI Studio', 'Google'],
            require_parameters: true
          };
        }
        break;

      case 'claude':
        // Claude works well with default settings
        break;

      case 'openai':
        // OpenAI/GPT works well with default settings
        break;

      case 'llama':
      case 'mistral':
        // These may need parallel tool calls disabled for stability
        if (hasTools) {
          config.parallel_tool_calls = false;
        }
        break;

      case 'perplexity':
        // Perplexity is for search - no special config needed
        break;
    }

    return config;
  }

  async chat(
    messages: LLMMessage[],
    model?: string,
    tools?: Tool[],
    options: LLMOptions = {}
  ): Promise<OpenRouterResponse> {
    const selectedModel = model || this.defaultModel;
    const family = detectModelFamily(selectedModel);
    const hasTools = tools && tools.length > 0 && supportsToolCalls(selectedModel);

    // Build messages, preserving reasoning for Gemini
    const formattedMessages = messages.map(msg => {
      const formatted: any = {
        role: msg.role,
        content: msg.content,
      };

      if (msg.tool_call_id) formatted.tool_call_id = msg.tool_call_id;
      if (msg.name) formatted.name = msg.name;
      if (msg.tool_calls) formatted.tool_calls = msg.tool_calls;

      // For Gemini: preserve reasoning in assistant messages
      if (family === 'gemini' && msg.role === 'assistant' && typeof msg.content === 'string') {
        const reasoning = this.reasoningCache.get(msg.content || '');
        if (reasoning) {
          formatted.reasoning = reasoning;
        }
      }

      return formatted;
    });

    const requestBody: any = {
      model: selectedModel,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      top_p: options.topP ?? 1,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stream: false,
      // Add model-specific configuration
      ...this.getModelConfig(selectedModel, hasTools || false)
    };

    // Only add tools if the model supports them
    if (hasTools) {
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

      // Provide helpful error messages for common issues
      if (response.status === 400 && error.includes('thought_signature')) {
        throw new Error(`Gemini tool call error: This model requires reasoning tokens. Try using Claude or GPT models, or disable tool calls.`);
      }
      if (response.status === 401) {
        throw new Error(`Invalid API key. Please check your OpenRouter API key in settings.`);
      }
      if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Please wait a moment and try again.`);
      }

      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    // Cache reasoning for Gemini models
    if (family === 'gemini' && result.choices?.[0]?.message?.reasoning) {
      const content = result.choices[0].message.content;
      if (typeof content === 'string' && content) {
        this.reasoningCache.set(content, result.choices[0].message.reasoning);
      }
    }

    return result;
  }

  async *streamChat(
    messages: LLMMessage[],
    model?: string,
    tools?: Tool[],
    options: LLMOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const selectedModel = model || this.defaultModel;
    const hasTools = tools && tools.length > 0 && supportsToolCalls(selectedModel);

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
      stream: true,
      ...this.getModelConfig(selectedModel, hasTools || false)
    };

    if (hasTools) {
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

    // Perplexity models don't use tools, just direct search
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
        // Handle different argument formats
        let args: Record<string, any>;
        if (typeof toolCall.function.arguments === 'string') {
          args = JSON.parse(toolCall.function.arguments);
        } else {
          args = toolCall.function.arguments as Record<string, any>;
        }

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
    const selectedModel = model || this.defaultModel;

    // If model doesn't support tools, run without them
    const effectiveTools = supportsToolCalls(selectedModel) ? tools : [];

    let currentMessages = [...messages];
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await this.chat(currentMessages, selectedModel, effectiveTools);
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

  // Get model family for UI display
  static getModelFamily(model: string): ModelFamily {
    return detectModelFamily(model);
  }

  // Check if model supports tool calls
  static modelSupportsTools(model: string): boolean {
    return supportsToolCalls(model);
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
