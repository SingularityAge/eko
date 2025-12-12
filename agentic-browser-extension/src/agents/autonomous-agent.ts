// ============================================
// Unified Autonomous Agent
// Combines browsing, social, email, and research
// with Perplexity-powered URL discovery
// ============================================

import { BaseAgent, createBrowserTools, ToolExecutor, AgentContext } from './base-agent';
import { OpenRouterService } from '../services/openrouter';
import { PersonaEngine } from '../services/persona-engine';
import { getCredentialsStore, CredentialsStore } from '../services/credentials-store';
import { PersonaProfile, Tool, Activity, StoredCredential } from '../shared/types';

// Perplexity model for discovering URLs based on persona
// Using the correct OpenRouter model ID for Perplexity sonar-pro-search
const PERPLEXITY_MODEL = 'perplexity/sonar-pro-search';

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
  private credentialsStore: ReturnType<typeof getCredentialsStore>;

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
    this.credentialsStore = getCredentialsStore();

    // Initialize credentials store immediately (async, non-blocking)
    this.credentialsStore.initialize().catch(err => {
      console.warn('Failed to initialize credentials store:', err);
    });
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
    const personaEmail = persona?.email?.email || 'the configured email';

    // Get list of sites we have credentials for
    const knownSites = this.credentialsStore.getAllDomains();
    const knownSitesInfo = knownSites.length > 0
      ? `\n\nSITES WITH SAVED CREDENTIALS:\nYou have accounts on: ${knownSites.join(', ')}\nWhen visiting these sites, look for "Sign in" and use the stored credentials.`
      : '';

    return `You are an autonomous web browsing agent simulating authentic human behavior.

${personaInfo}${knownSitesInfo}

Your goal is to browse the web naturally like a real person. Explore pages, click on interesting content, scroll, read, and interact.

POPUP & MODAL HANDLING (ALWAYS DO THIS FIRST):
- ALWAYS accept cookies - click "Accept", "Accept all", "OK", "I agree", "Allow all"
- Close newsletter popups with "X", "No thanks", "Close"
- Dismiss app download prompts with "Continue in browser"
- For login popups: click "X" or "Continue as guest" to dismiss

CRITICAL - LOGIN RULES:
- NEVER use "Sign in with Google", "Continue with Google", "Sign in with Apple", or any social login
- If signing up for a service, ONLY use email signup with: ${personaEmail}
- Always prefer "Sign up with email" or "Create account" over social logins
- If forced to choose, look for "Other options", "Use email instead", or close the popup
- After successfully signing up for ANY service, ALWAYS use the save_credentials tool to store your login info

CREDENTIAL MANAGEMENT:
- When you sign up for a new site, use save_credentials to store the email and password
- When visiting a site you've signed up for before, look for "Sign in" and log in
- Use get_stored_credentials to retrieve your login info for a site

BROWSING BEHAVIOR:
- Stay on the current page and explore it thoroughly before moving on
- Click on interesting content: articles, posts, products, videos, links
- Scroll to see more content
- Spend time "reading" with natural pauses
- Interact: like posts, expand comments, check reviews
- Don't rush - a real person takes time to browse

When you see "check your email" or "verification code" messages after signup, just continue browsing - email verification is handled automatically.

TOOLS:
- click_element: Click on content (use this frequently)
- scroll_page: Scroll to see more
- type_text: Fill forms (use persona's email for signups)
- wait: Pause to read (5-15 seconds)
- navigate_to: Only for going to a completely different website
- save_credentials: Save login credentials after signing up for a site
- get_stored_credentials: Get stored credentials for a site you've signed up for

After several interactions on a page, use complete to summarize.`;
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
      },
      {
        type: 'function',
        function: {
          name: 'save_credentials',
          description: 'Save login credentials after signing up for a website. ALWAYS call this after successfully creating an account on any site.',
          parameters: {
            type: 'object',
            properties: {
              email: {
                type: 'string',
                description: 'Email address used for signup'
              },
              password: {
                type: 'string',
                description: 'Password used for signup'
              },
              username: {
                type: 'string',
                description: 'Username if different from email (optional)'
              }
            },
            required: ['email', 'password']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'get_stored_credentials',
          description: 'Get stored login credentials for a website you have previously signed up for',
          parameters: {
            type: 'object',
            properties: {
              domain: {
                type: 'string',
                description: 'Domain of the website (e.g., "reddit.com")'
              }
            },
            required: ['domain']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'take_screenshot',
          description: 'Take a screenshot of the current page for visual analysis. Use this when DOM-based interaction is failing to understand what you are looking at.',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'click_at_position',
          description: 'Click at specific x,y coordinates on the page. Use this as fallback when element indexes are not working.',
          parameters: {
            type: 'object',
            properties: {
              x: { type: 'number', description: 'X coordinate (pixels from left)' },
              y: { type: 'number', description: 'Y coordinate (pixels from top)' }
            },
            required: ['x', 'y']
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

      case 'save_credentials': {
        try {
          // Get current URL from context or page info
          let currentUrl = this.context?.url || '';
          if (!currentUrl) {
            try {
              const pageInfo = await this.executeTool('get_page_info', {});
              currentUrl = pageInfo?.url || '';
            } catch (e) {
              // Fallback
            }
          }

          if (!currentUrl) {
            return 'Could not determine current URL to save credentials';
          }

          await this.credentialsStore.initialize();
          const credential = await this.credentialsStore.store({
            url: currentUrl,
            email: args.email,
            password: args.password,
            username: args.username
          });

          this.logActivity({
            type: 'form_submit',
            details: {
              action: 'save_credentials',
              domain: credential.domain,
              email: args.email
            }
          });

          return `Credentials saved for ${credential.domain}. You can now log in to this site in future sessions.`;
        } catch (error) {
          console.error('Failed to save credentials:', error);
          return `Failed to save credentials: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      case 'get_stored_credentials': {
        try {
          await this.credentialsStore.initialize();
          const credential = this.credentialsStore.getByDomain(args.domain);

          if (credential) {
            // Update last login time
            await this.credentialsStore.updateLastLogin(args.domain);
            return `Found credentials for ${args.domain}:\nEmail: ${credential.email}\nPassword: ${credential.password}${credential.username ? `\nUsername: ${credential.username}` : ''}`;
          } else {
            return `No stored credentials found for ${args.domain}. You may need to sign up first.`;
          }
        } catch (error) {
          console.error('Failed to get credentials:', error);
          return `Failed to get credentials: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      case 'take_screenshot': {
        try {
          const screenshot = await this.executeTool('take_screenshot', {});
          // Store screenshot for potential vision analysis
          this.lastScreenshot = screenshot;
          return `Screenshot captured successfully. The image shows the current state of the page. Use this to identify elements visually if DOM interaction is failing.`;
        } catch (error) {
          console.error('Failed to take screenshot:', error);
          return `Failed to take screenshot: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      case 'click_at_position': {
        try {
          // Use content script to click at coordinates
          const result = await this.executeTool('click_at_position', { x: args.x, y: args.y });
          return result?.result || `Clicked at position (${args.x}, ${args.y})`;
        } catch (error) {
          console.error('Failed to click at position:', error);
          return `Failed to click at position: ${error instanceof Error ? error.message : String(error)}`;
        }
      }

      default:
        const response = await this.executeTool(name, args);
        return response?.result || JSON.stringify(response);
    }
  }

  // Store last screenshot for vision fallback
  private lastScreenshot: string | null = null;

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
    console.log('[DISCOVER] Starting URL discovery...');

    // Always initialize credentials store
    await this.credentialsStore.initialize();

    const persona = this.personaEngine?.getPersona();
    console.log('[DISCOVER] Persona loaded:', persona ? persona.name : 'none');

    // Get URLs from sites we have accounts on (prioritize these!)
    const credentialUrls = this.credentialsStore.getAllUrls();
    console.log('[DISCOVER] Credential URLs:', credentialUrls.length);

    if (!persona) {
      console.log('[DISCOVER] No persona, using default URLs');
      // Even without persona, include signed-up sites
      const defaultUrls = [
        'https://www.bing.com',
        'https://www.reddit.com',
        'https://www.youtube.com'
      ];
      // Put credential URLs first since user revisits signed-up sites more often
      return [...new Set([...credentialUrls, ...defaultUrls])];
    }

    const query = this.buildDiscoveryQuery(persona);
    console.log('[DISCOVER] Query:', query);

    try {
      this.logActivity({
        type: 'page_visit',
        details: { phase: 'discovering', query, signedUpSites: credentialUrls.length }
      });

      console.log('[DISCOVER] Calling Perplexity with model:', this.perplexityModel);
      const searchResult = await this.llm.searchWithPerplexity(query, this.perplexityModel);
      console.log('[DISCOVER] Perplexity response length:', searchResult?.length || 0);

      const urls = this.extractUrlsFromText(searchResult);
      console.log('[DISCOVER] Extracted URLs:', urls.length);

      const favoriteSites = persona.browsingHabits.favoriteSites
        .map(site => this.normalizeUrl(site))
        .filter(url => url !== null) as string[];

      const socialUrls = persona.socialMedia.platforms
        .filter(p => p.usage !== 'occasional')
        .map(p => this.getSocialMediaUrl(p.name));

      // Combine all URLs with credential URLs FIRST (since people revisit signed-up sites more often)
      // Then shuffle them a bit to make browsing feel natural
      const discoveredUrls = [...new Set([...urls, ...favoriteSites, ...socialUrls])];

      // Weight credential URLs higher by including them at the start
      const allUrls = [...new Set([...credentialUrls, ...discoveredUrls])];
      this.autonomousState.discoveredUrls = allUrls;

      // Log how many signed-up sites we're including
      console.log(`[DISCOVER] Total URLs: ${allUrls.length}, credential sites: ${credentialUrls.length}`);

      return allUrls.slice(0, 15); // Return more URLs now that we have credential sites
    } catch (error) {
      console.error('[DISCOVER] Error discovering URLs:', error);
      // Fallback: include credential URLs with favorite sites
      const fallbackUrls = persona.browsingHabits.favoriteSites.slice(0, 5)
        .map(site => this.normalizeUrl(site))
        .filter(url => url !== null) as string[];
      const result = [...new Set([...credentialUrls, ...fallbackUrls])];
      console.log('[DISCOVER] Using fallback URLs:', result.length);
      return result;
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
    console.log('[AUTONOMOUS] startAutonomous called, current status:', this.autonomousState.status);

    if (this.autonomousState.status === 'running') {
      console.log('[AUTONOMOUS] Already running, skipping');
      return;
    }

    this.autonomousState = this.createInitialState();
    this.autonomousState.status = 'running';
    this.state.status = 'running';

    console.log('[AUTONOMOUS] Status set to running');

    // Ensure credentials store is initialized
    try {
      await this.credentialsStore.initialize();
      console.log('[AUTONOMOUS] Credentials store initialized');
    } catch (e) {
      console.warn('[AUTONOMOUS] Failed to initialize credentials store:', e);
    }

    // Start tab cleanup schedule
    this.scheduleTabCleanup();

    // Remember main tab
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab?.id) {
        this.autonomousState.mainTabId = activeTab.id;
        console.log('[AUTONOMOUS] Main tab ID:', activeTab.id);
      }
    } catch (e) {
      console.warn('[AUTONOMOUS] Failed to get active tab:', e);
    }

    onUpdate?.({
      type: 'status',
      data: { status: 'running', phase: 'discovering' }
    });

    // MAIN LOOP - Keep running FOREVER until explicitly stopped
    // This is the outer infinite loop that should never exit on its own
    let loopIteration = 0;
    while (true) {
      // Check if we should stop
      if (this.autonomousState.status !== 'running') {
        console.log('[AUTONOMOUS] Status changed to:', this.autonomousState.status, '- exiting main loop');
        break;
      }

      loopIteration++;
      console.log(`[AUTONOMOUS] Main loop iteration ${loopIteration}`);

      try {
        // Phase 1: Discover starting URLs
        this.autonomousState.currentPhase = 'discovering';
        onUpdate?.({ type: 'phase', data: { phase: 'discovering' } });
        console.log('[AUTONOMOUS] Phase 1: Discovering URLs...');

        let urls: string[] = [];
        try {
          urls = await this.discoverStartingUrls();
          console.log(`[AUTONOMOUS] Discovered ${urls.length} URLs`);
        } catch (error) {
          console.error('[AUTONOMOUS] Error discovering URLs:', error);
          onUpdate?.({ type: 'warning', data: { message: 'URL discovery failed, using fallback URLs' } });
        }

        // Always have some URLs to browse - use fallbacks if discovery failed
        if (!urls || urls.length === 0) {
          urls = this.getFallbackUrls();
          console.log(`[AUTONOMOUS] Using ${urls.length} fallback URLs`);
          onUpdate?.({ type: 'info', data: { message: 'Using fallback URLs for browsing' } });
        }

        console.log('[AUTONOMOUS] Starting browsing with URLs:', urls.slice(0, 5));

        // Phase 2: Start browsing loop
        this.autonomousState.currentPhase = 'browsing';
        onUpdate?.({ type: 'phase', data: { phase: 'browsing', urls } });

        try {
          await this.browsingLoop(urls, onUpdate);
          console.log('[AUTONOMOUS] browsingLoop returned normally');
        } catch (browsingError) {
          console.error('[AUTONOMOUS] browsingLoop threw error:', browsingError);
          // Don't rethrow - continue to next iteration
        }

        // If still running, continue with new URLs after a delay
        if (this.autonomousState.status === 'running') {
          console.log('[AUTONOMOUS] Continuing to next iteration...');
          await this.sleep(3000);
        }

      } catch (error) {
        console.error('[AUTONOMOUS] Outer loop error (will retry):', error);
        onUpdate?.({
          type: 'error',
          data: { error: error instanceof Error ? error.message : String(error), recovering: true }
        });

        // Wait before retrying - but don't exit the loop!
        await this.sleep(5000);
      }
    }

    // Clean up when done
    console.log('[AUTONOMOUS] startAutonomous exiting, final status:', this.autonomousState.status);
    if (this.tabCleanupInterval) {
      clearInterval(this.tabCleanupInterval);
      this.tabCleanupInterval = null;
    }
  }

  // Fallback URLs when Perplexity discovery fails
  private getFallbackUrls(): string[] {
    const persona = this.personaEngine?.getPersona();
    const credentialUrls = this.credentialsStore.getAllUrls();

    const defaultUrls = [
      'https://www.bing.com',
      'https://www.reddit.com',
      'https://www.youtube.com',
      'https://news.ycombinator.com',
      'https://www.wikipedia.org',
      'https://www.amazon.com'
    ];

    // Add persona's favorite sites if available
    const personaUrls = persona?.browsingHabits?.favoriteSites
      ?.map(site => this.normalizeUrl(site))
      ?.filter((url): url is string => url !== null) || [];

    // Combine: credential URLs first, then persona favorites, then defaults
    return [...new Set([...credentialUrls, ...personaUrls, ...defaultUrls])];
  }

  private async browsingLoop(
    urls: string[],
    onUpdate?: (update: { type: string; data: any }) => void
  ): Promise<void> {
    let urlIndex = 0;
    let interactionsOnCurrentPage = 0;
    let consecutiveErrors = 0;
    let totalErrorsOnPage = 0;
    let recoveryStrategy: 'normal' | 'alternative' | 'radical' | 'moveOn' = 'normal';
    const minInteractionsPerPage = 5;
    const maxInteractionsPerPage = 12;
    let targetInteractions = minInteractionsPerPage + Math.floor(Math.random() * (maxInteractionsPerPage - minInteractionsPerPage));
    let currentPageUrl = '';
    let totalInteractions = 0;
    let lastSearchTime = 0;
    let lastEmailCheckTime = 0;
    let pageInsights: string[] = []; // Collect insights even from failed interactions
    const searchInterval = 10 * 60 * 1000; // Do a search every ~10 minutes
    const emailCheckInterval = 15 * 60 * 1000; // Check email every ~15 minutes
    let browsingIteration = 0;

    console.log('[BROWSING] Starting browsing loop with', urls.length, 'URLs');
    console.log('[BROWSING] Status:', this.autonomousState.status);

    // Inner browsing loop - keep going as long as we're running
    while (this.autonomousState.status === 'running') {
      browsingIteration++;
      console.log(`[BROWSING] Iteration ${browsingIteration}, page interactions: ${interactionsOnCurrentPage}/${targetInteractions}`);
      try {
        if (this.state.status === 'paused') {
          await this.sleep(1000);
          continue;
        }

        const now = Date.now();

        // Check for scheduled email verification
        if (
          this.autonomousState.emailVerificationPending &&
          this.autonomousState.emailCheckScheduledAt &&
          now >= this.autonomousState.emailCheckScheduledAt
        ) {
          this.autonomousState.currentPhase = 'verifying';
          onUpdate?.({ type: 'phase', data: { phase: 'verifying' } });

          try {
            await this.handleEmailVerification(onUpdate);
          } catch (e) {
            console.error('Email verification failed:', e);
          }
          this.autonomousState.currentPhase = 'browsing';
        }

        // Periodic email check (even without pending verification)
        if (now - lastEmailCheckTime > emailCheckInterval && this.personaEngine?.getPersona()?.email) {
          lastEmailCheckTime = now;
          if (Math.random() < 0.3) { // 30% chance to check email at interval
            onUpdate?.({ type: 'phase', data: { phase: 'email', action: 'checking_email' } });
            try {
              await this.doEmailCheck(onUpdate);
            } catch (e) {
              console.warn('Email check failed:', e);
            }
          }
        }

        // Periodic search (using Bing)
        if (now - lastSearchTime > searchInterval && Math.random() < 0.4) {
          lastSearchTime = now;
          onUpdate?.({ type: 'phase', data: { phase: 'searching', action: 'bing_search' } });
          try {
            await this.doBingSearch(onUpdate);
            currentPageUrl = 'https://www.bing.com';
            interactionsOnCurrentPage = 0;
            totalErrorsOnPage = 0;
            recoveryStrategy = 'normal';
            targetInteractions = 3 + Math.floor(Math.random() * 4);
            continue;
          } catch (e) {
            console.warn('Bing search failed:', e);
          }
        }

        // Periodic tab cleanup
        try {
          await this.cleanupTabs();
        } catch (e) {
          console.warn('Tab cleanup failed:', e);
        }

        // Determine recovery strategy based on error count
        if (totalErrorsOnPage >= 10) {
          recoveryStrategy = 'moveOn';
        } else if (totalErrorsOnPage >= 7) {
          recoveryStrategy = 'radical';
        } else if (totalErrorsOnPage >= 3) {
          recoveryStrategy = 'alternative';
        } else {
          recoveryStrategy = 'normal';
        }

        // Navigate to a new URL if needed OR if we're in moveOn strategy
        const shouldNavigate =
          !currentPageUrl ||
          interactionsOnCurrentPage >= targetInteractions ||
          recoveryStrategy === 'moveOn';

        if (shouldNavigate) {
          // Log insights from the page we're leaving (even if problematic)
          if (currentPageUrl && pageInsights.length > 0) {
            this.logActivity({
              type: 'page_visit',
              url: currentPageUrl,
              details: {
                interactions: interactionsOnCurrentPage,
                errors: totalErrorsOnPage,
                insights: pageInsights.slice(-5),
                strategy: recoveryStrategy
              }
            });
          }

          // Reset page-level counters
          pageInsights = [];
          totalErrorsOnPage = 0;
          recoveryStrategy = 'normal';

          // Pick URL - mix of sequential and random
          let url: string;
          if (Math.random() < 0.7) {
            url = urls[urlIndex % urls.length];
            urlIndex++;
          } else {
            url = urls[Math.floor(Math.random() * urls.length)];
          }

          // Skip recently visited only if we have plenty of URLs
          if (this.autonomousState.visitedUrls.has(url) && urls.length > 5) {
            urlIndex++;
            continue;
          }

          try {
            console.log(`Navigating to: ${url}`);
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

            // Wait for page load
            await this.sleep(3000 + Math.random() * 2000);

            onUpdate?.({
              type: 'navigation',
              data: { url, totalInteractions }
            });

            // Reset counters for new page
            interactionsOnCurrentPage = 0;
            consecutiveErrors = 0;
            targetInteractions = minInteractionsPerPage + Math.floor(Math.random() * (maxInteractionsPerPage - minInteractionsPerPage));

          } catch (error) {
            console.error(`Error navigating to ${url}:`, error);
            onUpdate?.({
              type: 'warning',
              data: { message: `Navigation failed: ${url}`, error: String(error) }
            });
            consecutiveErrors++;
            await this.sleep(1000);
            continue;
          }
        }

        // Get current page state
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

        // Generate task based on recovery strategy
        const task = this.generateInteractionTask(
          currentUrl,
          interactionsOnCurrentPage,
          targetInteractions,
          recoveryStrategy,
          totalErrorsOnPage
        );

        console.log(`[BROWSING] Running interaction task on ${currentUrl}`);
        try {
          const runResult = await this.run(task, (update) => {
            onUpdate?.({
              type: update.type,
              data: { ...update.data, url: currentUrl, strategy: recoveryStrategy }
            });
          });
          console.log(`[BROWSING] Task completed successfully: ${runResult?.slice(0, 100) || 'no result'}`);

          // Success!
          consecutiveErrors = 0;
          interactionsOnCurrentPage++;
          totalInteractions++;
          pageInsights.push(`Interaction ${interactionsOnCurrentPage} succeeded`);

        } catch (runError) {
          const errorMsg = runError instanceof Error ? runError.message : String(runError);
          console.error(`[BROWSING] Task run error (strategy: ${recoveryStrategy}, errors: ${totalErrorsOnPage}):`, errorMsg);
          consecutiveErrors++;
          totalErrorsOnPage++;
          pageInsights.push(`Error: ${errorMsg.slice(0, 100)}`);

          onUpdate?.({
            type: 'recovery',
            data: {
              error: errorMsg,
              totalErrorsOnPage,
              strategy: recoveryStrategy,
              nextStrategy: totalErrorsOnPage >= 10 ? 'moveOn' : totalErrorsOnPage >= 7 ? 'radical' : totalErrorsOnPage >= 3 ? 'alternative' : 'normal'
            }
          });

          // Apply recovery strategies
          if (totalErrorsOnPage === 3) {
            onUpdate?.({ type: 'info', data: { message: 'Switching to alternative strategy: using screenshot/vision' } });
            try {
              await this.executeTool('take_screenshot', {});
              await this.sleep(1000);
            } catch (e) {
              console.warn('[BROWSING] Screenshot failed:', e);
            }
          } else if (totalErrorsOnPage === 7) {
            onUpdate?.({ type: 'info', data: { message: 'Switching to radical strategy: scroll, refresh, try different elements' } });
            try {
              // Try scrolling to reveal different content
              await this.executeTool('scroll_page', { direction: 'down', amount: 500 });
              await this.sleep(1000);
              await this.executeTool('scroll_page', { direction: 'up', amount: 200 });
              await this.sleep(500);
            } catch (e) {
              console.warn('[BROWSING] Scroll recovery failed:', e);
            }
          } else if (totalErrorsOnPage === 10) {
            onUpdate?.({ type: 'info', data: { message: 'Moving on after 10 errors - collecting insights and continuing' } });
          }
        }

        // Natural pause between interactions
        const pauseDuration = 1000 + Math.random() * 3000;
        await this.sleep(pauseDuration);

        // Occasionally take a longer break
        if (Math.random() < 0.05) {
          const breakDuration = 5 + Math.random() * 15;
          onUpdate?.({ type: 'break', data: { duration: breakDuration } });
          await this.sleep(breakDuration * 1000);
        }

      } catch (loopError) {
        // Catch-all for any loop errors - NEVER let the loop exit
        console.error('[BROWSING] Loop error (continuing):', loopError);
        consecutiveErrors++;
        totalErrorsOnPage++;
        pageInsights.push(`Loop error: ${String(loopError).slice(0, 50)}`);

        onUpdate?.({
          type: 'error',
          data: { error: String(loopError), recovering: true, totalErrorsOnPage }
        });
        await this.sleep(2000);

        // If we've had too many consecutive errors in the loop, take a longer break
        if (consecutiveErrors > 20) {
          console.log('[BROWSING] Too many consecutive errors, taking a longer break');
          onUpdate?.({ type: 'info', data: { message: 'Taking a break due to multiple errors...' } });
          await this.sleep(30000);
          consecutiveErrors = 0;
          // Reset to a new page
          currentPageUrl = '';
          interactionsOnCurrentPage = targetInteractions;
        }
      }
    }

    console.log('[BROWSING] Browsing loop ended, status:', this.autonomousState.status);
  }

  // Do a Bing search based on persona interests
  private async doBingSearch(
    onUpdate?: (update: { type: string; data: any }) => void
  ): Promise<void> {
    const persona = this.personaEngine?.getPersona() || null;
    const searchQueries = this.generateSearchQueries(persona);
    const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

    onUpdate?.({ type: 'search', data: { query, engine: 'bing' } });

    // Navigate to Bing
    await this.executeTool('navigate_to', { url: 'https://www.bing.com' });
    await this.sleep(2000);

    // Type search query
    await this.executeTool('type_text', { text: query, press_enter: true });
    await this.sleep(3000);

    this.logActivity({
      type: 'search',
      details: { query, engine: 'bing' }
    });
  }

  // Generate search queries based on persona
  private generateSearchQueries(persona: PersonaProfile | null): string[] {
    const defaultQueries = [
      'latest news today',
      'best restaurants near me',
      'weather forecast',
      'trending topics',
      'how to cook easy recipes',
      'best movies 2024',
      'tech news',
      'sports scores'
    ];

    if (!persona) return defaultQueries;

    const personaQueries: string[] = [];

    // Add interest-based queries
    for (const interest of persona.interests) {
      personaQueries.push(`${interest} news`);
      personaQueries.push(`best ${interest} tips`);
      personaQueries.push(`${interest} for beginners`);
    }

    // Add location-based queries
    personaQueries.push(`things to do in ${persona.location.city}`);
    personaQueries.push(`${persona.location.city} events`);
    personaQueries.push(`restaurants in ${persona.location.city}`);

    // Add occupation-based queries
    personaQueries.push(`${persona.occupation} career tips`);
    personaQueries.push(`${persona.occupation} salary`);

    return [...personaQueries, ...defaultQueries];
  }

  // Check email periodically
  private async doEmailCheck(
    onUpdate?: (update: { type: string; data: any }) => void
  ): Promise<void> {
    const persona = this.personaEngine?.getPersona();
    if (!persona?.email) return;

    const emailUrls: Record<string, string> = {
      gmail: 'https://mail.google.com',
      outlook: 'https://outlook.live.com/mail',
      yahoo: 'https://mail.yahoo.com',
      protonmail: 'https://mail.proton.me'
    };

    const url = emailUrls[persona.email.provider] || persona.email.loginUrl;
    if (!url) return;

    onUpdate?.({ type: 'email', data: { action: 'checking', provider: persona.email.provider } });

    await this.executeTool('navigate_to', { url });
    await this.sleep(5000);

    // Just browse the inbox briefly
    await this.executeTool('scroll_page', { direction: 'down', amount: 300 });
    await this.sleep(2000);

    this.logActivity({
      type: 'email_check',
      details: { provider: persona.email.provider }
    });
  }

  private generateInteractionTask(
    url: string,
    currentInteractions: number,
    targetInteractions: number,
    recoveryStrategy: 'normal' | 'alternative' | 'radical' | 'moveOn' = 'normal',
    errorCount: number = 0
  ): string {
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

    // Add strategy-specific instructions
    if (recoveryStrategy === 'alternative') {
      task += `

⚠️ ALTERNATIVE STRATEGY (${errorCount} errors encountered):
Previous approaches are failing. Try these different methods:
- Use take_screenshot to see the page visually and identify elements
- Look for different button/link text than what you tried before
- Try scrolling to find other interactive elements
- Check if there's a mobile menu or hamburger icon
- Look for aria-labels or titles on elements

`;
    } else if (recoveryStrategy === 'radical') {
      task += `

🔴 RADICAL STRATEGY (${errorCount} errors - last resort):
Standard DOM interaction is not working. Try VERY different approaches:
- Use click_at_position with rough coordinates based on typical webpage layouts
- Try clicking in center of page (x: 500, y: 400) or common button positions
- Scroll extensively to load dynamic content
- Look for ANY clickable element, even if not directly relevant
- Focus on just completing ONE successful action

`;
    } else if (recoveryStrategy === 'moveOn') {
      task += `

ℹ️ COLLECTING FINAL INSIGHTS (moving to next site):
We've tried many approaches on this page. Before moving on:
- Note what type of page this is
- Identify any content you did see
- Just use complete to summarize what you observed
- No need to interact further

`;
    }

    // ALWAYS handle popups first
    task += `

FIRST - HANDLE ANY POPUPS OR OVERLAYS:
Look for and DISMISS any popups, modals, or overlays blocking the page:

1. COOKIE BANNERS: Click "Accept", "Accept all", "I agree", "OK", or "Got it"

2. LOGIN/SIGNUP POPUPS:
   - Click "X", "Close", "Maybe later", "No thanks", or "Continue as guest"
   - NEVER click "Sign in with Google" or "Sign in with Apple" or "Continue with Google/Apple/Facebook"
   - If you must sign up, use the email signup option with the persona's email address only

3. NEWSLETTER POPUPS: Click "X", "No thanks", "Not now", or "Close"

4. NOTIFICATION REQUESTS: Click "Block", "Not now", or "X"

5. AGE VERIFICATION: Click "I am over 18", "Yes", or "Enter"

6. APP DOWNLOAD PROMPTS: Click "X", "Continue in browser", or "Not now"

If you see ANY overlay or modal, dismiss it first before doing anything else.

`;

    if (currentInteractions === 0) {
      task += `This is a fresh page. After dismissing any popups, look around and find something interesting to interact with. `;
    } else {
      task += `You've done ${currentInteractions} actions. Do ${remaining} more before we move on. `;
    }

    if (persona) {
      const interests = persona.interests.slice(0, 2).join(' and ');
      task += `As someone interested in ${interests}, explore content that appeals to you. Click on interesting links, articles, posts, or products. Scroll to see more. Read things that catch your eye.`;
    } else {
      task += `Explore the page naturally. Click on interesting content, scroll around, interact with what you find.`;
    }

    task += `

RULES:
- STAY ON THIS PAGE - do NOT use navigate_to
- Use click_element to click links, buttons, posts, articles
- Use scroll_page to see more content
- Use wait (5-15 seconds) to simulate reading
- If something doesn't work, try something else
- Be persistent - explore different parts of the page

When done with your action, use complete to summarize what you did.`;

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
