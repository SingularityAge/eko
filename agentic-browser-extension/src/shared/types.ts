// ============================================
// Shared Types - Clean Implementation
// ============================================

export const STORAGE_KEYS = {
  SETTINGS: 'autobrowser_settings',
  CREDENTIALS: 'autobrowser_credentials',
  ACTIVITIES: 'autobrowser_activities'
} as const;

export interface Settings {
  openRouterApiKey: string;
  model: string;
  persona: Persona | null;
  enabled: boolean;
  discoveredUrls?: string[];
}

export interface Persona {
  firstName: string;
  lastName: string;
  age: number;
  country: string;
  city: string;
  occupation: string;
  interests: string[];
}

export interface Credential {
  id: string;
  domain: string;
  url: string;
  email: string;
  password: string;
  username?: string;
  createdAt: number;
  lastUsed?: number;
}

export interface Activity {
  id: string;
  type: 'navigation' | 'click' | 'type' | 'scroll' | 'search' | 'login' | 'signup' | 'error';
  url?: string;
  details: string;
  timestamp: number;
}

export interface BrowserState {
  status: 'idle' | 'running' | 'paused';
  currentUrl: string;
  currentAction: string;
  totalActions: number;
  errors: number;
}

export interface Message {
  type: string;
  payload?: any;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export const DEFAULT_SETTINGS: Settings = {
  openRouterApiKey: '',
  model: 'anthropic/claude-sonnet-4',
  persona: null,
  enabled: false
};
