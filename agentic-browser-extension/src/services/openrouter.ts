// ============================================
// OpenRouter Service - Simple & Robust
// With fallback handling and provider routing
// ============================================

import { LLMMessage, Tool, ToolCall } from '../shared/types';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Fallback models in order of preference (vision-capable, reliable)
const FALLBACK_MODELS = [
  'anthropic/claude-3.5-sonnet',        // Most reliable Claude model
  'anthropic/claude-3-5-sonnet-20241022', // Alternative Claude ID
  'openai/gpt-4o',                       // GPT-4 with vision
  'openai/gpt-4o-mini',                  // Faster GPT-4
  'google/gemini-flash-1.5',             // Fast Gemini
  'google/gemini-pro-1.5',               // Standard Gemini
  'meta-llama/llama-3.1-70b-instruct'    // Llama fallback
];

export class OpenRouterService {
  private apiKey: string;
  private lastWorkingModel: string | null = null;

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
    temperature: number = 0.7,
    retryCount: number = 0
  ): Promise<{ content: string | null; toolCalls: ToolCall[] | null }> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not set');
    }

    // Use last working model if available and current model failed before
    const modelToUse = this.lastWorkingModel && retryCount > 0 ? this.lastWorkingModel : model;

    const body: any = {
      model: modelToUse,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.tool_calls && { tool_calls: m.tool_calls }),
        ...(m.tool_call_id && { tool_call_id: m.tool_call_id })
      })),
      temperature,
      max_tokens: 4096
      // Note: Don't set 'provider' object - let OpenRouter auto-route to available providers
    };

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    console.log('[OPENROUTER] Sending request to:', modelToUse, '(retry:', retryCount, ')');

    try {
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

        // If model not available (404), try fallback models
        if (response.status === 404 && retryCount < FALLBACK_MODELS.length) {
          const fallbackModel = FALLBACK_MODELS[retryCount];
          console.log('[OPENROUTER] Model unavailable, trying fallback:', fallbackModel);
          return this.chat(messages, fallbackModel, tools, temperature, retryCount + 1);
        }

        // If rate limited, wait and retry
        if (response.status === 429 && retryCount < 3) {
          console.log('[OPENROUTER] Rate limited, waiting 2s...');
          await new Promise(r => setTimeout(r, 2000));
          return this.chat(messages, model, tools, temperature, retryCount + 1);
        }

        throw new Error(`OpenRouter error ${response.status}: ${errorText.slice(0, 200)}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message;

      if (!message) {
        throw new Error('No response from OpenRouter');
      }

      // Remember this model works
      this.lastWorkingModel = modelToUse;
      console.log('[OPENROUTER] Response received, content length:', message.content?.length || 0);

      return {
        content: message.content,
        toolCalls: message.tool_calls || null
      };
    } catch (error) {
      // Network error - try fallback
      if (retryCount < FALLBACK_MODELS.length - 1) {
        const fallbackModel = FALLBACK_MODELS[retryCount + 1];
        console.log('[OPENROUTER] Error, trying fallback:', fallbackModel, error);
        return this.chat(messages, fallbackModel, tools, temperature, retryCount + 1);
      }
      throw error;
    }
  }

  // Search with Perplexity model for URL discovery
  async searchWithPerplexity(query: string): Promise<string> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a web search assistant. Return relevant URLs and brief descriptions based on the query. Format: list URLs with descriptions.'
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
