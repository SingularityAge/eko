// ============================================
// Shared Types - Clean Implementation
// ============================================

export const STORAGE_KEYS = {
  SETTINGS: 'autobrowser_settings',
  CREDENTIALS: 'autobrowser_credentials'
} as const;

export interface Settings {
  openRouterApiKey: string;
  model: string;
  persona: Persona | null;
  enabled: boolean;
  discoveredUrls?: string[];
  // Agent email for signups
  agentEmail?: string;
  agentEmailPassword?: string;
  // IMAP settings for email verification
  imapHost?: string;
  imapPort?: number;
}

export interface Persona {
  firstName: string;
  lastName: string;
  age: number;
  country: string;
  city: string;
  occupation: string;
  interests: string[];
  // Address fields for website signups
  streetAddress: string;  // e.g., "123 Main Street"
  state: string;          // e.g., "New York" or federal state/region
  zipCode: string;        // e.g., "10001"
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
