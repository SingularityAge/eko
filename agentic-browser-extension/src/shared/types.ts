// ============================================
// Core Types for Agentic Browser Extension
// ============================================

// OpenRouter LLM Configuration
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  models: {
    browsing: string;
    search: string;
    social: string;
    email: string;
    persona: string;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | MessageContent[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
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
    parameters: Record<string, any>;
  };
}

// Agent Types
export type AgentType = 'browsing' | 'search' | 'social' | 'email' | 'persona';

export interface AgentState {
  id: string;
  type: AgentType;
  status: 'idle' | 'running' | 'paused' | 'error';
  currentTask?: string;
  lastActivity?: number;
  errorMessage?: string;
}

export interface AgentTask {
  id: string;
  agentType: AgentType;
  task: string;
  priority: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

// Persona Types
export interface PersonaProfile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'non-binary';
  location: {
    city: string;
    state: string;
    timezone: string;
  };
  occupation: string;
  education: string;
  interests: string[];
  personality: PersonalityTraits;
  browsingHabits: BrowsingHabits;
  schedule: DailySchedule;
  socialMedia: SocialMediaPresence;
  email: EmailConfig;
}

export interface PersonalityTraits {
  openness: number; // 0-1
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  techSavviness: number;
  attentionSpan: number;
  typingSpeed: number; // WPM
  typoRate: number; // 0-1 probability
}

export interface BrowsingHabits {
  favoriteCategories: string[];
  favoriteSites: string[];
  searchPatterns: string[];
  avgSessionLength: number; // minutes
  tabBehavior: 'single' | 'few' | 'many';
  scrollSpeed: 'slow' | 'medium' | 'fast';
  readingDepth: 'skim' | 'moderate' | 'deep';
}

export interface DailySchedule {
  wakeTime: string; // HH:MM
  sleepTime: string;
  workStart?: string;
  workEnd?: string;
  lunchTime?: string;
  peakBrowsingHours: number[];
  weekendDifferent: boolean;
}

export interface SocialMediaPresence {
  platforms: SocialPlatform[];
  postingFrequency: 'rarely' | 'sometimes' | 'often' | 'very_often';
  engagementStyle: 'lurker' | 'reactor' | 'commenter' | 'creator';
}

export interface SocialPlatform {
  name: string;
  username?: string;
  password?: string;
  usage: 'primary' | 'secondary' | 'occasional';
}

// Email Configuration - Webpage-based login
export interface EmailConfig {
  provider: 'gmail' | 'outlook' | 'yahoo' | 'protonmail' | 'other';
  email: string;
  password: string;
  loginUrl?: string; // Custom login URL for 'other' providers
  checkFrequency: number; // minutes
  autoCheck: boolean;
}

// DOM Navigation Types
export interface DOMElement {
  index: number;
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  rect: DOMRect;
  isVisible: boolean;
  isClickable: boolean;
  isInput: boolean;
}

export interface PageState {
  url: string;
  title: string;
  domain: string;
  elements: DOMElement[];
  forms: FormInfo[];
  links: LinkInfo[];
  scrollPosition: { x: number; y: number };
  viewportSize: { width: number; height: number };
  timestamp: number;
}

export interface FormInfo {
  index: number;
  action: string;
  method: string;
  fields: FormField[];
}

export interface FormField {
  name: string;
  type: string;
  label?: string;
  required: boolean;
  value?: string;
  options?: string[];
}

export interface LinkInfo {
  index: number;
  href: string;
  text: string;
  isExternal: boolean;
}

// Activity Tracking
export interface Activity {
  id: string;
  type: ActivityType;
  url?: string;
  title?: string;
  details: Record<string, any>;
  timestamp: number;
  duration?: number;
  agentId?: string;
}

export type ActivityType =
  | 'page_visit'
  | 'search'
  | 'click'
  | 'scroll'
  | 'type'
  | 'form_submit'
  | 'email_check'
  | 'email_read'
  | 'email_compose'
  | 'social_browse'
  | 'social_post'
  | 'social_react'
  | 'video_watch'
  | 'article_read'
  | 'shopping'
  | 'distraction'
  | 'break'
  | 'idle';

// Settings
export interface ExtensionSettings {
  openRouterApiKey: string;
  models: {
    browsing: string;
    search: string;
    social: string;
    email: string;
    persona: string;
  };
  persona: PersonaProfile;
  autoStart: boolean;
  maxConcurrentAgents: number;
  debugMode: boolean;
  humanization: {
    enabled: boolean;
    typoRate: number;
    thinkingPauses: boolean;
    naturalScrolling: boolean;
    mouseJitter: boolean;
  };
}

// Messages between components
export interface ExtensionMessage {
  type: MessageType;
  payload?: any;
  source?: 'background' | 'content' | 'popup' | 'sidebar';
  tabId?: number;
}

export type MessageType =
  | 'GET_STATE'
  | 'SET_STATE'
  | 'START_AGENT'
  | 'STOP_AGENT'
  | 'PAUSE_AGENT'
  | 'RESUME_AGENT'
  | 'EXECUTE_TASK'
  | 'GET_PAGE_STATE'
  | 'CLICK_ELEMENT'
  | 'TYPE_TEXT'
  | 'SCROLL_PAGE'
  | 'SCROLL_TO_ELEMENT'
  | 'NAVIGATE_TO'
  | 'GET_ACTIVITIES'
  | 'UPDATE_SETTINGS'
  | 'AGENT_UPDATE'
  | 'ACTIVITY_LOG'
  | 'TAKE_SCREENSHOT'
  | 'EXTRACT_PAGE_CONTENT'
  | 'FILL_FORM'
  | 'HOVER_ELEMENT'
  | 'WAIT_FOR_ELEMENT'
  | 'ERROR';

// Storage Keys
export const STORAGE_KEYS = {
  SETTINGS: 'agentic_settings',
  PERSONA: 'agentic_persona',
  ACTIVITIES: 'agentic_activities',
  AGENT_STATE: 'agentic_agent_state',
  SESSION: 'agentic_session'
} as const;

// Default Models
export const DEFAULT_MODELS = {
  browsing: 'anthropic/claude-3.5-sonnet',
  search: 'perplexity/llama-3.1-sonar-large-128k-online',
  social: 'anthropic/claude-3.5-sonnet',
  email: 'anthropic/claude-3-haiku',
  persona: 'openai/gpt-4o'
} as const;

// Perplexity Models available via OpenRouter
export const PERPLEXITY_MODELS = [
  'perplexity/llama-3.1-sonar-small-128k-online',
  'perplexity/llama-3.1-sonar-large-128k-online',
  'perplexity/llama-3.1-sonar-huge-128k-online'
] as const;

// All available OpenRouter models
export const AVAILABLE_MODELS = [
  // Anthropic
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3-opus',
  'anthropic/claude-3-haiku',
  // OpenAI
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/gpt-4-turbo',
  // Perplexity (online search enabled)
  ...PERPLEXITY_MODELS,
  // Meta
  'meta-llama/llama-3.1-70b-instruct',
  'meta-llama/llama-3.1-8b-instruct',
  // Google
  'google/gemini-pro-1.5',
  'google/gemini-flash-1.5',
  // Mistral
  'mistralai/mistral-large',
  'mistralai/mixtral-8x7b-instruct'
] as const;

// Email Provider URLs
export const EMAIL_PROVIDERS = {
  gmail: {
    name: 'Gmail',
    loginUrl: 'https://accounts.google.com/signin/v2/identifier?service=mail',
    inboxUrl: 'https://mail.google.com/mail/u/0/#inbox',
    composeUrl: 'https://mail.google.com/mail/u/0/#compose'
  },
  outlook: {
    name: 'Outlook',
    loginUrl: 'https://login.live.com/',
    inboxUrl: 'https://outlook.live.com/mail/0/inbox',
    composeUrl: 'https://outlook.live.com/mail/0/deeplink/compose'
  },
  yahoo: {
    name: 'Yahoo Mail',
    loginUrl: 'https://login.yahoo.com/',
    inboxUrl: 'https://mail.yahoo.com/d/folders/1',
    composeUrl: 'https://mail.yahoo.com/d/compose/'
  },
  protonmail: {
    name: 'ProtonMail',
    loginUrl: 'https://account.proton.me/login',
    inboxUrl: 'https://mail.proton.me/u/0/inbox',
    composeUrl: 'https://mail.proton.me/u/0/compose'
  }
} as const;

// Young US Citizen Interests Database
export const YOUNG_US_INTERESTS = {
  entertainment: [
    'Netflix', 'YouTube', 'TikTok', 'Spotify', 'Twitch',
    'Disney+', 'Hulu', 'HBO Max', 'podcasts', 'memes'
  ],
  social: [
    'Instagram', 'Twitter/X', 'Snapchat', 'Discord', 'Reddit',
    'BeReal', 'Threads', 'LinkedIn'
  ],
  shopping: [
    'Amazon', 'Target', 'Walmart', 'Shein', 'Nike',
    'Etsy', 'eBay', 'Best Buy', 'thrifting'
  ],
  food: [
    'DoorDash', 'Uber Eats', 'Chipotle', 'Starbucks',
    'fast food', 'cooking videos', 'food reviews'
  ],
  fitness: [
    'gym', 'running', 'yoga', 'hiking', 'sports',
    'workout videos', 'nutrition', 'mental health'
  ],
  tech: [
    'gaming', 'iPhone', 'apps', 'AI', 'coding',
    'tech reviews', 'gadgets', 'cryptocurrency'
  ],
  education: [
    'online courses', 'tutorials', 'skill building',
    'career advice', 'college', 'certifications'
  ],
  news: [
    'politics', 'current events', 'local news',
    'world news', 'science', 'technology news'
  ]
} as const;

// Common search patterns for young US users
export const YOUNG_US_SEARCH_PATTERNS = [
  'best {category} near me',
  '{product} reviews',
  'how to {action}',
  '{celebrity} news',
  '{show/movie} streaming',
  'cheap {item}',
  '{topic} explained',
  'is {thing} worth it',
  '{brand} discount code',
  'what is {trending topic}'
] as const;
