// ============================================
// Autonomous Browser Agent - Core Logic
// With vision fallback, tab management, popup handling
// ============================================

import { getOpenRouter, OpenRouterService } from './openrouter';
import { getSettings, getCredentials, getCredentialByDomain, logActivity, extractDomain } from './storage';
import { Tool, LLMMessage, Persona, BrowserState, Credential } from '../shared/types';

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
      name: 'click_coordinates',
      description: 'Click at specific x,y coordinates on the page (use when element indexes fail)',
      parameters: {
        type: 'object',
        properties: {
          x: { type: 'number', description: 'X coordinate' },
          y: { type: 'number', description: 'Y coordinate' }
        },
        required: ['x', 'y']
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
      name: 'press_escape',
      description: 'Press Escape key to close popups, overlays, or modals',
      parameters: { type: 'object', properties: {} }
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
      description: 'Mark current task as complete and move on to another site',
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

  // Context management
  private conversationHistory: LLMMessage[] = [];
  private sessionSummary: string = '';
  private totalTokensEstimate: number = 0;
  private readonly TOKEN_LIMIT: number = 10000;
  private readonly CHARS_PER_TOKEN: number = 4;

  // Vision fallback tracking
  private lastPageState: string = '';
  private sameStateCount: number = 0;
  private consecutiveFailures: number = 0;
  private useVisionMode: boolean = false;

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
    this.useVisionMode = false;
    this.consecutiveFailures = 0;

    this.updateState({ status: 'running', currentAction: 'Initializing...', totalActions: 0, errors: 0 });

    // Get or create a tab and ensure focus
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.tabId = activeTab?.id || null;

      if (!this.tabId) {
        const newTab = await chrome.tabs.create({ url: 'https://www.bing.com', active: true });
        this.tabId = newTab.id || null;
      }

      // Ensure our tab is focused
      if (this.tabId) {
        await this.focusTab();
      }
    } catch (e) {
      console.warn('[AGENT] Tab setup error:', e);
    }

    this.updateState({ currentAction: 'Discovering interesting URLs...' });
    await this.discoverUrls();

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

  // Focus the active tab
  private async focusTab(): Promise<void> {
    if (!this.tabId) return;
    try {
      await chrome.runtime.sendMessage({ type: 'FOCUS_TAB', payload: { tabId: this.tabId } });
    } catch (e) {
      console.warn('[AGENT] Focus tab error:', e);
    }
  }

  // Track tab for cleanup (called when opening new tabs)
  private async trackTabForCleanup(tabId: number): Promise<void> {
    try {
      await chrome.runtime.sendMessage({ type: 'TRACK_TAB', payload: { tabId } });
    } catch (e) {
      console.warn('[AGENT] Track tab error:', e);
    }
  }

  // Take screenshot for vision analysis
  private async takeScreenshot(): Promise<string | null> {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'TAKE_SCREENSHOT' });
      return response?.screenshot || null;
    } catch (e) {
      console.warn('[AGENT] Screenshot error:', e);
      return null;
    }
  }

  private async discoverUrls(): Promise<void> {
    console.log('[AGENT] Discovering URLs...');

    const credentials = await getCredentials();
    const credentialUrls = credentials.map(c => c.url);

    const defaultUrls = [
      'https://www.bing.com',
      'https://www.reddit.com',
      'https://www.youtube.com',
      'https://news.ycombinator.com',
      'https://www.wikipedia.org'
    ];

    let personaUrls: string[] = [];
    if (this.persona?.favoriteSites) {
      personaUrls = this.persona.favoriteSites.map(s =>
        s.startsWith('http') ? s : `https://${s}`
      );
    }

    if (this.persona) {
      try {
        const query = `Find popular websites for someone interested in: ${this.persona.interests.join(', ')}. List 5-10 relevant website URLs.`;
        const result = await this.llm.searchWithPerplexity(query);

        const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
        const matches = result.match(urlRegex) || [];
        const discovered = matches.filter(url => {
          try { new URL(url); return true; } catch { return false; }
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
      if (this.state.status === 'paused') {
        await this.sleep(1000);
        continue;
      }

      try {
        // Ensure focus on our tab
        await this.focusTab();

        // Navigate to next URL if needed
        if (!this.state.currentUrl || Math.random() < 0.15) {
          await this.navigateToNextUrl();
          this.useVisionMode = false;
          this.consecutiveFailures = 0;
          this.sameStateCount = 0;
        }

        // Get page state
        const pageState = await this.getPageState();
        if (!pageState) {
          await this.sleep(2000);
          continue;
        }

        // Check for stuck state (same page state 3+ times)
        const stateHash = `${pageState.url}:${pageState.elements.slice(0, 500)}`;
        if (stateHash === this.lastPageState) {
          this.sameStateCount++;
          if (this.sameStateCount >= 3) {
            console.log('[AGENT] Stuck state detected, switching to vision mode');
            this.useVisionMode = true;
          }
        } else {
          this.lastPageState = stateHash;
          this.sameStateCount = 0;
        }

        // Check for login opportunity
        const domain = extractDomain(pageState.url);
        const cred = await getCredentialByDomain(domain);

        // Generate task
        let task: string;
        let screenshot: string | null = null;

        if (this.useVisionMode) {
          this.updateState({ currentAction: 'Taking screenshot for vision analysis...' });
          screenshot = await this.takeScreenshot();
          task = this.generateVisionTask(pageState, cred, screenshot);
        } else {
          task = this.generateTask(pageState, cred);
        }

        // Get LLM decision
        this.updateState({ currentAction: this.useVisionMode ? 'Analyzing with vision...' : 'Thinking...' });
        const action = await this.getNextAction(task, pageState, screenshot);

        if (action) {
          this.updateState({ currentAction: `Executing: ${action.name}` });
          const result = await this.executeAction(action.name, action.args);

          // Check if action succeeded
          if (result.includes('Error')) {
            this.consecutiveFailures++;
            if (this.consecutiveFailures >= 3 && !this.useVisionMode) {
              console.log('[AGENT] 3 consecutive failures, switching to vision mode');
              this.useVisionMode = true;
            }
          } else {
            this.consecutiveFailures = 0;
            if (this.useVisionMode && this.consecutiveFailures === 0) {
              // Vision mode succeeded, can try DOM mode again next time
              this.useVisionMode = false;
            }
          }

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

        if (consecutiveErrors >= 10) {
          console.log('[AGENT] Too many errors, moving to next URL');
          await this.navigateToNextUrl();
          consecutiveErrors = 0;
          this.useVisionMode = false;
        }

        await this.sleep(2000);
      }
    }

    console.log('[AGENT] Browsing loop ended');
  }

  private async navigateToNextUrl(): Promise<void> {
    let nextUrl = this.urlQueue.find(url => !this.visitedUrls.has(url));

    if (!nextUrl) {
      this.visitedUrls.clear();
      await this.discoverUrls();
      nextUrl = this.urlQueue[0] || 'https://www.bing.com';
    }

    this.visitedUrls.add(nextUrl);
    this.updateState({ currentUrl: nextUrl, currentAction: `Navigating to ${nextUrl}` });

    try {
      if (this.tabId) {
        await chrome.tabs.update(this.tabId, { url: nextUrl });
        await this.focusTab();
        await this.sleep(2000);
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
- If you see cookie consent popup, ALWAYS click Accept/Allow/OK to accept cookies
- If you see a Google/Apple/Facebook login popup/overlay, use press_escape to close it, then find email/password login
- If you see a paywall blocking content, use the 'done' tool to move on
- NEVER use "Sign in with Google/Apple/Facebook" - always use email/password
- Search using Bing only (not Google)
- Use press_escape to close unwanted popups or overlays
- Use the 'done' tool when you want to move to a different site

What single action should you take next?`;

    return task;
  }

  private generateVisionTask(pageState: { url: string; title: string; elements: string }, credential: Credential | null, screenshot: string | null): string {
    let task = `VISION MODE: DOM navigation has failed multiple times. Analyze the screenshot to understand what's on the page.\n\n`;

    task += `Current page: ${pageState.url}\nTitle: ${pageState.title}\n\n`;

    if (credential) {
      task += `You have an account on this site:\n- Email: ${credential.email}\n- Password: ${credential.password}\n\n`;
    }

    task += `The screenshot shows the current page state. Based on what you see:\n`;
    task += `- If there's a cookie popup, describe where the Accept button is and use click_coordinates\n`;
    task += `- If there's a Google/Apple login overlay blocking the page, use press_escape or click X button\n`;
    task += `- If there's a paywall with no way to close it, use 'done' to move on\n`;
    task += `- If you see a login form, use click_coordinates to click the email field, then type\n\n`;

    task += `DOM elements (may not reflect what's visible due to overlays):\n${pageState.elements.slice(0, 4000)}\n\n`;

    task += `Use click_coordinates with x,y values if element indexes don't work. What action should you take?`;

    return task;
  }

  private async getNextAction(task: string, pageState: { url: string }, screenshot: string | null): Promise<{ name: string; args: any } | null> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an autonomous web browser. You browse naturally like a human.
- ALWAYS accept cookies when you see a consent popup
- NEVER use Google/Apple/Facebook login - use email/password instead
- If you see a social login overlay, press Escape or find the X to close it
- If the page seems stuck or has a paywall, use 'done' to move on
- Use click_coordinates when element indexes fail (after seeing screenshot)
Reply with a single tool call for your next action.`
      }
    ];

    // Add recent conversation context
    const recentHistory = this.conversationHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push(msg);
    }

    // Add current task (with screenshot if in vision mode)
    const userMessage: LLMMessage = { role: 'user', content: task };
    messages.push(userMessage);

    // If we have a screenshot, we need to include it in vision-capable models
    // Note: OpenRouter handles this with image URLs in content array format
    // For simplicity, we'll describe that we have a screenshot in the prompt

    try {
      const response = await this.llm.chat(messages, this.model, TOOLS, 0.7);

      await this.addToHistory(userMessage);
      if (response.content) {
        await this.addToHistory({ role: 'assistant', content: response.content });
      }

      if (response.toolCalls && response.toolCalls.length > 0) {
        const tc = response.toolCalls[0];
        const args = JSON.parse(tc.function.arguments);

        await this.addToHistory({
          role: 'assistant',
          content: `Action: ${tc.function.name}(${JSON.stringify(args)})`
        });

        return { name: tc.function.name, args };
      }

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

      case 'click_coordinates':
        return await this.sendToContent('CLICK_COORDINATES', { x: args.x, y: args.y });

      case 'type':
        return await this.sendToContent('TYPE', { text: args.text, pressEnter: args.pressEnter });

      case 'scroll':
        return await this.sendToContent('SCROLL', { direction: args.direction, amount: args.amount || 500 });

      case 'press_escape':
        return await this.sendToContent('PRESS_KEY', { key: 'Escape' });

      case 'navigate':
        const url = args.url.startsWith('http') ? args.url : `https://${args.url}`;
        await chrome.tabs.update(this.tabId, { url });
        this.updateState({ currentUrl: url });
        await this.focusTab();
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
        await this.focusTab();
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
      case 'click': case 'click_coordinates': return 'click';
      case 'type': return 'type';
      case 'scroll': return 'scroll';
      case 'search_bing': return 'search';
      default: return 'click';
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  private estimateConversationTokens(): number {
    let total = 0;
    for (const msg of this.conversationHistory) {
      total += this.estimateTokens(msg.content);
    }
    return total;
  }

  private needsCompaction(): boolean {
    return this.estimateConversationTokens() >= this.TOKEN_LIMIT;
  }

  private async compactContext(): Promise<void> {
    console.log('[AGENT] Context compaction triggered');

    const summaryMessages: LLMMessage[] = [
      {
        role: 'system',
        content: 'Summarize the browsing session concisely: sites visited, actions taken, logins performed, errors encountered. Keep under 500 words.'
      },
      {
        role: 'user',
        content: `Summarize this session:\n\nPrevious: ${this.sessionSummary || 'None'}\n\nRecent:\n${this.conversationHistory.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}`
      }
    ];

    try {
      const response = await this.llm.chat(summaryMessages, this.model, undefined, 0.3);
      this.sessionSummary = response.content || this.sessionSummary;
    } catch (e) {
      this.sessionSummary = `Recent: ${this.conversationHistory.slice(-3).map(m => m.content.slice(0, 100)).join(' | ')}`;
    }

    this.conversationHistory = [];
    this.totalTokensEstimate = this.estimateTokens(this.sessionSummary);
    console.log('[AGENT] Context compacted');
  }

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
