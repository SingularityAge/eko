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
  /click.*link.*email/i
];

interface AutonomousState {
  status: 'idle' | 'running' | 'paused';
  currentPhase: 'discovering' | 'browsing' | 'social' | 'email' | 'reading' | 'waiting';
  discoveredUrls: string[];
  visitedUrls: Set<string>;
  emailVerificationPending: boolean;
  emailCheckScheduledAt: number | null;
  sessionStartTime: number;
  actionsThisSession: number;
}

export class AutonomousAgent extends BaseAgent {
  private personaEngine: PersonaEngine | null;
  private autonomousState: AutonomousState;
  private perplexityModel: string;
  private mainLoopInterval: NodeJS.Timeout | null = null;

  constructor(
    llm: OpenRouterService,
    model: string,
    personaEngine?: PersonaEngine
  ) {
    super('autonomous', llm, {
      model,
      maxIterations: 15,
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
      sessionStartTime: Date.now(),
      actionsThisSession: 0
    };
  }

  protected getDefaultSystemPrompt(): string {
    const persona = this.personaEngine?.getPersona();
    const personaInfo = persona ? this.buildPersonaContext(persona) : '';

    return `You are an autonomous web browsing agent simulating authentic human behavior.

${personaInfo}

Your goal is to browse the web naturally, as if you were this person going about their daily online activities. This includes:
- Visiting websites related to interests and hobbies
- Checking and using social media platforms
- Reading articles and watching content
- Sometimes shopping or researching products
- Occasionally checking email
- Taking natural breaks and pausing

IMPORTANT BEHAVIORS:
1. Act naturally - don't rush through pages. Scroll, read, hover over things.
2. Make human-like decisions about what links to click.
3. Show genuine interest in content that matches the persona's interests.
4. Vary your browsing patterns - don't follow the same sequence every time.
5. If you see a "check your email" or "verify your email" message after signing up, acknowledge it but continue browsing. Email will be checked automatically after a delay.

When you need to navigate, use the navigate_to tool with full URLs.
When interacting with pages, use click_element with the element index.
For typing, first click on input fields, then use type_text.

Always provide reasoning for your actions in your responses.`;
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
          name: 'search_google',
          description: 'Search Google for a query',
          parameters: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'The search query' }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_article',
          description: 'Spend time reading the current article/page with natural scrolling',
          parameters: {
            type: 'object',
            properties: {
              duration_seconds: {
                type: 'number',
                description: 'How long to spend reading (10-120 seconds)'
              }
            },
            required: ['duration_seconds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browse_feed',
          description: 'Browse through a social feed or list with natural scrolling',
          parameters: {
            type: 'object',
            properties: {
              duration_seconds: {
                type: 'number',
                description: 'How long to browse (30-300 seconds)'
              }
            },
            required: ['duration_seconds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'take_break',
          description: 'Take a short break from browsing (simulate looking away, thinking, etc)',
          parameters: {
            type: 'object',
            properties: {
              duration_seconds: {
                type: 'number',
                description: 'Break duration (5-60 seconds)'
              }
            },
            required: ['duration_seconds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_email',
          description: 'Navigate to email inbox to check for new messages',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      }
    ];
  }

  protected async executeToolCall(name: string, args: Record<string, any>): Promise<string> {
    this.autonomousState.actionsThisSession++;

    switch (name) {
      case 'take_break':
        const breakDuration = Math.min(60, Math.max(5, args.duration_seconds || 15));
        await this.sleep(breakDuration * 1000);
        this.logActivity({ type: 'break', details: { duration: breakDuration } });
        return `Took a ${breakDuration} second break`;

      case 'check_email':
        return this.handleCheckEmail();

      case 'search_google':
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
        const result = await this.executeTool('navigate_to', { url: searchUrl });
        this.logActivity({ type: 'search', details: { query: args.query } });
        return result?.result || `Searched for: ${args.query}`;

      default:
        // Use the base tool executor
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

  // Discover starting URLs based on persona using Perplexity
  async discoverStartingUrls(): Promise<string[]> {
    const persona = this.personaEngine?.getPersona();
    if (!persona) {
      // Return some default starting points
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

      // Use Perplexity to search for relevant URLs
      const searchResult = await this.llm.searchWithPerplexity(query, this.perplexityModel);

      // Extract URLs from the search result
      const urls = this.extractUrlsFromText(searchResult);

      // Add persona's favorite sites
      const favoriteSites = persona.browsingHabits.favoriteSites.map(site => {
        if (site.startsWith('http')) return site;
        return `https://www.${site.toLowerCase().replace(/\s+/g, '')}.com`;
      });

      // Add social media platforms
      const socialUrls = persona.socialMedia.platforms
        .filter(p => p.usage !== 'occasional')
        .map(p => this.getSocialMediaUrl(p.name));

      const allUrls = [...new Set([...urls, ...favoriteSites, ...socialUrls])];
      this.autonomousState.discoveredUrls = allUrls;

      return allUrls.slice(0, 10); // Return top 10 URLs
    } catch (error) {
      console.error('Error discovering URLs:', error);
      // Fallback to persona favorites
      return persona.browsingHabits.favoriteSites.slice(0, 5).map(site =>
        site.startsWith('http') ? site : `https://www.${site.toLowerCase()}.com`
      );
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
    // Clean up URLs (remove trailing punctuation)
    return matches.map(url => url.replace(/[.,;:!?)]+$/, ''));
  }

  private getSocialMediaUrl(platform: string): string {
    const urls: Record<string, string> = {
      'Instagram': 'https://www.instagram.com',
      'Twitter': 'https://twitter.com',
      'Twitter/X': 'https://twitter.com',
      'X': 'https://twitter.com',
      'Facebook': 'https://www.facebook.com',
      'Reddit': 'https://www.reddit.com',
      'TikTok': 'https://www.tiktok.com',
      'YouTube': 'https://www.youtube.com',
      'LinkedIn': 'https://www.linkedin.com',
      'Pinterest': 'https://www.pinterest.com',
      'Snapchat': 'https://www.snapchat.com',
      'Discord': 'https://discord.com',
      'Twitch': 'https://www.twitch.tv'
    };
    return urls[platform] || `https://www.${platform.toLowerCase()}.com`;
  }

  // Check page content for email verification prompts
  checkForEmailVerification(pageContent: string): boolean {
    for (const pattern of EMAIL_VERIFICATION_PATTERNS) {
      if (pattern.test(pageContent)) {
        return true;
      }
    }
    return false;
  }

  // Schedule email check with random delay (1-3 minutes)
  scheduleEmailCheck(): void {
    if (this.autonomousState.emailVerificationPending) return;

    const delayMs = (60 + Math.random() * 120) * 1000; // 1-3 minutes
    this.autonomousState.emailVerificationPending = true;
    this.autonomousState.emailCheckScheduledAt = Date.now() + delayMs;

    this.logActivity({
      type: 'email_check',
      details: { scheduled: true, delaySeconds: Math.round(delayMs / 1000) }
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

    while (this.autonomousState.status === 'running') {
      // Check if we should pause
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
        this.autonomousState.currentPhase = 'email';
        onUpdate?.({ type: 'phase', data: { phase: 'email', reason: 'verification' } });

        await this.handleCheckEmail();
        this.autonomousState.emailVerificationPending = false;
        this.autonomousState.emailCheckScheduledAt = null;

        // Wait a bit after checking email
        await this.sleep(3000 + Math.random() * 5000);
        this.autonomousState.currentPhase = 'browsing';
      }

      // Get next URL to visit
      const url = urls[urlIndex % urls.length];
      urlIndex++;

      // Avoid re-visiting recently visited URLs
      if (this.autonomousState.visitedUrls.has(url) && urlIndex < urls.length * 2) {
        continue;
      }

      try {
        // Navigate to URL
        await this.executeTool('navigate_to', { url });
        this.autonomousState.visitedUrls.add(url);
        await this.sleep(2000); // Wait for page load

        // Get updated page content
        const pageInfo = await this.executeTool('get_page_info', {});
        const content = await this.executeTool('extract_content', {});

        onUpdate?.({
          type: 'navigation',
          data: { url, title: pageInfo?.title }
        });

        // Check for email verification prompts
        if (this.checkForEmailVerification(content?.result || content || '')) {
          this.scheduleEmailCheck();
          onUpdate?.({
            type: 'email_verification_detected',
            data: { scheduledIn: '1-3 minutes' }
          });
        }

        // Update context for agent
        this.setContext({
          url,
          pageContent: content?.result || content,
        });

        // Run a browsing iteration with the LLM
        const task = this.generateBrowsingTask(url);
        await this.run(task, (update) => {
          onUpdate?.({
            type: update.type,
            data: { ...update.data, url }
          });
        });

        // Natural pause between pages
        const pauseDuration = 2000 + Math.random() * 5000;
        await this.sleep(pauseDuration);

        // Occasionally take a break
        if (Math.random() < 0.1) {
          const breakDuration = 5 + Math.random() * 20;
          onUpdate?.({ type: 'break', data: { duration: breakDuration } });
          await this.sleep(breakDuration * 1000);
        }

        // Occasionally check email randomly
        if (Math.random() < 0.05) {
          this.autonomousState.currentPhase = 'email';
          await this.handleCheckEmail();
          await this.sleep(10000 + Math.random() * 20000);
          this.autonomousState.currentPhase = 'browsing';
        }

      } catch (error) {
        console.error(`Error browsing ${url}:`, error);
        onUpdate?.({
          type: 'error',
          data: { url, error: error instanceof Error ? error.message : String(error) }
        });
        // Continue to next URL
        await this.sleep(2000);
      }
    }
  }

  private generateBrowsingTask(url: string): string {
    const persona = this.personaEngine?.getPersona();
    const domain = new URL(url).hostname;

    let task = `You are currently on ${domain}. `;

    // Add persona-specific context
    if (persona) {
      if (domain.includes('reddit')) {
        task += `Browse Reddit as someone interested in ${persona.interests.slice(0, 2).join(' and ')}. Look for interesting posts, maybe upvote or explore comments.`;
      } else if (domain.includes('youtube')) {
        task += `Browse YouTube looking for videos about ${persona.interests[0] || 'trending topics'}. Watch recommendations, scroll through home page.`;
      } else if (domain.includes('instagram') || domain.includes('twitter') || domain.includes('facebook')) {
        task += `Browse your social feed naturally. Scroll through posts, maybe like some content, view some profiles.`;
      } else if (domain.includes('amazon') || domain.includes('shop')) {
        task += `Browse products casually, maybe look at ${persona.interests[0] || 'interesting items'}. Check reviews, compare prices.`;
      } else if (domain.includes('news') || domain.includes('cnn') || domain.includes('bbc')) {
        task += `Read some news articles that catch your interest. Scroll through headlines, click on interesting stories.`;
      } else {
        task += `Explore this website naturally based on your interests (${persona.interests.slice(0, 3).join(', ')}). Click on interesting content, scroll around, read what catches your eye.`;
      }
    } else {
      task += `Explore this website naturally. Click on interesting content, scroll around, interact with the page as a normal user would.`;
    }

    task += ` After exploring for a bit (3-5 actions), use the complete tool to summarize what you did.`;

    return task;
  }

  // Control methods
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
