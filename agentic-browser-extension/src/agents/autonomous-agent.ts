// ============================================
// Unified Autonomous Agent
// Combines browsing, social, email, and research
// with Perplexity-powered URL discovery
// ============================================

import { BaseAgent, createBrowserTools, ToolExecutor, AgentContext } from './base-agent';
import { OpenRouterService } from '../services/openrouter';
import { PersonaEngine } from '../services/persona-engine';
import { PersonaProfile, Tool, Activity } from '../shared/types';

// Perplexity model for discovering URLs based on persona
const PERPLEXITY_MODEL = 'perplexity/sonar-pro';

// Email verification detection patterns
const EMAIL_VERIFICATION_PATTERNS = [
  /check your email/i,
  /verify your email/i,
  /confirmation email/i,
  /sent.*email.*verify/i,
  /email.*verification/i,
  /check your inbox/i,
  /verify.*inbox/i,
  /confirmation.*sent/i,
  /verify.*account/i,
  /activation.*email/i,
  /click.*link.*email/i,
  /enter.*code.*sent/i,
  /verification code/i,
  /confirm.*email/i
];

// Patterns to extract verification codes from emails
const VERIFICATION_CODE_PATTERNS = [
  /\b(\d{4,8})\b/,  // 4-8 digit codes
  /code[:\s]+(\w{4,8})/i,
  /verification[:\s]+(\w{4,8})/i,
  /enter[:\s]+(\w{4,8})/i
];

interface EmailVerificationContext {
  signupTabId: number;
  signupUrl: string;
  serviceName: string;
  detectedAt: number;
  emailTabId?: number;
}

interface AutonomousState {
  status: 'idle' | 'running' | 'paused';
  currentPhase: 'discovering' | 'browsing' | 'social' | 'email' | 'reading' | 'waiting' | 'verifying';
  discoveredUrls: string[];
  visitedUrls: Set<string>;
  emailVerificationPending: boolean;
  emailCheckScheduledAt: number | null;
  emailVerificationContext: EmailVerificationContext | null;
  sessionStartTime: number;
  actionsThisSession: number;
  openedTabIds: number[];
  lastTabCleanup: number;
  mainTabId: number | null;
}

export class AutonomousAgent extends BaseAgent {
  private personaEngine: PersonaEngine | null;
  private autonomousState: AutonomousState;
  private perplexityModel: string;
  private mainLoopInterval: ReturnType<typeof setInterval> | null = null;
  private tabCleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    llm: OpenRouterService,
    model: string,
    personaEngine?: PersonaEngine
  ) {
    super('autonomous', llm, {
      model,
      maxIterations: 20, // More iterations for deeper interaction
      temperature: 0.8
    });

    this.personaEngine = personaEngine || null;
    this.perplexityModel = PERPLEXITY_MODEL;
    this.autonomousState = this.createInitialState();
  }

  private createInitialState(): AutonomousState {
    return {
      status: 'idle',
      currentPhase: 'discovering',
      discoveredUrls: [],
      visitedUrls: new Set(),
      emailVerificationPending: false,
      emailCheckScheduledAt: null,
      emailVerificationContext: null,
      sessionStartTime: Date.now(),
      actionsThisSession: 0,
      openedTabIds: [],
      lastTabCleanup: Date.now(),
      mainTabId: null
    };
  }

  protected getDefaultSystemPrompt(): string {
    const persona = this.personaEngine?.getPersona();
    const personaInfo = persona ? this.buildPersonaContext(persona) : '';

    return `You are an autonomous web browsing agent simulating authentic human behavior.

${personaInfo}

Your goal is to browse the web naturally, as if you were this person going about their daily online activities. This includes:
- Clicking on interesting links, articles, and content ON THE CURRENT PAGE
- Reading and scrolling through content before moving on
- Interacting with elements like buttons, links, and forms
- Sometimes liking, upvoting, or engaging with content
- Taking natural pauses to "read" content

CRITICAL BEHAVIORS:
1. STAY ON THE PAGE - Don't immediately navigate to a new site. Explore the current page first!
2. CLICK THINGS - Click on articles, posts, links, buttons that interest the persona
3. SCROLL AND READ - Spend time scrolling through content, not just jumping around
4. BE CURIOUS - Follow interesting links within the same site before leaving
5. INTERACT - Like posts, expand comments, hover over things, click tabs

Do NOT just navigate to new URLs constantly. A real person would:
- Click on a Reddit post and read comments before moving on
- Watch part of a YouTube video, not just load the homepage
- Click through product pages on Amazon, read reviews
- Scroll through social feeds and engage with posts

When you see "check your email" or "verification code" messages, acknowledge it and continue browsing - the email check is handled separately.

Use these tools naturally:
- click_element: Click on interesting content (USE THIS A LOT)
- scroll_page: Scroll to see more content
- type_text: Fill in forms or search boxes
- wait: Pause to "read" content (5-15 seconds)
- navigate_to: Only when you want to visit a completely different site

After 5-10 meaningful interactions on a page, use the complete tool.`;
  }

  private buildPersonaContext(persona: PersonaProfile): string {
    return `PERSONA PROFILE:
Name: ${persona.name}
Age: ${persona.age}
Location: ${persona.location.city}, ${persona.location.state}
Occupation: ${persona.occupation}
Education: ${persona.education}

INTERESTS: ${persona.interests.join(', ')}

PERSONALITY:
- Tech Savviness: ${Math.round(persona.personality.techSavviness * 100)}%
- Attention Span: ${Math.round(persona.personality.attentionSpan * 100)}%
- Openness: ${Math.round(persona.personality.openness * 100)}%

BROWSING HABITS:
- Favorite Sites: ${persona.browsingHabits.favoriteSites.join(', ')}
- Favorite Categories: ${persona.browsingHabits.favoriteCategories.join(', ')}
- Reading Depth: ${persona.browsingHabits.readingDepth}
- Session Length: ~${persona.browsingHabits.avgSessionLength} minutes

SOCIAL MEDIA:
${persona.socialMedia.platforms.map(p => `- ${p.name} (${p.usage})`).join('\n')}
Engagement Style: ${persona.socialMedia.engagementStyle}`;
  }

  protected getDefaultTools(): Tool[] {
    return [
      ...createBrowserTools(),
      {
        type: 'function',
        function: {
          name: 'search_on_page',
          description: 'Search for something using the search box on the current page',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'What to search for' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_content',
          description: 'Spend time reading the current content with natural scrolling',
          parameters: {
            type: 'object',
            properties: {
              duration_seconds: {
                type: 'number',
                description: 'How long to spend reading (10-60 seconds)'
              }
            },
            required: ['duration_seconds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'engage_with_content',
          description: 'Like, upvote, or react to content on social media',
          parameters: {
            type: 'object',
            properties: {
              action: {
                type: 'string',
                enum: ['like', 'upvote', 'heart', 'react'],
                description: 'Type of engagement'
              },
              element_index: {
                type: 'number',
                description: 'Index of the element to engage with'
              }
            },
            required: ['action', 'element_index']
          }
        }
      }
    ];
  }

  protected async executeToolCall(name: string, args: Record<string, any>): Promise<string> {
    this.autonomousState.actionsThisSession++;

    switch (name) {
      case 'read_content': {
        const duration = Math.min(60, Math.max(10, args.duration_seconds || 20));
        // Simulate reading with gradual scrolling
        const scrollSteps = Math.floor(duration / 5);
        for (let i = 0; i < scrollSteps; i++) {
          await this.executeTool('scroll_page', { direction: 'down', amount: 200 + Math.random() * 200 });
          await this.sleep(4000 + Math.random() * 2000);
        }
        this.logActivity({ type: 'article_read', details: { duration } });
        return `Read content for ${duration} seconds with natural scrolling`;
      }

      case 'engage_with_content': {
        await this.executeTool('click_element', { index: args.element_index });
        this.logActivity({ type: 'social_react', details: { action: args.action } });
        return `Engaged with content: ${args.action}`;
      }

      case 'search_on_page': {
        // Find search input, click it, type query
        const searchResult = await this.executeTool('extract_content', {});
        this.logActivity({ type: 'search', details: { query: args.query } });
        // Type in focused search and press enter
        await this.executeTool('type_text', { text: args.query, press_enter: true });
        return `Searched for: ${args.query}`;
      }

      case 'check_email':
        return this.handleCheckEmail();

      default:
        const response = await this.executeTool(name, args);
        return response?.result || JSON.stringify(response);
    }
  }

  private async handleCheckEmail(): Promise<string> {
    const persona = this.personaEngine?.getPersona();
    if (!persona?.email) {
      return 'No email configured for persona';
    }

    const emailUrls: Record<string, string> = {
      gmail: 'https://mail.google.com',
      outlook: 'https://outlook.live.com/mail',
      yahoo: 'https://mail.yahoo.com',
      protonmail: 'https://mail.proton.me'
    };

    const url = emailUrls[persona.email.provider] || persona.email.loginUrl;
    if (url) {
      await this.executeTool('navigate_to', { url });
      this.logActivity({ type: 'email_check', url, details: { provider: persona.email.provider } });
      return `Navigated to ${persona.email.provider} email`;
    }
    return 'Could not determine email URL';
  }

  // Smart email verification: opens email in new tab, finds code, returns to signup
  private async handleEmailVerification(
    onUpdate?: (update: { type: string; data: any }) => void
  ): Promise<boolean> {
    const context = this.autonomousState.emailVerificationContext;
    if (!context) return false;

    const persona = this.personaEngine?.getPersona();
    if (!persona?.email) return false;

    onUpdate?.({ type: 'phase', data: { phase: 'verifying', step: 'opening_email' } });

    try {
      // Open email in a new tab
      const emailUrls: Record<string, string> = {
        gmail: 'https://mail.google.com',
        outlook: 'https://outlook.live.com/mail',
        yahoo: 'https://mail.yahoo.com',
        protonmail: 'https://mail.proton.me'
      };
      const emailUrl = emailUrls[persona.email.provider] || persona.email.loginUrl;

      if (!emailUrl) return false;

      // Create new tab for email
      const newTabResult = await this.executeTool('navigate_to', { url: emailUrl });

      // Wait for email page to load
      await this.sleep(5000);

      onUpdate?.({ type: 'phase', data: { phase: 'verifying', step: 'searching_email' } });

      // Look for verification email - search by service name or "verification"
      const searchTerms = [context.serviceName, 'verification', 'verify', 'confirm', 'code'];

      // Get page content to analyze emails
      const pageContent = await this.executeTool('extract_content', {});
      const content = pageContent?.result || pageContent || '';

      // Try to find and click on a recent verification email
      // Look for emails with verification-related subjects
      let found = false;
      const emailKeywords = ['verify', 'verification', 'confirm', 'code', context.serviceName.toLowerCase()];

      // Run the LLM to find and extract the verification code
      const extractTask = `You are looking at an email inbox. Find the most recent verification/confirmation email from ${context.serviceName} (or any service) sent in the last 5 minutes.

Steps:
1. Click on the verification email to open it
2. Look for a verification code (usually 4-8 digits or characters)
3. Once you find the code, use the complete tool with the code as the summary

If you can't find a verification email, use complete with "NO_CODE_FOUND".`;

      const extractResult = await this.run(extractTask, onUpdate);

      // Check if we got a code
      let verificationCode: string | null = null;
      for (const pattern of VERIFICATION_CODE_PATTERNS) {
        const match = extractResult.match(pattern);
        if (match && match[1]) {
          verificationCode = match[1];
          break;
        }
      }

      if (!verificationCode || verificationCode === 'NO_CODE_FOUND') {
        onUpdate?.({ type: 'phase', data: { phase: 'verifying', step: 'code_not_found' } });
        return false;
      }

      onUpdate?.({ type: 'phase', data: { phase: 'verifying', step: 'entering_code', code: verificationCode } });

      // Navigate back to the signup tab
      await this.executeTool('navigate_to', { url: context.signupUrl });
      await this.sleep(3000);

      // Enter the verification code
      const enterCodeTask = `You need to enter the verification code "${verificationCode}" on this page.

Look for an input field for the verification code and:
1. Click on the input field
2. Type the code: ${verificationCode}
3. Click any submit/verify button if present
4. Use complete when done`;

      await this.run(enterCodeTask, onUpdate);

      this.logActivity({
        type: 'email_verify',
        details: { service: context.serviceName, success: true }
      });

      // Clear the verification context
      this.autonomousState.emailVerificationContext = null;
      this.autonomousState.emailVerificationPending = false;

      return true;
    } catch (error) {
      console.error('Email verification failed:', error);
      onUpdate?.({ type: 'error', data: { error: 'Email verification failed' } });
      return false;
    }
  }

  // Tab cleanup - close old tabs periodically
  private async cleanupTabs(): Promise<void> {
    const now = Date.now();
    const minInterval = 60 * 1000; // At least 1 minute between cleanups

    if (now - this.autonomousState.lastTabCleanup < minInterval) {
      return;
    }

    try {
      // Get all tabs
      const tabs = await chrome.tabs.query({});

      // Keep track of tabs we should NOT close
      const protectedTabIds = new Set<number>();

      // Protect main tab
      if (this.autonomousState.mainTabId) {
        protectedTabIds.add(this.autonomousState.mainTabId);
      }

      // Protect tab with pending verification
      if (this.autonomousState.emailVerificationContext?.signupTabId) {
        protectedTabIds.add(this.autonomousState.emailVerificationContext.signupTabId);
      }
      if (this.autonomousState.emailVerificationContext?.emailTabId) {
        protectedTabIds.add(this.autonomousState.emailVerificationContext.emailTabId);
      }

      // Protect current active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        protectedTabIds.add(activeTab.id);
      }

      // Close tabs that we opened and are not protected
      // Keep only the most recent 3-5 tabs
      const maxTabs = 3 + Math.floor(Math.random() * 3); // 3-5 tabs
      const tabsToConsider = this.autonomousState.openedTabIds
        .filter(id => !protectedTabIds.has(id));

      if (tabsToConsider.length > maxTabs) {
        const tabsToClose = tabsToConsider.slice(0, tabsToConsider.length - maxTabs);

        for (const tabId of tabsToClose) {
          try {
            await chrome.tabs.remove(tabId);
            this.autonomousState.openedTabIds = this.autonomousState.openedTabIds.filter(id => id !== tabId);
          } catch (e) {
            // Tab might already be closed
          }
        }
      }

      this.autonomousState.lastTabCleanup = now;
    } catch (error) {
      console.error('Tab cleanup failed:', error);
    }
  }

  // Schedule next tab cleanup with random interval (1-5 minutes)
  private scheduleTabCleanup(): void {
    if (this.tabCleanupInterval) {
      clearInterval(this.tabCleanupInterval);
    }

    const interval = (60 + Math.random() * 240) * 1000; // 1-5 minutes
    this.tabCleanupInterval = setInterval(() => {
      this.cleanupTabs();
    }, interval);
  }

  // Discover starting URLs based on persona using Perplexity
  async discoverStartingUrls(): Promise<string[]> {
    const persona = this.personaEngine?.getPersona();
    if (!persona) {
      return [
        'https://www.google.com',
        'https://www.reddit.com',
        'https://www.youtube.com'
      ];
    }

    const query = this.buildDiscoveryQuery(persona);

    try {
      this.logActivity({
        type: 'page_visit',
        details: { phase: 'discovering', query }
      });

      const searchResult = await this.llm.searchWithPerplexity(query, this.perplexityModel);
      const urls = this.extractUrlsFromText(searchResult);

      const favoriteSites = persona.browsingHabits.favoriteSites
        .map(site => this.normalizeUrl(site))
        .filter(url => url !== null) as string[];

      const socialUrls = persona.socialMedia.platforms
        .filter(p => p.usage !== 'occasional')
        .map(p => this.getSocialMediaUrl(p.name));

      const allUrls = [...new Set([...urls, ...favoriteSites, ...socialUrls])];
      this.autonomousState.discoveredUrls = allUrls;

      return allUrls.slice(0, 10);
    } catch (error) {
      console.error('Error discovering URLs:', error);
      return persona.browsingHabits.favoriteSites.slice(0, 5)
        .map(site => this.normalizeUrl(site))
        .filter(url => url !== null) as string[];
    }
  }

  private normalizeUrl(site: string): string | null {
    if (!site) return null;

    let url = site.trim();

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    url = url.replace(/^www\./i, '');
    const hasTld = /\.[a-z]{2,}$/i.test(url);

    if (hasTld) {
      return `https://${url}`;
    } else {
      const cleanSite = url.toLowerCase().replace(/\s+/g, '');
      return `https://www.${cleanSite}.com`;
    }
  }

  private buildDiscoveryQuery(persona: PersonaProfile): string {
    const interests = persona.interests.slice(0, 3).join(', ');
    const location = `${persona.location.city}, ${persona.location.state}`;

    return `Find popular websites and content for a ${persona.age} year old ${persona.occupation} in ${location} who is interested in ${interests}. Include relevant news, entertainment, shopping, and social sites. Return specific URLs that would be interesting to visit.`;
  }

  private extractUrlsFromText(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const matches = text.match(urlRegex) || [];
    return matches.map(url => url.replace(/[.,;:!?)]+$/, ''));
  }

  private getSocialMediaUrl(platform: string): string {
    const urls: Record<string, string> = {
      'twitter/x': 'https://twitter.com',
      'x': 'https://twitter.com',
      'bereal': 'https://bfrnd.com',
      'whatsapp': 'https://web.whatsapp.com',
      'telegram': 'https://web.telegram.org',
    };

    const platformLower = platform.toLowerCase();
    if (urls[platformLower]) {
      return urls[platformLower];
    }

    return this.normalizeUrl(platform) || `https://www.${platformLower.replace(/\s+/g, '')}.com`;
  }

  checkForEmailVerification(pageContent: string): boolean {
    for (const pattern of EMAIL_VERIFICATION_PATTERNS) {
      if (pattern.test(pageContent)) {
        return true;
      }
    }
    return false;
  }

  // Extract service name from URL for email matching
  private extractServiceName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      // Remove common prefixes and TLD
      return hostname
        .replace(/^www\./, '')
        .replace(/\.(com|org|net|io|co)$/, '')
        .split('.')[0];
    } catch {
      return 'unknown';
    }
  }

  scheduleEmailVerification(signupTabId: number, signupUrl: string): void {
    if (this.autonomousState.emailVerificationPending) return;

    const delayMs = (60 + Math.random() * 120) * 1000; // 1-3 minutes
    this.autonomousState.emailVerificationPending = true;
    this.autonomousState.emailCheckScheduledAt = Date.now() + delayMs;
    this.autonomousState.emailVerificationContext = {
      signupTabId,
      signupUrl,
      serviceName: this.extractServiceName(signupUrl),
      detectedAt: Date.now()
    };

    this.logActivity({
      type: 'email_check',
      details: {
        scheduled: true,
        delaySeconds: Math.round(delayMs / 1000),
        service: this.autonomousState.emailVerificationContext.serviceName
      }
    });
  }

  // Main autonomous loop
  async startAutonomous(
    onUpdate?: (update: { type: string; data: any }) => void
  ): Promise<void> {
    if (this.autonomousState.status === 'running') return;

    this.autonomousState = this.createInitialState();
    this.autonomousState.status = 'running';
    this.state.status = 'running';

    // Start tab cleanup schedule
    this.scheduleTabCleanup();

    // Remember main tab
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        this.autonomousState.mainTabId = activeTab.id;
      }
    } catch (e) {}

    onUpdate?.({
      type: 'status',
      data: { status: 'running', phase: 'discovering' }
    });

    try {
      // Phase 1: Discover starting URLs
      this.autonomousState.currentPhase = 'discovering';
      onUpdate?.({ type: 'phase', data: { phase: 'discovering' } });

      const urls = await this.discoverStartingUrls();
      if (urls.length === 0) {
        throw new Error('No URLs discovered for browsing');
      }

      // Phase 2: Start browsing loop
      this.autonomousState.currentPhase = 'browsing';
      onUpdate?.({ type: 'phase', data: { phase: 'browsing', urls } });

      await this.browsingLoop(urls, onUpdate);
    } catch (error) {
      this.autonomousState.status = 'idle';
      this.state.status = 'error';
      onUpdate?.({
        type: 'error',
        data: { error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  private async browsingLoop(
    urls: string[],
    onUpdate?: (update: { type: string; data: any }) => void
  ): Promise<void> {
    let urlIndex = 0;
    let interactionsOnCurrentPage = 0;
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;
    const minInteractionsPerPage = 5;
    const maxInteractionsPerPage = 12;
    let targetInteractions = minInteractionsPerPage + Math.floor(Math.random() * (maxInteractionsPerPage - minInteractionsPerPage));
    let currentPageUrl = '';

    while (this.autonomousState.status === 'running') {
      if (this.state.status === 'paused') {
        await this.sleep(1000);
        continue;
      }

      // Check for scheduled email verification
      if (
        this.autonomousState.emailVerificationPending &&
        this.autonomousState.emailCheckScheduledAt &&
        Date.now() >= this.autonomousState.emailCheckScheduledAt
      ) {
        this.autonomousState.currentPhase = 'verifying';
        onUpdate?.({ type: 'phase', data: { phase: 'verifying' } });

        await this.handleEmailVerification(onUpdate);
        this.autonomousState.currentPhase = 'browsing';
      }

      // Periodic tab cleanup
      await this.cleanupTabs();

      // Navigate to a new URL if needed:
      // - First time (no current page)
      // - Done enough interactions on current page
      // - Too many consecutive errors on current page
      const shouldNavigate =
        !currentPageUrl ||
        interactionsOnCurrentPage >= targetInteractions ||
        consecutiveErrors >= maxConsecutiveErrors;

      if (shouldNavigate) {
        const url = urls[urlIndex % urls.length];
        urlIndex++;

        // Skip recently visited (but not if we have errors)
        if (this.autonomousState.visitedUrls.has(url) && urlIndex < urls.length * 2 && consecutiveErrors === 0) {
          continue;
        }

        try {
          // Navigate to new URL
          await this.executeTool('navigate_to', { url });
          this.autonomousState.visitedUrls.add(url);
          currentPageUrl = url;

          // Track this tab
          try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id && !this.autonomousState.openedTabIds.includes(activeTab.id)) {
              this.autonomousState.openedTabIds.push(activeTab.id);
            }
          } catch (e) {}

          // Wait longer for page load
          await this.sleep(4000);

          onUpdate?.({
            type: 'navigation',
            data: { url }
          });

          // Reset counters for new page
          interactionsOnCurrentPage = 0;
          consecutiveErrors = 0;
          targetInteractions = minInteractionsPerPage + Math.floor(Math.random() * (maxInteractionsPerPage - minInteractionsPerPage));

        } catch (error) {
          console.error(`Error navigating to ${url}:`, error);
          onUpdate?.({
            type: 'error',
            data: { error: `Navigation failed: ${error instanceof Error ? error.message : String(error)}` }
          });
          await this.sleep(2000);
          // Try next URL
          continue;
        }
      }

      try {
        // Get current page state with error handling
        let pageInfo: any = {};
        let contentStr = '';

        try {
          pageInfo = await this.executeTool('get_page_info', {}) || {};
        } catch (e) {
          console.warn('Failed to get page info:', e);
        }

        try {
          const content = await this.executeTool('extract_content', {});
          contentStr = content?.result || content || '';
        } catch (e) {
          console.warn('Failed to extract content:', e);
        }

        // Use whatever URL we have
        const currentUrl = pageInfo?.url || currentPageUrl || '';

        // Check for email verification prompts
        if (contentStr && this.checkForEmailVerification(contentStr)) {
          try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (activeTab?.id && !this.autonomousState.emailVerificationPending) {
              this.scheduleEmailVerification(activeTab.id, currentUrl);
              onUpdate?.({
                type: 'email_verification_detected',
                data: { scheduledIn: '1-3 minutes', service: this.extractServiceName(currentUrl) }
              });
            }
          } catch (e) {}
        }

        // Update context
        this.setContext({
          url: currentUrl,
          pageContent: contentStr,
        });

        // Generate task that emphasizes interaction over navigation
        const task = this.generateInteractionTask(currentUrl, interactionsOnCurrentPage, targetInteractions);

        await this.run(task, (update) => {
          onUpdate?.({
            type: update.type,
            data: { ...update.data, url: currentUrl }
          });
        });

        // Success! Reset error counter and increment interactions
        consecutiveErrors = 0;
        interactionsOnCurrentPage++;

        // Natural pause between interactions
        const pauseDuration = 1000 + Math.random() * 3000;
        await this.sleep(pauseDuration);

        // Occasionally take a longer break
        if (Math.random() < 0.05) {
          const breakDuration = 5 + Math.random() * 15;
          onUpdate?.({ type: 'break', data: { duration: breakDuration } });
          await this.sleep(breakDuration * 1000);
        }

      } catch (error) {
        consecutiveErrors++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error during interaction (${consecutiveErrors}/${maxConsecutiveErrors}):`, errorMsg);

        onUpdate?.({
          type: 'error',
          data: { error: errorMsg, consecutiveErrors, willRetry: consecutiveErrors < maxConsecutiveErrors }
        });

        // Wait before retry, longer wait for more errors
        await this.sleep(2000 * consecutiveErrors);

        // Don't count as interaction - we'll retry or move to next page
      }
    }
  }

  private generateInteractionTask(url: string, currentInteractions: number, targetInteractions: number): string {
    const persona = this.personaEngine?.getPersona();
    let domain = 'this website';
    try {
      if (url && url.startsWith('http')) {
        domain = new URL(url).hostname;
      }
    } catch {
      // Invalid URL, use fallback
    }
    const remaining = targetInteractions - currentInteractions;

    let task = `You are browsing ${domain}. `;

    // ALWAYS check for popups first
    task += `

FIRST: Check if there are any popups, modals, cookie banners, or overlay dialogs blocking the page. Common ones include:
- Cookie consent ("Accept cookies", "I agree", "Accept all")
- Newsletter signup popups ("No thanks", "X" close button, "Maybe later")
- Login prompts ("Continue as guest", "X" close button)
- Age verification ("I am over 18", "Enter")
- Notification permission requests (click "Block" or "X")
- Any modal with "Close", "X", "Dismiss", "Skip", or "No thanks"

If you see ANY popup or overlay, CLICK TO DISMISS IT FIRST before doing anything else.

`;

    if (currentInteractions === 0) {
      task += `This is a fresh page. Dismiss any popups, then take a moment to look around. `;
    } else {
      task += `You've done ${currentInteractions} things on this page. Do ${remaining} more before moving on. `;
    }

    if (persona) {
      const interests = persona.interests.slice(0, 2).join(' and ');

      if (domain.includes('reddit')) {
        task += `As someone into ${interests}, find an interesting post to click on and read. Maybe check the comments or upvote something good.`;
      } else if (domain.includes('youtube')) {
        task += `Look for a video about ${interests} to click on. Or scroll through recommendations and click something interesting.`;
      } else if (domain.includes('instagram') || domain.includes('twitter') || domain.includes('facebook')) {
        task += `Scroll through the feed. Like a post or two. Click on an interesting profile or story.`;
      } else if (domain.includes('amazon') || domain.includes('shop')) {
        task += `Click on a product that looks interesting. Check the reviews. Add something to cart for fun.`;
      } else if (domain.includes('news') || domain.includes('cnn') || domain.includes('bbc')) {
        task += `Click on a headline that catches your eye. Read the article a bit before moving on.`;
      } else if (domain.includes('tripadvisor') || domain.includes('yelp')) {
        task += `Browse restaurants or attractions. Click on one with good reviews. Read some reviews.`;
      } else {
        task += `Explore naturally based on your interests (${interests}). Click on something interesting, scroll around, interact with the page.`;
      }
    } else {
      task += `Click on something interesting, scroll around, explore the page naturally.`;
    }

    task += `

IMPORTANT RULES:
- DO NOT use navigate_to - stay on this page
- Use click_element to interact with links and buttons
- Use scroll_page to see more content
- Use wait to spend time "reading" (5-15 seconds)
- If a click doesn't work, try scrolling or clicking something else
- Don't give up easily - try multiple things

After your action, use complete to summarize what you did.`;

    return task;
  }

  pause(): void {
    this.state.status = 'paused';
    this.autonomousState.status = 'paused';
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
      this.autonomousState.status = 'running';
    }
  }

  stop(): void {
    super.stop();
    this.autonomousState.status = 'idle';
    if (this.mainLoopInterval) {
      clearInterval(this.mainLoopInterval);
      this.mainLoopInterval = null;
    }
    if (this.tabCleanupInterval) {
      clearInterval(this.tabCleanupInterval);
      this.tabCleanupInterval = null;
    }
  }

  reset(): void {
    this.stop();
    super.reset();
    this.autonomousState = this.createInitialState();
  }

  getAutonomousState(): AutonomousState {
    return { ...this.autonomousState };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
