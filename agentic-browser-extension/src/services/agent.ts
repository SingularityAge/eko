// ============================================
// Autonomous Browser Agent - Core Logic
// ============================================

import { getOpenRouter, OpenRouterService } from './openrouter';
import { getSettings, getCredentials, getCredentialByDomain, saveCredential, logActivity, extractDomain } from './storage';
import { Tool, ToolCall, LLMMessage, Persona, BrowserState, Credential } from '../shared/types';

// Browser tools the agent can use
const TOOLS: Tool[] = [
  {
    type: 'function',
    function: {
      name: 'click',
      description: 'Click on an element by its index number',
      parameters: {
        type: 'object',
        properties: {
          index: { type: 'number', description: 'Element index from the DOM tree' }
        },
        required: ['index']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'type',
      description: 'Type text into the currently focused input',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to type' },
          pressEnter: { type: 'boolean', description: 'Press Enter after typing' }
        },
        required: ['text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'scroll',
      description: 'Scroll the page',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', enum: ['up', 'down'], description: 'Scroll direction' },
          amount: { type: 'number', description: 'Pixels to scroll (default 500)' }
        },
        required: ['direction']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigate',
      description: 'Navigate to a URL',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to navigate to' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'wait',
      description: 'Wait for a moment',
      parameters: {
        type: 'object',
        properties: {
          seconds: { type: 'number', description: 'Seconds to wait' }
        },
        required: ['seconds']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_bing',
      description: 'Search using Bing',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'done',
      description: 'Mark current task as complete and move on',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'What was accomplished' }
        },
        required: ['summary']
      }
    }
  }
];

export class AutonomousBrowserAgent {
  private llm: OpenRouterService;
  private model: string = 'anthropic/claude-sonnet-4';
  private state: BrowserState;
  private running: boolean = false;
  private tabId: number | null = null;
  private persona: Persona | null = null;
  private urlQueue: string[] = [];
  private visitedUrls: Set<string> = new Set();
  private onStateChange: ((state: BrowserState) => void) | null = null;

  // Context management for long-running sessions
  private conversationHistory: LLMMessage[] = [];
  private sessionSummary: string = '';
  private totalTokensEstimate: number = 0;
  private readonly TOKEN_LIMIT: number = 10000;
  private readonly CHARS_PER_TOKEN: number = 4; // Approximate

  constructor() {
    this.llm = getOpenRouter();
    this.state = {
      status: 'idle',
      currentUrl: '',
      currentAction: '',
      totalActions: 0,
      errors: 0
    };
  }

  setStateCallback(callback: (state: BrowserState) => void): void {
    this.onStateChange = callback;
  }

  private updateState(updates: Partial<BrowserState>): void {
    this.state = { ...this.state, ...updates };
    this.onStateChange?.(this.state);
    console.log('[AGENT] State:', this.state.status, '-', this.state.currentAction);
  }

  getState(): BrowserState {
    return { ...this.state };
  }

  async start(): Promise<void> {
    if (this.running) {
      console.log('[AGENT] Already running');
      return;
    }

    console.log('[AGENT] ========================================');
    console.log('[AGENT] Starting autonomous browsing');
    console.log('[AGENT] ========================================');

    // Load settings
    const settings = await getSettings();
    if (!settings.openRouterApiKey) {
      this.updateState({ status: 'idle', currentAction: 'Error: No API key configured' });
      return;
    }

    this.llm.setApiKey(settings.openRouterApiKey);
    this.model = settings.model || 'anthropic/claude-sonnet-4';
    this.persona = settings.persona;
    this.running = true;
    this.visitedUrls.clear();

    this.updateState({ status: 'running', currentAction: 'Initializing...', totalActions: 0, errors: 0 });

    // Get or create a tab
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.tabId = activeTab?.id || null;

      if (!this.tabId) {
        const newTab = await chrome.tabs.create({ url: 'https://www.bing.com' });
        this.tabId = newTab.id || null;
      }
    } catch (e) {
      console.warn('[AGENT] Tab setup error:', e);
    }

    // Discover URLs
    this.updateState({ currentAction: 'Discovering interesting URLs...' });
    await this.discoverUrls();

    // Main browsing loop
    await this.browsingLoop();
  }

  stop(): void {
    console.log('[AGENT] Stopping');
    this.running = false;
    this.updateState({ status: 'idle', currentAction: 'Stopped' });
  }

  pause(): void {
    this.updateState({ status: 'paused', currentAction: 'Paused' });
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.updateState({ status: 'running', currentAction: 'Resumed' });
    }
  }

  private async discoverUrls(): Promise<void> {
    console.log('[AGENT] Discovering URLs...');

    // Start with credential sites (sites we have accounts on)
    const credentials = await getCredentials();
    const credentialUrls = credentials.map(c => c.url);

    // Default fallback URLs
    const defaultUrls = [
      'https://www.bing.com',
      'https://www.reddit.com',
      'https://www.youtube.com',
      'https://news.ycombinator.com',
      'https://www.wikipedia.org'
    ];

    // Add persona favorites if available
    let personaUrls: string[] = [];
    if (this.persona?.favoriteSites) {
      personaUrls = this.persona.favoriteSites.map(s =>
        s.startsWith('http') ? s : `https://${s}`
      );
    }

    // Try Perplexity search for more URLs
    if (this.persona) {
      try {
        const query = `Find popular websites for someone interested in: ${this.persona.interests.join(', ')}. List 5-10 relevant website URLs.`;
        const result = await this.llm.searchWithPerplexity(query);

        // Extract URLs from response
        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
        const matches = result.match(urlRegex) || [];
        const discovered = matches.filter(url => {
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        });

        console.log('[AGENT] Perplexity found:', discovered.length, 'URLs');
        this.urlQueue = [...new Set([...credentialUrls, ...discovered, ...personaUrls, ...defaultUrls])];
      } catch (e) {
        console.warn('[AGENT] Perplexity search failed:', e);
        this.urlQueue = [...new Set([...credentialUrls, ...personaUrls, ...defaultUrls])];
      }
    } else {
      this.urlQueue = [...new Set([...credentialUrls, ...personaUrls, ...defaultUrls])];
    }

    console.log('[AGENT] URL queue:', this.urlQueue.length, 'URLs');
  }

  private async browsingLoop(): Promise<void> {
    console.log('[AGENT] Starting browsing loop');
    let consecutiveErrors = 0;

    while (this.running) {
      // Check if paused
      if (this.state.status === 'paused') {
        await this.sleep(1000);
        continue;
      }

      try {
        // Pick next URL if we need one
        if (!this.state.currentUrl || Math.random() < 0.15) {
          await this.navigateToNextUrl();
        }

        // Get page state
        const pageState = await this.getPageState();
        if (!pageState) {
          await this.sleep(2000);
          continue;
        }

        // Check for login opportunity
        const domain = extractDomain(pageState.url);
        const cred = await getCredentialByDomain(domain);

        // Generate task for LLM
        const task = this.generateTask(pageState, cred);

        // Get LLM decision
        this.updateState({ currentAction: 'Thinking...' });
        const action = await this.getNextAction(task, pageState);

        if (action) {
          // Execute action
          this.updateState({ currentAction: `Executing: ${action.name}` });
          const result = await this.executeAction(action.name, action.args);

          await logActivity({
            type: this.mapActionToActivityType(action.name),
            url: pageState.url,
            details: `${action.name}: ${JSON.stringify(action.args).slice(0, 100)} -> ${result.slice(0, 100)}`
          });

          this.updateState({ totalActions: this.state.totalActions + 1 });
          consecutiveErrors = 0;
        }

        // Human-like pause
        await this.sleep(1000 + Math.random() * 2000);

      } catch (error) {
        console.error('[AGENT] Loop error:', error);
        consecutiveErrors++;
        this.updateState({
          errors: this.state.errors + 1,
          currentAction: `Error: ${error instanceof Error ? error.message : String(error)}`
        });

        // Recovery logic
        if (consecutiveErrors >= 10) {
          console.log('[AGENT] Too many errors, moving to next URL');
          await this.navigateToNextUrl();
          consecutiveErrors = 0;
        }

        await this.sleep(2000);
      }
    }

    console.log('[AGENT] Browsing loop ended');
  }

  private async navigateToNextUrl(): Promise<void> {
    // Get unvisited URL
    let nextUrl = this.urlQueue.find(url => !this.visitedUrls.has(url));

    if (!nextUrl) {
      // All URLs visited, reset and start over
      this.visitedUrls.clear();
      await this.discoverUrls();
      nextUrl = this.urlQueue[0] || 'https://www.bing.com';
    }

    this.visitedUrls.add(nextUrl);
    this.updateState({ currentUrl: nextUrl, currentAction: `Navigating to ${nextUrl}` });

    try {
      if (this.tabId) {
        await chrome.tabs.update(this.tabId, { url: nextUrl });
        await this.sleep(2000); // Wait for navigation
      }
    } catch (e) {
      console.warn('[AGENT] Navigation error:', e);
    }
  }

  private async getPageState(): Promise<{ url: string; title: string; elements: string } | null> {
    if (!this.tabId) return null;

    try {
      const response = await chrome.tabs.sendMessage(this.tabId, { type: 'GET_PAGE_STATE' });
      return response;
    } catch (e) {
      // Content script might not be loaded, try injecting it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: this.tabId },
          files: ['content.js']
        });
        await this.sleep(500);
        const response = await chrome.tabs.sendMessage(this.tabId, { type: 'GET_PAGE_STATE' });
        return response;
      } catch (e2) {
        console.warn('[AGENT] Cannot get page state:', e2);
        return null;
      }
    }
  }

  private generateTask(pageState: { url: string; title: string; elements: string }, credential: Credential | null): string {
    let task = '';

    // Include session summary if we have one
    if (this.sessionSummary) {
      task += `Previous session summary:\n${this.sessionSummary}\n\n---\n\n`;
    }

    task += `You are browsing the web autonomously. Current page: ${pageState.url}\nTitle: ${pageState.title}\n\n`;

    if (this.persona) {
      task += `Persona: ${this.persona.name}, ${this.persona.age}yo, interested in ${this.persona.interests.join(', ')}.\n\n`;
    }

    if (credential) {
      task += `You have an account on this site:\n- Email: ${credential.email}\n- Password: ${credential.password}\nIf you see a login form, log in with these credentials.\n\n`;
    }

    task += `Interactive elements on page:\n${pageState.elements.slice(0, 8000)}\n\n`;

    task += `Instructions:
- Browse naturally like a human - read content, scroll, click interesting links
- If you see cookie consent, ALWAYS accept cookies
- If you see a login form and have credentials above, log in
- NEVER use "Sign in with Google" or "Sign in with Apple" - always use email/password
- Search using Bing only (not Google)
- Take your time, explore the page
- Use the 'done' tool when you want to move to a different site

What single action should you take next?`;

    return task;
  }

  private async getNextAction(task: string, pageState: { url: string }): Promise<{ name: string; args: any } | null> {
    // Build messages including recent conversation history
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an autonomous web browser. You browse naturally like a human - scrolling, reading, clicking links that interest you. Always accept cookies when asked. Never use Google/Apple login - use email/password instead. Reply with a single tool call for your next action.`
      }
    ];

    // Add recent conversation context (last 5 exchanges)
    const recentHistory = this.conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push(msg);
    }

    // Add current task
    const userMessage: LLMMessage = { role: 'user', content: task };
    messages.push(userMessage);

    try {
      const response = await this.llm.chat(messages, this.model, TOOLS, 0.7);

      // Track this exchange in history
      await this.addToHistory(userMessage);
      if (response.content) {
        await this.addToHistory({ role: 'assistant', content: response.content });
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        const tc = response.toolCalls[0];
        const args = JSON.parse(tc.function.arguments);

        // Log the action in history
        await this.addToHistory({
          role: 'assistant',
          content: `Action: ${tc.function.name}(${JSON.stringify(args)})`
        });

        return { name: tc.function.name, args };
      }

      // No tool call, probably just wants to observe
      return { name: 'scroll', args: { direction: 'down', amount: 300 } };
    } catch (e) {
      console.error('[AGENT] LLM error:', e);
      throw e;
    }
  }

  private async executeAction(name: string, args: any): Promise<string> {
    if (!this.tabId) {
      return 'Error: No tab';
    }

    console.log('[AGENT] Executing:', name, args);

    switch (name) {
      case 'click':
        return await this.sendToContent('CLICK', { index: args.index });

      case 'type':
        return await this.sendToContent('TYPE', { text: args.text, pressEnter: args.pressEnter });

      case 'scroll':
        return await this.sendToContent('SCROLL', { direction: args.direction, amount: args.amount || 500 });

      case 'navigate':
        const url = args.url.startsWith('http') ? args.url : `https://${args.url}`;
        await chrome.tabs.update(this.tabId, { url });
        this.updateState({ currentUrl: url });
        await this.sleep(2000);
        return `Navigated to ${url}`;

      case 'wait':
        const ms = (args.seconds || 1) * 1000;
        await this.sleep(ms);
        return `Waited ${args.seconds}s`;

      case 'search_bing':
        const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(args.query)}`;
        await chrome.tabs.update(this.tabId, { url: searchUrl });
        this.updateState({ currentUrl: searchUrl });
        await this.sleep(2000);
        return `Searched Bing for: ${args.query}`;

      case 'done':
        console.log('[AGENT] Task done:', args.summary);
        await this.navigateToNextUrl();
        return `Done: ${args.summary}`;

      default:
        return `Unknown action: ${name}`;
    }
  }

  private async sendToContent(type: string, payload: any): Promise<string> {
    if (!this.tabId) return 'Error: No tab';

    try {
      const response = await chrome.tabs.sendMessage(this.tabId, { type, payload });
      return response?.result || response?.error || 'OK';
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  private mapActionToActivityType(action: string): 'navigation' | 'click' | 'type' | 'scroll' | 'search' | 'login' | 'signup' | 'error' {
    switch (action) {
      case 'navigate': return 'navigation';
      case 'click': return 'click';
      case 'type': return 'type';
      case 'scroll': return 'scroll';
      case 'search_bing': return 'search';
      default: return 'click';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Estimate tokens in a string
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  // Estimate total tokens in conversation
  private estimateConversationTokens(): number {
    let total = 0;
    for (const msg of this.conversationHistory) {
      total += this.estimateTokens(msg.content);
    }
    return total;
  }

  // Check if context compaction is needed
  private needsCompaction(): boolean {
    return this.estimateConversationTokens() >= this.TOKEN_LIMIT;
  }

  // Compact context by summarizing and starting fresh
  private async compactContext(): Promise<void> {
    console.log('[AGENT] Context compaction triggered');
    console.log('[AGENT] Current tokens estimate:', this.estimateConversationTokens());

    // Build summary request
    const summaryMessages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Summarize the browsing session concisely, including: key sites visited, actions taken, any logins performed, errors encountered, and current state. Keep it under 500 words.'
      },
      {
        role: 'user',
        content: `Summarize this browsing session:\n\nPrevious summary: ${this.sessionSummary || 'None'}\n\nRecent actions:\n${this.conversationHistory.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}`
      }
    ];

    try {
      const response = await this.llm.chat(summaryMessages, this.model, undefined, 0.3);
      this.sessionSummary = response.content || this.sessionSummary;
      console.log('[AGENT] Session summarized:', this.sessionSummary.slice(0, 100));
    } catch (e) {
      console.warn('[AGENT] Failed to summarize, keeping recent messages:', e);
      // Keep last few messages as fallback
      this.sessionSummary = `Recent activity: ${this.conversationHistory.slice(-3).map(m => m.content.slice(0, 100)).join(' | ')}`;
    }

    // Clear conversation history, keeping only the summary as context
    this.conversationHistory = [];
    this.totalTokensEstimate = this.estimateTokens(this.sessionSummary);

    console.log('[AGENT] Context compacted, new token estimate:', this.totalTokensEstimate);
  }

  // Add message to conversation history with compaction check
  private async addToHistory(message: LLMMessage): Promise<void> {
    this.conversationHistory.push(message);
    this.totalTokensEstimate += this.estimateTokens(message.content);

    if (this.needsCompaction()) {
      await this.compactContext();
    }
  }
}

// Singleton
let agentInstance: AutonomousBrowserAgent | null = null;

export function getAgent(): AutonomousBrowserAgent {
  if (!agentInstance) {
    agentInstance = new AutonomousBrowserAgent();
  }
  return agentInstance;
}
