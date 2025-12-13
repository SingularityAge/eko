// ============================================
// OpenRouter Service - Simple & Direct
// Uses the selected model without client-side fallback
// ============================================

import { LLMMessage, Tool, ToolCall } from '../shared/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  setApiKey(key: string): void {
    this.apiKey = key;
  }

  async chat(
    messages: LLMMessage[],
    model: string,
    tools?: Tool[],
    temperature: number = 0.7
  ): Promise<{ content: string | null; toolCalls: ToolCall[] | null }> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not set');
    }

    const body: any = {
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls && { tool_calls: m.tool_calls }),
        ...(m.tool_call_id && { tool_call_id: m.tool_call_id })
      })),
      temperature,
      max_tokens: 4096
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    console.log('[OPENROUTER] Sending request to:', model);

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'chrome-extension://autobrowser',
        'X-Title': 'AutoBrowser Extension'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OPENROUTER] Error:', response.status, errorText);
      throw new Error(`OpenRouter error ${response.status}: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      throw new Error('No response from OpenRouter');
    }

    console.log('[OPENROUTER] Response received, content length:', message.content?.length || 0);

    return {
      content: message.content,
      toolCalls: message.tool_calls || null
    };
  }

  // Search with Perplexity model for URL discovery and address lookup
  async searchWithPerplexity(query: string): Promise<string> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a web search assistant. Return relevant information based on the query.'
      },
      {
        role: 'user',
        content: query
      }
    ];

    console.log('[OPENROUTER] Perplexity search:', query.slice(0, 50));

    const result = await this.chat(messages, 'perplexity/sonar', undefined, 0.3);
    return result.content || '';
  }
}

// Singleton
let instance: OpenRouterService | null = null;

export function getOpenRouter(apiKey?: string): OpenRouterService {
  if (!instance) {
    instance = new OpenRouterService(apiKey || '');
  }
  if (apiKey) {
    instance.setApiKey(apiKey);
  }
  return instance;
}
