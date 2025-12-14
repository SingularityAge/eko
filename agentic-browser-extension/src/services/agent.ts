// ============================================
// Autonomous Browser Agent - Core Logic
// With vision fallback, tab management, popup handling
// Human-like behavior with realistic daily schedules
// ============================================

import { getOpenRouter, OpenRouterService } from './openrouter';
import { getSettings, getCredentials, getCredentialByDomain, extractDomain, saveCredential } from './storage';
import { Tool, LLMMessage, Persona, BrowserState, Credential } from '../shared/types';

// Timezone offsets by country (approximate, major timezone)
const COUNTRY_TIMEZONES: Record<string, number> = {
  'United States': -5, 'Canada': -5, 'Mexico': -6, 'Brazil': -3, 'Argentina': -3,
  'United Kingdom': 0, 'Ireland': 0, 'Portugal': 0, 'Spain': 1, 'France': 1,
  'Germany': 1, 'Italy': 1, 'Netherlands': 1, 'Belgium': 1, 'Switzerland': 1,
  'Austria': 1, 'Poland': 1, 'Czech Republic': 1, 'Sweden': 1, 'Norway': 1,
  'Denmark': 1, 'Finland': 2, 'Greece': 2, 'Turkey': 3, 'Russia': 3,
  'Ukraine': 2, 'Romania': 2, 'Hungary': 1, 'South Africa': 2,
  'Egypt': 2, 'Israel': 2, 'Saudi Arabia': 3, 'United Arab Emirates': 4,
  'India': 5.5, 'Pakistan': 5, 'Bangladesh': 6, 'Thailand': 7, 'Vietnam': 7,
  'Singapore': 8, 'Malaysia': 8, 'Philippines': 8, 'Indonesia': 7,
  'China': 8, 'Hong Kong': 8, 'Taiwan': 8, 'South Korea': 9, 'Japan': 9,
  'Australia': 10, 'New Zealand': 12
};

// Phone prefixes by country (country code + typical area codes)
const COUNTRY_PHONE_PREFIXES: Record<string, { code: string; areaCodes: string[] }> = {
  'United States': { code: '+1', areaCodes: ['212', '310', '415', '312', '305', '702', '206', '404', '617', '713'] },
  'Canada': { code: '+1', areaCodes: ['416', '604', '514', '403', '613', '780', '250', '306'] },
  'United Kingdom': { code: '+44', areaCodes: ['20', '121', '161', '141', '113', '117', '131', '151'] },
  'Germany': { code: '+49', areaCodes: ['30', '40', '89', '69', '221', '211', '711', '341'] },
  'France': { code: '+33', areaCodes: ['1', '4', '5', '6'] },
  'Italy': { code: '+39', areaCodes: ['02', '06', '011', '051', '055', '081', '091'] },
  'Spain': { code: '+34', areaCodes: ['91', '93', '96', '95', '94'] },
  'Netherlands': { code: '+31', areaCodes: ['20', '10', '70', '30', '40'] },
  'Australia': { code: '+61', areaCodes: ['2', '3', '7', '8'] },
  'Japan': { code: '+81', areaCodes: ['3', '6', '52', '11', '45', '78'] },
  'South Korea': { code: '+82', areaCodes: ['2', '51', '53', '62', '42'] },
  'India': { code: '+91', areaCodes: ['11', '22', '33', '44', '80', '40'] },
  'Brazil': { code: '+55', areaCodes: ['11', '21', '31', '41', '51', '61'] },
  'Mexico': { code: '+52', areaCodes: ['55', '33', '81', '442', '664'] },
  'China': { code: '+86', areaCodes: ['10', '21', '20', '755', '571', '28'] },
  'Singapore': { code: '+65', areaCodes: ['6', '8', '9'] },
  'Switzerland': { code: '+41', areaCodes: ['44', '22', '31', '61', '21'] },
  'Austria': { code: '+43', areaCodes: ['1', '316', '512', '662', '732'] },
  'Sweden': { code: '+46', areaCodes: ['8', '31', '40', '18', '90'] },
  'Norway': { code: '+47', areaCodes: ['2', '4', '5', '6', '7'] },
  'Denmark': { code: '+45', areaCodes: ['3', '4', '5', '6', '7', '8', '9'] },
  'Poland': { code: '+48', areaCodes: ['22', '12', '61', '71', '58'] },
  'Ireland': { code: '+353', areaCodes: ['1', '21', '61', '91', '51'] },
  'New Zealand': { code: '+64', areaCodes: ['9', '4', '3', '7', '6'] },
  'South Africa': { code: '+27', areaCodes: ['11', '21', '31', '41', '51'] },
  'United Arab Emirates': { code: '+971', areaCodes: ['4', '2', '6', '7', '9'] },
  'Israel': { code: '+972', areaCodes: ['3', '2', '4', '8', '9'] },
  'Russia': { code: '+7', areaCodes: ['495', '812', '383', '343', '846'] },
  'Turkey': { code: '+90', areaCodes: ['212', '216', '312', '232', '224'] },
  'Thailand': { code: '+66', areaCodes: ['2', '53', '74', '38', '42'] },
  'Vietnam': { code: '+84', areaCodes: ['24', '28', '236', '225', '263'] },
  'Philippines': { code: '+63', areaCodes: ['2', '32', '82', '35', '45'] },
  'Indonesia': { code: '+62', areaCodes: ['21', '22', '31', '61', '411'] },
  'Malaysia': { code: '+60', areaCodes: ['3', '4', '7', '82', '88'] },
};

// Activity record for status history
interface ActivityRecord {
  type: 'sleep' | 'meal' | 'shower' | 'break' | 'browsing';
  startTime: number; // timestamp
  endTime: number;   // timestamp
  duration: number;  // minutes
}

// Meal schedule item
interface MealSchedule {
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  hour: number;
  duration: number; // minutes
}

// Daily schedule
interface DailySchedule {
  date: string; // YYYY-MM-DD
  sleepStart: number; // hour in local time (e.g., 22 for 10pm)
  sleepDuration: number; // hours (6-9)
  meals: MealSchedule[]; // all meals including breakfast, lunch, dinner, snacks
  showerStart: number; // hour in local time
  showerDuration: number; // minutes
  breaks: { hour: number; duration: number }[]; // random breaks throughout day
}

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
  private visionEnabledSetting: boolean = false; // User setting - whether vision is allowed

  // Randomization for natural behavior
  private actionsOnCurrentPage: number = 0;
  private scrollsOnCurrentPage: number = 0;

  // Bing search scheduling (1-3 searches every 1-3 hours)
  private lastSearchTime: number = 0;
  private nextSearchInterval: number = 0; // ms until next search session
  private searchesRemaining: number = 0; // searches to do in current session

  // Human behavior simulation
  private timezoneOffset: number = 0; // hours from UTC
  private currentSchedule: DailySchedule | null = null;
  private activityHistory: ActivityRecord[] = []; // last 2 days of activities
  private currentActivity: { type: string; startTime: number } | null = null;
  private pauseEndTime: number = 0; // when current pause ends (0 = not paused)

  // Initial test browsing period (3-6 minutes at session start)
  private testPeriodEndTime: number = 0; // when test period ends (0 = no test period)

  // Ad/sponsored content interaction (10-20 per day)
  private dailyAdClicks: number = 0;
  private targetAdClicks: number = 10 + Math.floor(Math.random() * 11); // 10-20
  private lastAdClickDate: string = ''; // YYYY-MM-DD to track day changes

  // Email verification tracking
  private pendingVerification: {
    domain: string;          // Site we signed up on
    signupTabId: number;     // Tab with the verification code input
    email: string;           // Email used for signup
    password: string;        // Password used for signup
    startTime: number;       // When we started waiting
  } | null = null;

  // Agent email settings (for signups)
  private agentEmail: string = '';
  private agentEmailPassword: string = '';
  private emailProviderUrl: string = '';

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

  // Get the current working tab ID
  getWorkingTabId(): number | null {
    return this.tabId;
  }

  // Generate a plausible phone number for the persona's country
  private generatePhoneNumber(): string {
    if (!this.persona) return '';

    const country = this.persona.country;
    const phoneData = COUNTRY_PHONE_PREFIXES[country];

    if (!phoneData) {
      // Fallback: generate a generic US number
      const areaCode = Math.floor(200 + Math.random() * 800).toString();
      const exchange = Math.floor(200 + Math.random() * 800).toString();
      const subscriber = Math.floor(1000 + Math.random() * 9000).toString();
      return `+1${areaCode}${exchange}${subscriber}`;
    }

    // Pick a random area code
    const areaCode = phoneData.areaCodes[Math.floor(Math.random() * phoneData.areaCodes.length)];

    // Generate subscriber number (remaining digits to make a valid number)
    let subscriberLength = 7; // Most countries use 7 digits after area code
    if (['United Kingdom', 'Germany', 'France'].includes(country)) subscriberLength = 8;
    if (['Japan', 'South Korea'].includes(country)) subscriberLength = 8 - areaCode.length;

    let subscriber = '';
    for (let i = 0; i < subscriberLength; i++) {
      subscriber += Math.floor(Math.random() * 10).toString();
    }

    return `${phoneData.code}${areaCode}${subscriber}`;
  }

  // Generate a password for signups
  private generateSignupPassword(): string {
    const words = ['Sun', 'Moon', 'Star', 'Cloud', 'Rain', 'Wind', 'Fire', 'Ice', 'Rock', 'Wave'];
    const word1 = words[Math.floor(Math.random() * words.length)];
    const word2 = words[Math.floor(Math.random() * words.length)];
    const number = Math.floor(100 + Math.random() * 900);
    const special = ['!', '@', '#', '$'][Math.floor(Math.random() * 4)];
    return `${word1}${word2}${number}${special}`;
  }

  // Handle signup completion - save credentials
  private async handleSignupComplete(domain: string, password: string): Promise<void> {
    if (!this.agentEmail) return;

    console.log('[AGENT] Saving credentials for:', domain);
    this.updateState({ currentAction: `Saving credentials for ${domain}...` });

    try {
      await saveCredential({
        domain,
        url: `https://${domain}`,
        email: this.agentEmail,
        password
      });
      console.log('[AGENT] Credentials saved successfully');
    } catch (e) {
      console.error('[AGENT] Failed to save credentials:', e);
    }
  }

  // Handle email verification - navigate to email provider to get verification code
  private async handleEmailVerification(signupDomain: string): Promise<void> {
    if (!this.agentEmail || !this.agentEmailPassword || !this.emailProviderUrl) {
      console.log('[AGENT] Cannot verify email - missing email provider settings');
      return;
    }

    console.log('[AGENT] Starting email verification for:', signupDomain);
    this.updateState({ currentAction: 'Opening email to verify account...' });

    // Save current tab as the one waiting for verification
    this.pendingVerification = {
      domain: signupDomain,
      signupTabId: this.tabId || 0,
      email: this.agentEmail,
      password: '', // Will be set when we find the code
      startTime: Date.now()
    };

    // Open email provider in a new tab
    try {
      const emailTab = await chrome.tabs.create({ url: this.emailProviderUrl, active: true });
      if (emailTab.id) {
        // Switch working tab to email
        const oldTabId = this.tabId;
        this.tabId = emailTab.id;
        await this.focusTab();
        await this.protectWorkingTab();

        // The next iterations will navigate the email interface
        console.log('[AGENT] Opened email provider, will look for verification email');
        this.updateState({ currentAction: 'Logging into email...' });

        // Store the signup tab ID for later return
        if (oldTabId) {
          this.pendingVerification.signupTabId = oldTabId;
        }
      }
    } catch (e) {
      console.error('[AGENT] Failed to open email provider:', e);
      this.pendingVerification = null;
    }
  }

  // Check if we're in email verification mode and should look for verification codes
  private isInEmailVerificationMode(): boolean {
    return this.pendingVerification !== null;
  }

  // Generate email-specific task when in verification mode
  private generateEmailVerificationTask(pageState: { url: string; title: string; elements: string }): string {
    const verification = this.pendingVerification!;

    // Check if we have a code to enter (returned from email)
    if (verification.password && verification.password.length > 0 && verification.password.length < 20) {
      // We have a code - generate task to enter it on the signup page
      return this.generateCodeEntryTask(pageState, verification.password);
    }

    let task = `You are checking email to find a verification code/link for ${verification.domain}.\n\n`;
    task += `Current page: ${pageState.url}\nTitle: ${pageState.title}\n\n`;
    task += `Email credentials:\n- Email: ${this.agentEmail}\n- Password: ${this.agentEmailPassword}\n\n`;
    task += `Interactive elements:\n${pageState.elements.slice(0, 6000)}\n\n`;
    task += `Instructions:
1. If you see a login form, log in with the email credentials above
2. Once logged in, look for recent emails from ${verification.domain} or with "verify", "confirm", "activation" in subject
3. Open the verification email
4. Look for:
   - A verification CODE (usually 4-8 digits or characters)
   - A verification LINK (a button or link saying "Verify", "Confirm", "Activate")
5. If you find a CODE, respond with "VERIFICATION_CODE:XXXXXX" where XXXXXX is the code
6. If you find a LINK, click it - it will verify the account directly
7. If you clicked a link and see "verified" or "success", respond with "VERIFICATION_COMPLETE"
8. Use 'done' if you can't find the email after scrolling through inbox

What action should you take?`;
    return task;
  }

  // Generate task for entering verification code on signup page
  private generateCodeEntryTask(pageState: { url: string; title: string; elements: string }, code: string): string {
    let task = `You need to enter a verification code to complete account signup.\n\n`;
    task += `Current page: ${pageState.url}\nTitle: ${pageState.title}\n\n`;
    task += `VERIFICATION CODE TO ENTER: ${code}\n\n`;
    task += `Interactive elements:\n${pageState.elements.slice(0, 6000)}\n\n`;
    task += `Instructions:
1. Find the verification code input field (might be a single field or multiple digit boxes)
2. Click on the first input field
3. Type the verification code: ${code}
4. If there's a "Verify" or "Submit" button, click it after entering the code
5. Once verified successfully, say "VERIFICATION_COMPLETE" in your response
6. If the page shows an error about invalid code, say "VERIFICATION_FAILED" in your response

What action should you take?`;
    return task;
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
    this.visionEnabledSetting = settings.visionEnabled || false;
    console.log('[AGENT] Vision analysis:', this.visionEnabledSetting ? 'enabled' : 'disabled');

    // Load agent email settings for signups
    this.agentEmail = settings.agentEmail || '';
    this.agentEmailPassword = settings.agentEmailPassword || '';
    this.emailProviderUrl = settings.emailProvider?.loginUrl || '';
    console.log('[AGENT] Agent email:', this.agentEmail ? 'configured' : 'not configured');

    this.running = true;
    this.visitedUrls.clear();
    this.useVisionMode = false;
    this.consecutiveFailures = 0;
    this.actionsOnCurrentPage = 0;
    this.scrollsOnCurrentPage = 0;

    // Initialize Bing search scheduling (1-3 hours = 3600000-10800000 ms)
    this.lastSearchTime = Date.now();
    this.scheduleNextSearchSession();

    this.updateState({ status: 'running', currentAction: 'Initializing...', totalActions: 0, errors: 0 });

    // Use persona from settings (generated via sidebar)
    this.persona = settings.persona;
    if (this.persona) {
      console.log('[AGENT] Using persona:', this.persona.firstName, this.persona.lastName);
      // Set timezone based on persona's country
      this.timezoneOffset = COUNTRY_TIMEZONES[this.persona.country] ?? 0;
      console.log('[AGENT] Timezone offset:', this.timezoneOffset, 'hours from UTC');
    } else {
      console.log('[AGENT] No persona set - using default browsing behavior');
      this.timezoneOffset = 0;
    }

    // Initialize test browsing period (3-6 minutes randomized)
    // This allows testing if browsing works even when persona should be sleeping
    const testMinutes = 3 + Math.random() * 3; // 3-6 minutes
    this.testPeriodEndTime = Date.now() + testMinutes * 60 * 1000;
    console.log('[AGENT] Test browsing period: ', Math.round(testMinutes * 10) / 10, 'minutes before following schedule');

    // Initialize daily schedule for human-like behavior
    this.generateDailySchedule();
    this.cleanupOldActivityHistory();

    // Get or create a tab and ensure focus
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.tabId = activeTab?.id || null;

      if (!this.tabId || activeTab?.url?.startsWith('chrome://')) {
        const newTab = await chrome.tabs.create({ url: 'about:blank', active: true });
        this.tabId = newTab.id || null;
      }

      // Ensure our tab is focused and protected from cleanup
      if (this.tabId) {
        await this.focusTab();
        await this.protectWorkingTab();
      }
    } catch (e) {
      console.warn('[AGENT] Tab setup error:', e);
    }

    // Research phase: discover URLs matching persona interests
    this.updateState({ currentAction: 'Researching URLs based on persona interests...' });
    await this.discoverUrls();

    // Start browsing
    console.log('[AGENT] Starting browsing loop with', this.urlQueue.length, 'URLs');
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

  // Get current schedule for UI display
  getSchedule(): { meals: { type: string; time: string }[]; sleep: string; shower: string } | null {
    if (!this.currentSchedule) return null;

    const formatTime = (hour: number): string => {
      const h = Math.floor(hour) % 24;
      const m = Math.floor((hour % 1) * 60);
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const meals = this.currentSchedule.meals.map(m => ({
      type: m.type.charAt(0).toUpperCase() + m.type.slice(1),
      time: formatTime(m.hour)
    })).sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    const sleepEnd = (this.currentSchedule.sleepStart + this.currentSchedule.sleepDuration) % 24;

    return {
      meals,
      sleep: `${formatTime(this.currentSchedule.sleepStart)} - ${formatTime(sleepEnd)}`,
      shower: formatTime(this.currentSchedule.showerStart)
    };
  }

  // Get current pause status with live remaining time
  getPauseStatus(): { isPaused: boolean; type: string | null; remainingMs: number; message: string | null } {
    if (this.pauseEndTime <= 0) {
      return { isPaused: false, type: null, remainingMs: 0, message: null };
    }

    const remainingMs = Math.max(0, this.pauseEndTime - Date.now());
    if (remainingMs <= 0) {
      return { isPaused: false, type: null, remainingMs: 0, message: null };
    }

    const activityType = this.currentActivity?.type || 'break';

    // Format remaining time
    let timeStr: string;
    if (remainingMs >= 3600000) {
      const hours = remainingMs / 3600000;
      timeStr = `${Math.round(hours * 10) / 10}h remaining`;
    } else {
      const mins = Math.ceil(remainingMs / 60000);
      timeStr = `${mins}min remaining`;
    }

    // Generate message based on activity type
    const messages: Record<string, string> = {
      'sleep': 'Sleeping',
      'meal': this.currentActivity?.type === 'meal' ? 'Having a meal' : 'Eating',
      'breakfast': 'Having breakfast',
      'lunch': 'Having lunch',
      'dinner': 'Having dinner',
      'snack': 'Having a snack',
      'shower': 'Taking a shower',
      'break': 'Taking a break'
    };

    const label = messages[activityType] || 'Paused';
    const message = `${label} (${timeStr})`;

    return { isPaused: true, type: activityType, remainingMs, message };
  }

  // Handle tab being closed externally - recover by creating a new tab
  async handleTabClosed(): Promise<void> {
    console.log('[AGENT] Tab was closed, attempting recovery...');
    this.tabId = null;

    // Only recover if we're still supposed to be running
    if (!this.running || this.state.status === 'idle') {
      console.log('[AGENT] Not running, no recovery needed');
      return;
    }

    try {
      // Create a new tab
      const newTab = await chrome.tabs.create({ url: 'about:blank', active: true });
      this.tabId = newTab.id || null;

      if (this.tabId) {
        console.log('[AGENT] Created new working tab:', this.tabId);
        await this.focusTab();
        await this.protectWorkingTab();
        this.updateState({ currentAction: 'Recovered from tab close, continuing...' });
      } else {
        console.error('[AGENT] Failed to create recovery tab');
        this.updateState({ currentAction: 'Error: Could not recover tab', errors: this.state.errors + 1 });
      }
    } catch (e) {
      console.error('[AGENT] Tab recovery error:', e);
      this.updateState({ currentAction: 'Error: Tab recovery failed', errors: this.state.errors + 1 });
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

  // Protect the working tab from being closed by cleanup
  private async protectWorkingTab(): Promise<void> {
    if (!this.tabId) return;
    try {
      await chrome.runtime.sendMessage({ type: 'SET_WORKING_TAB', payload: { tabId: this.tabId } });
      console.log('[AGENT] Protected working tab:', this.tabId);
    } catch (e) {
      console.warn('[AGENT] Protect tab error:', e);
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
    console.log('[AGENT] ========================================');
    console.log('[AGENT] URL Discovery Phase');
    console.log('[AGENT] ========================================');

    const settings = await getSettings();
    const credentials = await getCredentials();
    const credentialUrls = credentials.map(c => c.url).filter(url => url);

    // Default URLs to start browsing
    const defaultUrls = [
      'https://www.bing.com',
      'https://www.reddit.com',
      'https://www.youtube.com',
      'https://news.ycombinator.com',
      'https://www.wikipedia.org',
      'https://www.medium.com'
    ];

    // Use pre-discovered URLs from persona generation if available
    const discoveredUrls: string[] = settings.discoveredUrls || [];

    if (discoveredUrls.length > 0) {
      console.log('[AGENT] Using', discoveredUrls.length, 'pre-discovered URLs');
    }

    if (this.persona) {
      console.log('[AGENT] Persona:', this.persona.firstName, this.persona.lastName);
      console.log('[AGENT] Interests:', this.persona.interests.join(', '));
      console.log('[AGENT] Location:', this.persona.city, this.persona.country);
    }

    // Combine all URLs, remove duplicates
    const allUrls = [...new Set([
      ...discoveredUrls,
      ...credentialUrls,
      ...defaultUrls
    ])];

    // Shuffle URLs for randomized browsing order
    this.urlQueue = this.shuffleArray(allUrls);
    console.log('[AGENT] ========================================');
    console.log('[AGENT] URL Queue ready:', this.urlQueue.length, 'URLs');
    console.log('[AGENT] First 5:', this.urlQueue.slice(0, 5).join(', '));
    console.log('[AGENT] ========================================');
  }

  private async browsingLoop(): Promise<void> {
    console.log('[AGENT] ========================================');
    console.log('[AGENT] Starting browsing loop');
    console.log('[AGENT] ========================================');

    let consecutiveErrors = 0;
    let loopIteration = 0;

    // Navigate to first URL immediately
    await this.navigateToNextUrl();

    while (this.running) {
      loopIteration++;
      console.log('[AGENT] --- Loop iteration', loopIteration, '---');

      // Check for activity pause status first (this updates the countdown)
      const pauseStatus = this.getPauseStatus();
      if (pauseStatus.isPaused && pauseStatus.message) {
        // Update the countdown message
        this.updateState({ status: 'paused', currentAction: pauseStatus.message });
        await this.sleep(5000); // Check every 5 seconds during activity pauses
        continue;
      }

      // If we were in an activity pause but it's now over, resume
      if (this.pauseEndTime > 0 && Date.now() >= this.pauseEndTime) {
        console.log('[AGENT] Activity pause ended, resuming...');
        // Record the completed activity
        if (this.currentActivity) {
          // Map meal subtypes to 'meal' for activity recording
          const activityType = ['breakfast', 'lunch', 'dinner', 'snack'].includes(this.currentActivity.type)
            ? 'meal'
            : this.currentActivity.type as 'sleep' | 'meal' | 'shower' | 'break';
          this.recordActivity(
            activityType,
            this.currentActivity.startTime,
            Date.now()
          );
          this.currentActivity = null;
        }
        this.pauseEndTime = 0;
        this.updateState({ status: 'running', currentAction: 'Resuming browsing...' });
      }

      // Check for manual pause (user clicked pause button)
      if (this.state.status === 'paused' && this.pauseEndTime === 0) {
        console.log('[AGENT] Manually paused, waiting...');
        await this.sleep(1000);
        continue;
      }

      try {
        // Check if we should START a new human-like pause (sleep, dinner, shower, break)
        const isPaused = await this.checkAndHandlePause();
        if (isPaused) {
          // Pause just started, loop will handle countdown on next iteration
          await this.sleep(1000);
          continue;
        }

        // Check if it's time for a scheduled Bing search
        const didSearch = await this.checkAndPerformBingSearch();
        if (didSearch) {
          // After search, continue loop to interact with search results
          await this.sleep(1000);
          continue;
        }

        // Ensure focus on our tab
        await this.focusTab();

        // Wait for page to load
        await this.sleep(1500);

        // Get page state
        console.log('[AGENT] Getting page state for tab', this.tabId);
        const pageState = await this.getPageState();

        if (!pageState) {
          console.warn('[AGENT] No page state returned, waiting...');
          consecutiveErrors++;
          if (consecutiveErrors >= 5) {
            console.log('[AGENT] Too many page state failures, navigating to next URL');
            await this.navigateToNextUrl();
            consecutiveErrors = 0;
          }
          await this.sleep(2000);
          continue;
        }

        console.log('[AGENT] Page:', pageState.url);
        console.log('[AGENT] Title:', pageState.title);
        console.log('[AGENT] Elements:', pageState.elements.split('\n').length, 'interactive elements');

        this.updateState({ currentUrl: pageState.url });

        // Check for stuck state (same page state 3+ times)
        const stateHash = `${pageState.url}:${pageState.elements.slice(0, 500)}`;
        if (stateHash === this.lastPageState) {
          this.sameStateCount++;
          console.log('[AGENT] Same state count:', this.sameStateCount);
          if (this.sameStateCount >= 3) {
            // Will check visionEnabledSetting dynamically when needed
            console.log('[AGENT] Stuck state detected, marking for potential vision mode');
            this.useVisionMode = true;
          }
        } else {
          this.lastPageState = stateHash;
          this.sameStateCount = 0;
        }

        // Check for login opportunity
        const domain = extractDomain(pageState.url);
        const cred = await getCredentialByDomain(domain);

        // Generate task and get single action
        let task: string;
        let screenshot: string | null = null;

        // Check vision setting dynamically (allows toggling without restart)
        const currentSettings = await getSettings();
        this.visionEnabledSetting = currentSettings.visionEnabled || false;
        const useVision = this.useVisionMode && this.visionEnabledSetting;

        // Use email verification task if we're in that mode
        if (this.isInEmailVerificationMode()) {
          task = this.generateEmailVerificationTask(pageState);
        } else if (useVision) {
          this.updateState({ currentAction: 'Taking screenshot for vision analysis...' });
          screenshot = await this.takeScreenshot();
          task = this.generateVisionTask(pageState, cred, screenshot);
        } else {
          task = this.generateTask(pageState, cred);
        }

        // Get LLM decision (single step)
        const thinkingMsg = useVision ? 'Analyzing with vision...' : 'Thinking...';
        this.updateState({ currentAction: thinkingMsg });
        console.log('[AGENT] Calling LLM for next action...');

        const action = await this.getNextAction(task, pageState, screenshot);

        console.log('[AGENT] Action to execute:', action?.name, action?.args);

        if (action) {
          this.updateState({ currentAction: `Executing: ${action.name}` });
          const result = await this.executeAction(action.name, action.args);
          console.log('[AGENT] Action result:', result.slice(0, 100));

          // Parse signals from LLM response for signup/verification handling
          if (action.responseText) {
            const signals = this.parseSignals(action.responseText);

            // Handle signup completion - save credentials
            if (signals.signupComplete) {
              const currentDomain = extractDomain(pageState.url);
              console.log('[AGENT] Signup complete signal detected for:', currentDomain);
              await this.handleSignupComplete(currentDomain, signals.signupComplete);
            }

            // Handle email verification request - open email provider
            if (signals.needEmailVerification && !this.isInEmailVerificationMode()) {
              const currentDomain = extractDomain(pageState.url);
              console.log('[AGENT] Email verification needed for:', currentDomain);
              await this.handleEmailVerification(currentDomain);
            }

            // Handle verification code found - return to signup tab
            if (signals.verificationCode && this.isInEmailVerificationMode()) {
              console.log('[AGENT] Verification code found:', signals.verificationCode);
              await this.returnToSignupWithCode(signals.verificationCode);
            }

            // Handle verification complete (clicked link in email)
            if (signals.verificationComplete && this.isInEmailVerificationMode()) {
              console.log('[AGENT] Verification completed via link');
              await this.completeVerification();
            }
          }

          // Track actions on current page
          this.actionsOnCurrentPage++;
          if (action.name === 'scroll') {
            this.scrollsOnCurrentPage++;
          }

          // Check if action succeeded
          if (result.includes('Error')) {
            this.consecutiveFailures++;
            console.log('[AGENT] Consecutive failures:', this.consecutiveFailures);
            if (this.consecutiveFailures >= 3 && !this.useVisionMode) {
              // Will check visionEnabledSetting dynamically when needed
              console.log('[AGENT] 3 consecutive failures, marking for potential vision mode');
              this.useVisionMode = true;
            }
          } else {
            this.consecutiveFailures = 0;
            if (useVision) {
              // Vision mode succeeded, can try DOM mode again next time
              this.useVisionMode = false;
            }

            // Track ad clicks by checking for ad-related patterns in action
            if (action.name === 'click' || action.name === 'click_coordinates') {
              const actionStr = JSON.stringify(action.args).toLowerCase();
              const resultStr = result.toLowerCase();
              const adPatterns = ['ad', 'sponsor', 'promo', 'advertis', 'partner', 'paid'];
              const isAdClick = adPatterns.some(p => actionStr.includes(p) || resultStr.includes(p));
              if (isAdClick) {
                this.recordAdClick();
              }
            }
          }

          this.updateState({ totalActions: this.state.totalActions + 1 });
          consecutiveErrors = 0;
        } else {
          console.log('[AGENT] No action from LLM, scrolling down');
          await this.executeAction('scroll', { direction: 'down', amount: 300 });
          this.scrollsOnCurrentPage++;
        }

        // Random exploration: scroll more to explore the page (30% chance)
        if (this.scrollsOnCurrentPage < 5 && Math.random() < 0.3) {
          const direction = Math.random() < 0.7 ? 'down' : 'up';
          const amount = 200 + Math.floor(Math.random() * 400);
          console.log('[AGENT] Random exploration scroll:', direction, amount);
          await this.executeAction('scroll', { direction, amount });
          this.scrollsOnCurrentPage++;
          await this.sleep(500 + Math.random() * 1000);
        }

        // Random chance to navigate to next URL (varies based on page engagement)
        const minActionsBeforeNav = 5 + Math.floor(Math.random() * 10); // 5-15 actions before considering nav
        const navChance = this.actionsOnCurrentPage > minActionsBeforeNav ? 0.15 : 0.05;
        if (loopIteration > 5 && Math.random() < navChance) {
          console.log('[AGENT] Random navigation to next URL (actions on page:', this.actionsOnCurrentPage, ')');
          await this.navigateToNextUrl();
          this.useVisionMode = false;
          this.consecutiveFailures = 0;
          this.sameStateCount = 0;
          this.actionsOnCurrentPage = 0;
          this.scrollsOnCurrentPage = 0;
        }

        // Human-like pause with more variance
        const basePause = 800 + Math.random() * 1500;
        const extraPause = Math.random() < 0.2 ? Math.random() * 3000 : 0; // Occasional longer pause
        const pauseMs = basePause + extraPause;
        console.log('[AGENT] Pausing for', Math.round(pauseMs), 'ms');
        await this.sleep(pauseMs);

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

    // Ensure we have a valid tab
    if (!this.tabId) {
      console.log('[AGENT] No tab available, recovering...');
      await this.handleTabClosed();
    }

    try {
      if (this.tabId) {
        // Try to verify the tab still exists
        try {
          await chrome.tabs.get(this.tabId);
        } catch {
          // Tab doesn't exist, recover
          console.log('[AGENT] Tab no longer exists, recovering...');
          await this.handleTabClosed();
        }

        if (this.tabId) {
          await chrome.tabs.update(this.tabId, { url: nextUrl });
          await this.focusTab();
          await this.sleep(2000);
        }
      }
    } catch (e) {
      console.warn('[AGENT] Navigation error:', e);
      // Try to recover from navigation errors
      if (String(e).includes('No tab') || String(e).includes('cannot find')) {
        await this.handleTabClosed();
      }
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

  // Check and reset daily ad click counter
  private checkAndResetAdCounter(): void {
    const today = new Date().toISOString().split('T')[0];
    if (this.lastAdClickDate !== today) {
      this.lastAdClickDate = today;
      this.dailyAdClicks = 0;
      this.targetAdClicks = 10 + Math.floor(Math.random() * 11); // New random 10-20 target
      console.log('[AGENT] New day - ad click target:', this.targetAdClicks);
    }
  }

  // Should the agent click an ad now?
  private shouldClickAd(): boolean {
    this.checkAndResetAdCounter();
    if (this.dailyAdClicks >= this.targetAdClicks) return false;
    // Probability increases as we get further from target
    const remaining = this.targetAdClicks - this.dailyAdClicks;
    const probability = Math.min(0.3, remaining * 0.02); // Max 30% chance per page
    return Math.random() < probability;
  }

  // Record an ad click
  private recordAdClick(): void {
    this.dailyAdClicks++;
    console.log('[AGENT] Ad clicked - daily total:', this.dailyAdClicks, '/', this.targetAdClicks);
  }

  private generateTask(pageState: { url: string; title: string; elements: string }, credential: Credential | null): string {
    let task = '';

    if (this.sessionSummary) {
      task += `Previous session summary:\n${this.sessionSummary}\n\n---\n\n`;
    }

    task += `You are browsing the web autonomously. Current page: ${pageState.url}\nTitle: ${pageState.title}\n\n`;

    if (this.persona) {
      task += `Persona: ${this.persona.firstName} ${this.persona.lastName}, ${this.persona.age}yo from ${this.persona.city}, ${this.persona.country}. Interests: ${this.persona.interests.join(', ')}.\n`;
      // Include address for form filling
      if (this.persona.streetAddress) {
        task += `Address: ${this.persona.streetAddress}, ${this.persona.city}, ${this.persona.state} ${this.persona.zipCode}, ${this.persona.country}\n`;
      }
      // Include phone number for signups
      const phoneNumber = this.generatePhoneNumber();
      if (phoneNumber) {
        task += `Phone: ${phoneNumber}\n`;
      }
      task += '\n';
    }

    // If we have existing credentials for this site, use them
    if (credential) {
      task += `You have an account on this site:\n- Email: ${credential.email}\n- Password: ${credential.password}\nIf you see a login form, log in with these credentials.\n\n`;
    } else if (this.agentEmail) {
      // For signups on new sites
      const signupPassword = this.generateSignupPassword();
      task += `SIGNUP CREDENTIALS (for creating new accounts):\n`;
      task += `- Email: ${this.agentEmail}\n`;
      task += `- Password to use: ${signupPassword}\n`;
      task += `Remember: After successful signup, say "SIGNUP_COMPLETE:${signupPassword}" so the credentials are saved.\n\n`;
    }

    task += `Interactive elements on page:\n${pageState.elements.slice(0, 8000)}\n\n`;

    // Check if we should encourage ad interaction
    const shouldInteractWithAds = this.shouldClickAd();

    task += `Instructions:
- Browse naturally like a human
- Accept cookie popups immediately (click Accept/Allow/OK)
- Close any Google/Apple/Facebook login popups (press_escape or click close/X)
- Never use social login buttons - only email/password signup
- If stuck on a paywall, use 'done' to move on
- Use 'done' when finished with current site
- When filling address forms, use the persona's address data
- If a signup form asks for a phone number (NOT for verification, just as optional field), use the provided phone number
- If phone SMS verification is REQUIRED, skip the signup and use 'done'`;

    // Signup and verification instructions
    if (this.agentEmail && !credential) {
      task += `
- SIGNUP: If you see a registration/signup form and want to create an account, use the signup credentials above
- After completing signup, include "SIGNUP_COMPLETE:<password>" in your response so credentials are saved
- If email verification is needed and you see a "check your email" message or verification code input, say "NEED_EMAIL_VERIFICATION" in your response`;
    }

    if (shouldInteractWithAds) {
      task += `
- AD ENGAGEMENT: If you see any ads, sponsored content, or promotional banners that look interesting, click on them to explore
- SURVEYS: If you encounter a survey or poll, complete it with plausible opinions based on the persona's interests and demographics
- VIDEOS: If there's sponsored video content, watch it briefly (scroll to it, let it play)`;
    }

    task += `

What single action should you take next?`;

    return task;
  }

  private generateVisionTask(pageState: { url: string; title: string; elements: string }, credential: Credential | null, screenshot: string | null): string {
    let task = `VISION MODE: DOM navigation has failed multiple times. Analyze the screenshot to understand what's on the page.\n\n`;

    task += `Current page: ${pageState.url}\nTitle: ${pageState.title}\n\n`;

    if (this.persona) {
      task += `Persona: ${this.persona.firstName} ${this.persona.lastName}\n`;
      if (this.persona.streetAddress) {
        task += `Address: ${this.persona.streetAddress}, ${this.persona.city}, ${this.persona.state} ${this.persona.zipCode}\n`;
      }
      task += '\n';
    }

    if (credential) {
      task += `You have an account on this site:\n- Email: ${credential.email}\n- Password: ${credential.password}\n\n`;
    }

    task += `The screenshot shows the current page state. Based on what you see:\n`;
    task += `- If there's a cookie popup, describe where the Accept button is and use click_coordinates\n`;
    task += `- If there's a Google/Apple login overlay blocking the page, use press_escape or click X button\n`;
    task += `- If there's a paywall with no way to close it, use 'done' to move on\n`;
    task += `- If you see a login form, use click_coordinates to click the email field, then type\n`;
    task += `- IMPORTANT: If a signup form requires a phone number, ABORT and use 'done' to move on\n`;

    // Check if we should encourage ad interaction
    if (this.shouldClickAd()) {
      task += `- If you see ads or sponsored content that looks interesting, click on them\n`;
      task += `- If there's a survey or poll visible, complete it with plausible opinions\n`;
    }

    task += `\nDOM elements (may not reflect what's visible due to overlays):\n${pageState.elements.slice(0, 4000)}\n\n`;

    task += `Use click_coordinates with x,y values if element indexes don't work. What action should you take?`;

    return task;
  }

  private async getNextAction(task: string, pageState: { url: string }, screenshot: string | null): Promise<{ name: string; args: any; responseText?: string } | null> {
    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an autonomous web browser. You browse naturally like a human.
- ALWAYS accept cookies when you see a consent popup
- NEVER use Google/Apple/Facebook login - use email/password instead
- If you see a social login overlay, press Escape or find the X to close it
- If the page seems stuck or has a paywall, use 'done' to move on
- IMPORTANT: If a signup requires a phone number, ABORT immediately and use 'done' - we cannot handle phone verification
- Use click_coordinates when element indexes fail (after seeing screenshot)
- When instructed to engage with ads: click on interesting ads, sponsored posts, or promotional content
- When completing surveys: provide plausible, consistent opinions matching the persona's demographics and interests
- Watch sponsored videos briefly when encountered
- SIGNUP SIGNALS: After completing a signup, include "SIGNUP_COMPLETE:<password>" in your response
- EMAIL VERIFICATION: If you see a "check your email" message or verification code input, include "NEED_EMAIL_VERIFICATION" in your response
- VERIFICATION CODE: When you find a verification code in email, include "VERIFICATION_CODE:XXXXXX" in your response
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

        // Return action with response text for signal detection
        return { name: tc.function.name, args, responseText: response.content || '' };
      }

      // Return default scroll with response text
      return { name: 'scroll', args: { direction: 'down', amount: 300 }, responseText: response.content || '' };
    } catch (e) {
      console.error('[AGENT] LLM error:', e);
      throw e;
    }
  }

  // Parse signals from LLM response for signup/verification handling
  private parseSignals(responseText: string): {
    signupComplete?: string;
    needEmailVerification?: boolean;
    verificationCode?: string;
    verificationComplete?: boolean;
  } {
    const signals: {
      signupComplete?: string;
      needEmailVerification?: boolean;
      verificationCode?: string;
      verificationComplete?: boolean;
    } = {};

    // Check for signup completion with password
    const signupMatch = responseText.match(/SIGNUP_COMPLETE:(\S+)/);
    if (signupMatch) {
      signals.signupComplete = signupMatch[1];
    }

    // Check for email verification needed
    if (responseText.includes('NEED_EMAIL_VERIFICATION')) {
      signals.needEmailVerification = true;
    }

    // Check for verification code found
    const codeMatch = responseText.match(/VERIFICATION_CODE:(\S+)/);
    if (codeMatch) {
      signals.verificationCode = codeMatch[1];
    }

    // Check for verification complete (clicked link)
    if (responseText.includes('VERIFICATION_COMPLETE')) {
      signals.verificationComplete = true;
    }

    return signals;
  }

  // Handle returning to signup tab with verification code
  private async returnToSignupWithCode(code: string): Promise<void> {
    if (!this.pendingVerification) {
      console.log('[AGENT] No pending verification to return to');
      return;
    }

    console.log('[AGENT] Returning to signup tab with code:', code);
    this.updateState({ currentAction: `Entering verification code: ${code}` });

    try {
      // Store the verification info
      const verification = this.pendingVerification;

      // Close the email tab (current tab)
      if (this.tabId) {
        await chrome.tabs.remove(this.tabId);
      }

      // Switch back to signup tab
      this.tabId = verification.signupTabId;
      await this.focusTab();
      await this.protectWorkingTab();

      // Store the code for the agent to use in the next iteration
      // The task will include instructions to enter this code
      this.pendingVerification = {
        ...verification,
        password: code // Temporarily store code in password field
      };

      console.log('[AGENT] Switched back to signup tab, will enter code on next iteration');
    } catch (e) {
      console.error('[AGENT] Failed to return to signup tab:', e);
      this.pendingVerification = null;
    }
  }

  // Complete the verification process
  private async completeVerification(): Promise<void> {
    if (!this.pendingVerification) return;

    console.log('[AGENT] Verification completed for:', this.pendingVerification.domain);

    // Clear pending verification
    this.pendingVerification = null;

    this.updateState({ currentAction: 'Email verification completed!' });
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

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Fisher-Yates shuffle for randomized browsing
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Schedule next Bing search session (1-3 hours from now)
  private scheduleNextSearchSession(): void {
    // 1-3 hours in milliseconds
    const minHours = 1 * 60 * 60 * 1000; // 1 hour
    const maxHours = 3 * 60 * 60 * 1000; // 3 hours
    this.nextSearchInterval = minHours + Math.random() * (maxHours - minHours);
    this.searchesRemaining = 0; // Will be set when search session starts
    console.log('[AGENT] Next Bing search session in:', Math.round(this.nextSearchInterval / 60000), 'minutes');
  }

  // Check if it's time for a Bing search and perform if needed
  private async checkAndPerformBingSearch(): Promise<boolean> {
    const timeSinceLastSearch = Date.now() - this.lastSearchTime;

    // Start a new search session if interval has passed
    if (timeSinceLastSearch >= this.nextSearchInterval && this.searchesRemaining === 0) {
      // Start new session: 1-3 searches
      this.searchesRemaining = 1 + Math.floor(Math.random() * 3);
      console.log('[AGENT] Starting Bing search session:', this.searchesRemaining, 'searches planned');
    }

    // Perform a search if we have searches remaining
    if (this.searchesRemaining > 0) {
      await this.performBingSearch();
      this.searchesRemaining--;

      // If session complete, schedule next one
      if (this.searchesRemaining === 0) {
        this.lastSearchTime = Date.now();
        this.scheduleNextSearchSession();
      }
      return true;
    }

    return false;
  }

  // Generate a search query based on persona interests
  private generateSearchQuery(): string {
    if (!this.persona || this.persona.interests.length === 0) {
      const defaultQueries = [
        'trending news today',
        'popular videos',
        'interesting articles',
        'what\'s happening in the world',
        'best websites to explore'
      ];
      return defaultQueries[Math.floor(Math.random() * defaultQueries.length)];
    }

    const interest = this.persona.interests[Math.floor(Math.random() * this.persona.interests.length)];
    const queryTemplates = [
      `${interest} news`,
      `best ${interest} websites`,
      `${interest} tips and tricks`,
      `${interest} community`,
      `latest ${interest} trends`,
      `${interest} for beginners`,
      `${interest} ${this.persona.city}`,
      `popular ${interest} sites`
    ];
    return queryTemplates[Math.floor(Math.random() * queryTemplates.length)];
  }

  // Perform a Bing search with a generated query
  private async performBingSearch(): Promise<void> {
    const query = this.generateSearchQuery();
    console.log('[AGENT] Performing Bing search:', query);
    this.updateState({ currentAction: `Searching Bing: ${query}` });

    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;

    if (this.tabId) {
      await chrome.tabs.update(this.tabId, { url: searchUrl });
      this.updateState({ currentUrl: searchUrl });
      await this.focusTab();
      await this.sleep(2000);

      // Reset page counters for search results page
      this.actionsOnCurrentPage = 0;
      this.scrollsOnCurrentPage = 0;
    }
  }

  // ============================================
  // Human Behavior Simulation
  // ============================================

  // Get current hour in persona's local time
  private getLocalHour(): number {
    const now = new Date();
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    let localHour = utcHour + this.timezoneOffset;
    if (localHour < 0) localHour += 24;
    if (localHour >= 24) localHour -= 24;
    return localHour;
  }

  // Get current date string in persona's timezone
  private getLocalDateString(): string {
    const now = new Date();
    const localTime = new Date(now.getTime() + this.timezoneOffset * 60 * 60 * 1000);
    return localTime.toISOString().slice(0, 10);
  }

  // Generate a daily schedule with randomized times
  private generateDailySchedule(): void {
    const dateStr = this.getLocalDateString();

    // Don't regenerate if we already have today's schedule
    if (this.currentSchedule?.date === dateStr) {
      return;
    }

    // Sleep: starts between 10pm-midnight, lasts 6-9 hours
    const sleepStart = 22 + Math.random() * 2; // 22:00-24:00
    const sleepDuration = 6 + Math.random() * 3; // 6-9 hours
    const wakeUpHour = (sleepStart + sleepDuration) % 24;

    // Meals schedule
    const meals: MealSchedule[] = [];

    // Breakfast: 30-60 min after waking, lasts 15-30 minutes
    const breakfastStart = wakeUpHour + 0.5 + Math.random() * 0.5; // 30-60 min after wake
    const breakfastDuration = 15 + Math.floor(Math.random() * 15); // 15-30 min
    meals.push({ type: 'breakfast', hour: breakfastStart, duration: breakfastDuration });

    // Lunch: between 12pm-2pm, lasts 20-40 minutes
    const lunchStart = 12 + Math.random() * 2; // 12:00-14:00
    const lunchDuration = 20 + Math.floor(Math.random() * 20); // 20-40 min
    meals.push({ type: 'lunch', hour: lunchStart, duration: lunchDuration });

    // Dinner: between 6pm-8pm, lasts 25-50 minutes
    const dinnerStart = 18 + Math.random() * 2; // 18:00-20:00
    const dinnerDuration = 25 + Math.floor(Math.random() * 25); // 25-50 min
    meals.push({ type: 'dinner', hour: dinnerStart, duration: dinnerDuration });

    // Snacks: 0-3 random snacks throughout the day, 5-15 minutes each
    const numSnacks = Math.floor(Math.random() * 4); // 0-3 snacks
    for (let i = 0; i < numSnacks; i++) {
      // Place snacks between meals
      const snackWindows = [
        { start: breakfastStart + breakfastDuration / 60 + 1, end: lunchStart - 0.5 }, // mid-morning
        { start: lunchStart + lunchDuration / 60 + 1, end: dinnerStart - 0.5 }, // afternoon
        { start: dinnerStart + dinnerDuration / 60 + 1, end: sleepStart - 0.5 } // evening
      ];
      const window = snackWindows[i % snackWindows.length];
      if (window.end > window.start) {
        const snackHour = window.start + Math.random() * (window.end - window.start);
        const snackDuration = 5 + Math.floor(Math.random() * 10); // 5-15 min
        meals.push({ type: 'snack', hour: snackHour, duration: snackDuration });
      }
    }

    // Shower: morning (after breakfast) or evening (before sleep), lasts 10-20 minutes
    const showerMorning = Math.random() < 0.5;
    const showerStart = showerMorning
      ? breakfastStart + breakfastDuration / 60 + 0.5 + Math.random() * 0.5 // after breakfast
      : 20 + Math.random() * 1.5; // 20:00-21:30
    const showerDuration = 10 + Math.floor(Math.random() * 10); // 10-20 min

    // Random breaks: 2-5 times per day, 3-10 minutes each
    const numBreaks = 2 + Math.floor(Math.random() * 4); // 2-5 breaks
    const breaks: { hour: number; duration: number }[] = [];

    // Distribute breaks throughout waking hours
    for (let i = 0; i < numBreaks; i++) {
      const availableHours = dinnerStart - wakeUpHour;
      const breakHour = wakeUpHour + 1 + (availableHours * (i + 1)) / (numBreaks + 1) + (Math.random() - 0.5);
      const breakDuration = 3 + Math.floor(Math.random() * 8); // 3-10 min
      breaks.push({ hour: breakHour, duration: breakDuration });
    }

    this.currentSchedule = {
      date: dateStr,
      sleepStart,
      sleepDuration,
      meals,
      showerStart,
      showerDuration,
      breaks
    };

    console.log('[AGENT] Generated daily schedule:', {
      date: dateStr,
      sleep: `${Math.floor(sleepStart)}:${Math.floor((sleepStart % 1) * 60).toString().padStart(2, '0')} for ${sleepDuration.toFixed(1)}h`,
      meals: meals.map(m => `${m.type} at ${Math.floor(m.hour)}:${Math.floor((m.hour % 1) * 60).toString().padStart(2, '0')} for ${m.duration}min`),
      shower: `${Math.floor(showerStart)}:${Math.floor((showerStart % 1) * 60).toString().padStart(2, '0')} for ${showerDuration}min`,
      breaks: breaks.length
    });
  }

  // Check if currently in a scheduled pause and handle it
  private async checkAndHandlePause(): Promise<boolean> {
    // Check if we're still in the initial test browsing period
    // During test period, ignore all schedule-based pauses
    if (this.testPeriodEndTime > 0) {
      if (Date.now() < this.testPeriodEndTime) {
        // Still in test period - keep browsing regardless of schedule
        return false;
      }
      // Test period ended
      console.log('[AGENT] Test browsing period complete, now following regular schedule');
      this.testPeriodEndTime = 0;
    }

    // If we're already in a pause, check if it's over
    if (this.pauseEndTime > 0) {
      if (Date.now() < this.pauseEndTime) {
        return true; // Still paused
      }
      // Pause ended - record it
      if (this.currentActivity) {
        // Map meal subtypes to 'meal' for activity recording
        const activityType = ['breakfast', 'lunch', 'dinner', 'snack'].includes(this.currentActivity.type)
          ? 'meal'
          : this.currentActivity.type as 'sleep' | 'meal' | 'shower' | 'break';
        this.recordActivity(
          activityType,
          this.currentActivity.startTime,
          Date.now()
        );
        this.currentActivity = null;
      }
      this.pauseEndTime = 0;
      this.updateState({ status: 'running', currentAction: 'Resuming browsing...' });
      return false;
    }

    // Generate new schedule if needed (new day)
    this.generateDailySchedule();

    if (!this.currentSchedule) return false;

    const localHour = this.getLocalHour();
    const now = Date.now();

    // Check sleep time
    const sleepEnd = (this.currentSchedule.sleepStart + this.currentSchedule.sleepDuration) % 24;
    const inSleepPeriod = this.isHourInRange(localHour, this.currentSchedule.sleepStart, sleepEnd);
    if (inSleepPeriod) {
      const remainingHours = this.hoursUntilEnd(localHour, sleepEnd);
      const pauseMs = remainingHours * 60 * 60 * 1000;
      this.startPause('sleep', `Sleeping (${Math.round(remainingHours * 10) / 10}h remaining)`, pauseMs);
      return true;
    }

    // Check all meals (breakfast, lunch, dinner, snacks)
    for (const meal of this.currentSchedule.meals) {
      const mealEnd = meal.hour + meal.duration / 60;
      if (this.isHourInRange(localHour, meal.hour, mealEnd)) {
        const remainingMin = (mealEnd - localHour) * 60;
        const pauseMs = remainingMin * 60 * 1000;
        const mealLabels: Record<string, string> = {
          'breakfast': 'Having breakfast',
          'lunch': 'Having lunch',
          'dinner': 'Having dinner',
          'snack': 'Having a snack'
        };
        const label = mealLabels[meal.type] || 'Eating';
        // Store the specific meal type (breakfast, lunch, etc.) for proper display
        this.startPause(meal.type, `${label} (${Math.round(remainingMin)}min remaining)`, pauseMs);
        return true;
      }
    }

    // Check shower time
    const showerEnd = this.currentSchedule.showerStart + this.currentSchedule.showerDuration / 60;
    if (this.isHourInRange(localHour, this.currentSchedule.showerStart, showerEnd)) {
      const remainingMin = (showerEnd - localHour) * 60;
      const pauseMs = remainingMin * 60 * 1000;
      this.startPause('shower', `Taking a shower (${Math.round(remainingMin)}min remaining)`, pauseMs);
      return true;
    }

    // Check random breaks
    for (const brk of this.currentSchedule.breaks) {
      const breakEnd = brk.hour + brk.duration / 60;
      if (this.isHourInRange(localHour, brk.hour, breakEnd)) {
        const remainingMin = (breakEnd - localHour) * 60;
        const pauseMs = remainingMin * 60 * 1000;
        this.startPause('break', `Taking a break (${Math.round(remainingMin)}min remaining)`, pauseMs);
        return true;
      }
    }

    return false;
  }

  // Helper: check if hour is within a range (handles overnight)
  private isHourInRange(hour: number, start: number, end: number): boolean {
    if (end > start) {
      return hour >= start && hour < end;
    } else {
      // Overnight period (e.g., 22:00 to 07:00)
      return hour >= start || hour < end;
    }
  }

  // Helper: calculate hours until end time
  private hoursUntilEnd(currentHour: number, endHour: number): number {
    if (endHour > currentHour) {
      return endHour - currentHour;
    } else {
      return (24 - currentHour) + endHour;
    }
  }

  // Start a pause period
  private startPause(type: string, message: string, durationMs: number): void {
    console.log('[AGENT] Starting pause:', type, '- Duration:', Math.round(durationMs / 60000), 'min');
    this.pauseEndTime = Date.now() + durationMs;
    this.currentActivity = { type, startTime: Date.now() };
    this.updateState({ status: 'paused', currentAction: message });
  }

  // Record an activity to history
  private recordActivity(type: 'sleep' | 'meal' | 'shower' | 'break' | 'browsing', startTime: number, endTime: number): void {
    const duration = Math.round((endTime - startTime) / 60000); // minutes
    this.activityHistory.push({
      type,
      startTime,
      endTime,
      duration
    });
    console.log('[AGENT] Recorded activity:', type, '- Duration:', duration, 'min');
  }

  // Clean up activity history older than 2 days
  private cleanupOldActivityHistory(): void {
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
    this.activityHistory = this.activityHistory.filter(a => a.endTime > twoDaysAgo);
    console.log('[AGENT] Activity history:', this.activityHistory.length, 'records');
  }

  // Format activity history for context
  private formatActivityHistory(): string {
    if (this.activityHistory.length === 0) {
      return 'No recorded activities in the last 2 days.';
    }

    const lines: string[] = ['Activity history (last 2 days):'];

    // Group by date
    const byDate: Record<string, ActivityRecord[]> = {};
    for (const activity of this.activityHistory) {
      const date = new Date(activity.startTime).toLocaleDateString();
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(activity);
    }

    for (const [date, activities] of Object.entries(byDate)) {
      lines.push(`\n${date}:`);
      for (const act of activities) {
        const startTime = new Date(act.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endTime = new Date(act.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        lines.push(`  - ${act.type}: ${startTime} - ${endTime} (${act.duration} min)`);
      }
    }

    return lines.join('\n');
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

    // Clean up old activity history before compaction
    this.cleanupOldActivityHistory();

    // Include activity history in the summary
    const activityHistoryText = this.formatActivityHistory();

    const summaryMessages: LLMMessage[] = [
      {
        role: 'system',
        content: 'Summarize the browsing session concisely: sites visited, actions taken, logins performed, errors encountered. Also include a brief summary of the persona\'s daily activity patterns from the history. Keep under 600 words.'
      },
      {
        role: 'user',
        content: `Summarize this session:\n\nPrevious summary: ${this.sessionSummary || 'None'}\n\n${activityHistoryText}\n\nRecent browsing:\n${this.conversationHistory.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n')}`
      }
    ];

    try {
      const response = await this.llm.chat(summaryMessages, this.model, undefined, 0.3);
      this.sessionSummary = response.content || this.sessionSummary;
    } catch (e) {
      // Fallback: include activity history in a simpler format
      this.sessionSummary = `${activityHistoryText}\n\nRecent: ${this.conversationHistory.slice(-3).map(m => m.content.slice(0, 100)).join(' | ')}`;
    }

    this.conversationHistory = [];
    this.totalTokensEstimate = this.estimateTokens(this.sessionSummary);
    console.log('[AGENT] Context compacted with activity history');
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
