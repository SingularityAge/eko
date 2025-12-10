// ============================================
// Background Service Worker
// Main orchestrator for the agentic browser extension
// ============================================

import { initOpenRouterService, OpenRouterService } from '../services/openrouter';
import { PersonaEngine, getPersonaEngine } from '../services/persona-engine';
import { BrowsingAgent } from '../agents/browsing-agent';
import { SearchAgent } from '../agents/search-agent';
import { SocialAgent } from '../agents/social-agent';
import { EmailAgent } from '../agents/email-agent';
import {
  ExtensionMessage,
  ExtensionSettings,
  AgentState,
  Activity,
  PersonaProfile,
  STORAGE_KEYS,
  DEFAULT_MODELS
} from '../shared/types';

// Global state
let settings: ExtensionSettings | null = null;
let llmService: OpenRouterService | null = null;
let personaEngine: PersonaEngine | null = null;

// Agents
let browsingAgent: BrowsingAgent | null = null;
let searchAgent: SearchAgent | null = null;
let socialAgent: SocialAgent | null = null;
let emailAgent: EmailAgent | null = null;

// Activity log
const activities: Activity[] = [];
const MAX_ACTIVITIES = 1000;

// Manual override - when user manually starts an agent, bypass schedule for 5 minutes
let manualOverrideUntil: number = 0;
const MANUAL_OVERRIDE_DURATION = 5 * 60 * 1000; // 5 minutes

function setManualOverride(): void {
  manualOverrideUntil = Date.now() + MANUAL_OVERRIDE_DURATION;
  console.log('Manual override activated for 5 minutes');
}

function isManualOverrideActive(): boolean {
  return Date.now() < manualOverrideUntil;
}

// Initialization
async function initialize(): Promise<void> {
  console.log('Initializing Agentic Browser Extension...');

  // Load settings
  await loadSettings();

  // Initialize services if API key is set
  if (settings?.openRouterApiKey) {
    initializeServices();
  }

  console.log('Agentic Browser Extension initialized');
}

// Load settings from storage
async function loadSettings(): Promise<void> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.ACTIVITIES]);

  if (result[STORAGE_KEYS.SETTINGS]) {
    settings = result[STORAGE_KEYS.SETTINGS];
  } else {
    // Default settings
    settings = {
      openRouterApiKey: '',
      models: { ...DEFAULT_MODELS },
      persona: createDefaultPersona(),
      autoStart: false,
      maxConcurrentAgents: 2,
      debugMode: false,
      humanization: {
        enabled: true,
        typoRate: 0.02,
        thinkingPauses: true,
        naturalScrolling: true,
        mouseJitter: true
      }
    };
  }

  // Load activities
  if (result[STORAGE_KEYS.ACTIVITIES]) {
    activities.push(...result[STORAGE_KEYS.ACTIVITIES]);
  }
}

// Save settings to storage
async function saveSettings(): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: settings
  });
}

// Save activities to storage
async function saveActivities(): Promise<void> {
  // Keep only recent activities
  const recentActivities = activities.slice(-MAX_ACTIVITIES);
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACTIVITIES]: recentActivities
  });
}

// Create default persona
function createDefaultPersona(): PersonaProfile {
  const engine = getPersonaEngine();
  return engine.generatePersona();
}

// Tool executor for agents running in background context
// This allows agents to execute tools directly without message passing
async function backgroundToolExecutor(
  tool: string,
  args: Record<string, any>,
  tabId?: number
): Promise<any> {
  const targetTabId = tabId || (await getActiveTabId());
  if (!targetTabId) {
    throw new Error('No target tab for tool execution');
  }

  // Special handling for navigation
  if (tool === 'navigate_to') {
    const url = normalizeUrl(args.url);
    await chrome.tabs.update(targetTabId, { url });
    await waitForNavigation(targetTabId);
    // Give page time to load and content script to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Ensure content script is injected
    await ensureContentScript(targetTabId);
    return { result: `Navigated to ${url}` };
  }

  // Special handling for screenshot
  if (tool === 'take_screenshot') {
    return takeScreenshot(targetTabId);
  }

  // Special handling for complete tool
  if (tool === 'complete') {
    return { result: args.summary || 'Task completed' };
  }

  // Special handling for wait
  if (tool === 'wait') {
    await new Promise(resolve => setTimeout(resolve, (args.seconds || 1) * 1000));
    return { result: `Waited ${args.seconds || 1} seconds` };
  }

  // Ensure content script is loaded before sending tool
  await ensureContentScript(targetTabId);

  // Send to content script
  try {
    const response = await chrome.tabs.sendMessage(targetTabId, {
      type: 'EXECUTE_TOOL',
      payload: { tool, args, tabId: targetTabId }
    });
    return response;
  } catch (error) {
    // Content script might not be loaded - try injecting and retry
    console.error('Tool execution error, retrying after injection:', error);
    await ensureContentScript(targetTabId, true);
    try {
      const response = await chrome.tabs.sendMessage(targetTabId, {
        type: 'EXECUTE_TOOL',
        payload: { tool, args, tabId: targetTabId }
      });
      return response;
    } catch (retryError) {
      return { result: `Tool ${tool} failed: content script unavailable`, error: String(retryError) };
    }
  }
}

// Ensure content script is injected in the tab
async function ensureContentScript(tabId: number, forceInject: boolean = false): Promise<void> {
  try {
    // Check if content script is already loaded by trying to ping it
    if (!forceInject) {
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        return; // Content script is loaded
      } catch {
        // Content script not loaded, inject it
      }
    }

    // Inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    // Wait for script to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    // Might fail on chrome:// pages or other restricted pages
    console.warn('Could not inject content script:', error);
  }
}

// Initialize LLM service and agents
function initializeServices(): void {
  if (!settings?.openRouterApiKey) return;

  // Initialize LLM service
  llmService = initOpenRouterService(
    settings.openRouterApiKey,
    settings.models.browsing
  );

  // Initialize persona engine
  personaEngine = getPersonaEngine();
  if (settings.persona) {
    personaEngine.setPersona(settings.persona);
  }

  // Initialize agents
  browsingAgent = new BrowsingAgent(llmService, settings.models.browsing, personaEngine);
  searchAgent = new SearchAgent(llmService, settings.models.browsing, settings.models.search);
  socialAgent = new SocialAgent(llmService, settings.models.social, personaEngine);
  emailAgent = new EmailAgent(llmService, settings.models.email);

  // Set tool executor for all agents (enables direct tool execution in background)
  browsingAgent.setToolExecutor(backgroundToolExecutor);
  searchAgent.setToolExecutor(backgroundToolExecutor);
  socialAgent.setToolExecutor(backgroundToolExecutor);
  emailAgent.setToolExecutor(backgroundToolExecutor);

  // Set email config if available
  if (settings.persona?.email) {
    emailAgent.setEmailConfig(settings.persona.email);
  }

  // Set social credentials if available
  if (settings.persona?.socialMedia?.platforms) {
    for (const platform of settings.persona.socialMedia.platforms) {
      if (platform.username && platform.password) {
        socialAgent.setCredentials(platform.name, platform.username, platform.password);
      }
    }
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(result => sendResponse(result))
    .catch(error => sendResponse({ error: error.message }));

  return true;
});

// Handle messages from content scripts and UI
async function handleMessage(message: ExtensionMessage, sender: chrome.runtime.MessageSender): Promise<any> {
  const tabId = sender.tab?.id || message.tabId;

  switch (message.type) {
    case 'GET_STATE':
      return getState();

    case 'SET_STATE':
      return setState(message.payload);

    case 'UPDATE_SETTINGS':
      return updateSettings(message.payload);

    case 'START_AGENT':
      return startAgent(message.payload.agentType, message.payload.task, tabId);

    case 'STOP_AGENT':
      return stopAgent(message.payload.agentType);

    case 'PAUSE_AGENT':
      return pauseAgent(message.payload.agentType);

    case 'RESUME_AGENT':
      return resumeAgent(message.payload.agentType);

    case 'EXECUTE_TASK':
      return executeTask(message.payload.task, tabId);

    case 'EXECUTE_TOOL':
      return executeToolOnTab(message.payload, tabId);

    case 'GET_ACTIVITIES':
      return getActivities(message.payload?.limit);

    case 'ACTIVITY_LOG':
      return logActivity(message.payload);

    case 'TAKE_SCREENSHOT':
      return takeScreenshot(tabId);

    case 'NAVIGATE_TO':
      return navigateTo(message.payload.url, tabId);

    case 'DO_NAVIGATE':
      // Handle navigation from content script with proper URL normalization
      return doNavigate(message.payload.url, tabId);

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// Get current state
function getState(): any {
  return {
    settings,
    agents: {
      browsing: browsingAgent?.getState() || null,
      search: searchAgent?.getState() || null,
      social: socialAgent?.getState() || null,
      email: emailAgent?.getState() || null
    },
    persona: personaEngine?.getPersona() || null,
    isInitialized: !!llmService
  };
}

// Set state (partial update)
async function setState(payload: any): Promise<void> {
  if (payload.settings) {
    settings = { ...settings, ...payload.settings } as ExtensionSettings;
    await saveSettings();
    initializeServices();
  }

  if (payload.persona && personaEngine) {
    personaEngine.setPersona(payload.persona);
    if (settings) {
      settings.persona = payload.persona;
      await saveSettings();
    }
  }
}

// Update settings
async function updateSettings(newSettings: Partial<ExtensionSettings>): Promise<void> {
  settings = { ...settings, ...newSettings } as ExtensionSettings;
  await saveSettings();

  // Re-initialize services if API key changed
  if (newSettings.openRouterApiKey !== undefined) {
    initializeServices();
  }

  // Update content script settings
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'UPDATE_SETTINGS',
        payload: settings
      }).catch(() => {
        // Tab might not have content script
      });
    }
  }
}

// Start an agent
async function startAgent(
  agentType: string,
  task?: string,
  tabId?: number
): Promise<any> {
  if (!llmService) {
    throw new Error('Services not initialized. Please set your OpenRouter API key.');
  }

  // Activate manual override when user explicitly starts an agent
  // This allows at least 5 minutes of activity before schedule restrictions kick in
  setManualOverride();

  // Check if persona can be active (not sleeping or on break)
  // Skip this check if manual override is active
  if (personaEngine && !isManualOverrideActive()) {
    if (!personaEngine.canBeActive()) {
      const nextAvailable = personaEngine.getNextAvailableTime();
      const waitMinutes = Math.ceil((nextAvailable - Date.now()) / 60000);

      if (personaEngine.isSleeping()) {
        throw new Error(`Persona is sleeping. Will be available in ${waitMinutes} minutes.`);
      }
      if (personaEngine.isOnBreak()) {
        throw new Error(`Persona is on a break. Will be available in ${waitMinutes} minutes.`);
      }
      if (!personaEngine.isAwake()) {
        throw new Error(`Persona is outside active hours. Will be available at wake time.`);
      }
    }
  }

  const activeTabId = tabId || (await getActiveTabId());
  if (!activeTabId) {
    throw new Error('No active tab found');
  }

  // Ensure content script is loaded before getting page state
  await ensureContentScript(activeTabId);

  // Get page state
  const pageState = await getPageState(activeTabId);

  let agent: any;
  switch (agentType) {
    case 'browsing':
      agent = browsingAgent;
      break;
    case 'search':
      agent = searchAgent;
      break;
    case 'social':
      agent = socialAgent;
      break;
    case 'email':
      agent = emailAgent;
      break;
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }

  if (!agent) {
    throw new Error(`Agent ${agentType} not initialized`);
  }

  // Set context
  agent.setContext({
    tabId: activeTabId,
    url: pageState.url,
    pageContent: pageState.content,
    domTree: pageState.domTree
  });

  // Run agent with error handling
  if (task) {
    console.log(`Starting ${agentType} agent with task: ${task}`);
    console.log(`Page context: URL=${pageState.url}, content length=${pageState.content?.length || 0}, DOM elements=${pageState.domTree?.length || 0}`);

    try {
      const result = await agent.run(task, (update: any) => {
        console.log(`Agent ${agentType} update:`, update.type, update.data?.content?.slice(0, 100) || '');
        // Broadcast updates to sidebar
        broadcastUpdate({
          type: 'AGENT_UPDATE',
          payload: {
            agentType,
            ...update
          }
        });
      });

      console.log(`Agent ${agentType} completed:`, result?.slice(0, 200) || 'no result');
      return result;
    } catch (error) {
      console.error(`Agent ${agentType} failed:`, error);
      broadcastUpdate({
        type: 'AGENT_UPDATE',
        payload: {
          agentType,
          type: 'error',
          data: { error: error instanceof Error ? error.message : String(error) }
        }
      });
      throw error;
    }
  }

  return { status: 'Agent started', state: agent.getState() };
}

// Stop an agent
function stopAgent(agentType: string): void {
  const agent = getAgent(agentType);
  if (agent) {
    agent.stop();
  }
}

// Pause an agent
function pauseAgent(agentType: string): void {
  const agent = getAgent(agentType);
  if (agent) {
    agent.pause();
  }
}

// Resume an agent
function resumeAgent(agentType: string): void {
  const agent = getAgent(agentType);
  if (agent) {
    agent.resume();
  }
}

// Get agent by type
function getAgent(agentType: string): any {
  switch (agentType) {
    case 'browsing':
      return browsingAgent;
    case 'search':
      return searchAgent;
    case 'social':
      return socialAgent;
    case 'email':
      return emailAgent;
    default:
      return null;
  }
}

// Execute a task (auto-select agent)
async function executeTask(task: string, tabId?: number): Promise<any> {
  // Analyze task to determine best agent
  const taskLower = task.toLowerCase();

  let agentType = 'browsing';

  if (taskLower.includes('search') || taskLower.includes('find') || taskLower.includes('research')) {
    agentType = 'search';
  } else if (taskLower.includes('email') || taskLower.includes('mail') || taskLower.includes('inbox')) {
    agentType = 'email';
  } else if (
    taskLower.includes('instagram') ||
    taskLower.includes('twitter') ||
    taskLower.includes('facebook') ||
    taskLower.includes('social') ||
    taskLower.includes('tiktok') ||
    taskLower.includes('reddit')
  ) {
    agentType = 'social';
  }

  return startAgent(agentType, task, tabId);
}

// Execute tool on a specific tab
async function executeToolOnTab(
  payload: { tool: string; args: Record<string, any>; tabId?: number },
  tabId?: number
): Promise<any> {
  const targetTabId = payload.tabId || tabId || (await getActiveTabId());
  if (!targetTabId) {
    throw new Error('No target tab');
  }

  // Special handling for navigation
  if (payload.tool === 'navigate_to') {
    await chrome.tabs.update(targetTabId, { url: payload.args.url });
    await waitForNavigation(targetTabId);
    return { result: `Navigated to ${payload.args.url}` };
  }

  // Special handling for screenshot
  if (payload.tool === 'take_screenshot') {
    return takeScreenshot(targetTabId);
  }

  // Send to content script
  const response = await chrome.tabs.sendMessage(targetTabId, {
    type: 'EXECUTE_TOOL',
    payload
  });

  return response;
}

// Get page state from tab
async function getPageState(tabId: number): Promise<any> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: 'GET_PAGE_STATE'
    });

    const domResponse = await chrome.tabs.sendMessage(tabId, {
      type: 'EXTRACT_PAGE_CONTENT'
    });

    return {
      url: response.url,
      title: response.title,
      domain: response.domain,
      content: domResponse,
      domTree: response.elements?.map((e: any) =>
        `[${e.index}]:<${e.tagName}>${e.text}</${e.tagName}>`
      ).join('\n')
    };
  } catch (error) {
    // Content script might not be loaded
    const tab = await chrome.tabs.get(tabId);
    return {
      url: tab.url,
      title: tab.title,
      domain: new URL(tab.url || '').hostname,
      content: '',
      domTree: ''
    };
  }
}

// Get active tab ID
async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

// Wait for navigation to complete
function waitForNavigation(tabId: number, timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.webNavigation.onCompleted.removeListener(listener);
      reject(new Error('Navigation timeout'));
    }, timeout);

    const listener = (details: chrome.webNavigation.WebNavigationFramedCallbackDetails) => {
      if (details.tabId === tabId && details.frameId === 0) {
        clearTimeout(timer);
        chrome.webNavigation.onCompleted.removeListener(listener);
        setTimeout(resolve, 500); // Extra wait for page to stabilize
      }
    };

    chrome.webNavigation.onCompleted.addListener(listener);
  });
}

// Normalize URL (add https:// if missing)
function normalizeUrl(url: string): string {
  if (!url) return url;

  // Already has protocol
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Handle protocol-relative URLs
  if (url.startsWith('//')) {
    return 'https:' + url;
  }

  // Handle javascript: and other special protocols
  if (url.includes(':') && !url.includes('.')) {
    return url;
  }

  // Add https:// by default
  return 'https://' + url;
}

// Navigate to URL
async function navigateTo(url: string, tabId?: number): Promise<void> {
  const normalizedUrl = normalizeUrl(url);
  const targetTabId = tabId || (await getActiveTabId());
  if (!targetTabId) {
    // Open in new tab
    await chrome.tabs.create({ url: normalizedUrl });
  } else {
    await chrome.tabs.update(targetTabId, { url: normalizedUrl });
  }
}

// Handle navigation from content script
async function doNavigate(url: string, tabId?: number): Promise<{ result: string }> {
  const normalizedUrl = normalizeUrl(url);
  const targetTabId = tabId || (await getActiveTabId());

  if (targetTabId) {
    await chrome.tabs.update(targetTabId, { url: normalizedUrl });
    return { result: `Navigating to ${normalizedUrl}` };
  } else {
    await chrome.tabs.create({ url: normalizedUrl });
    return { result: `Opening ${normalizedUrl} in new tab` };
  }
}

// Take screenshot
async function takeScreenshot(tabId?: number): Promise<string> {
  const targetTabId = tabId || (await getActiveTabId());

  if (!targetTabId) {
    throw new Error('No tab to screenshot');
  }

  // Make sure the tab is active
  await chrome.tabs.update(targetTabId, { active: true });

  // Get the current window
  const tab = await chrome.tabs.get(targetTabId);
  const windowId = tab.windowId;

  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
    format: 'png'
  });

  return dataUrl;
}

// Log activity
async function logActivity(activity: Partial<Activity>): Promise<void> {
  const fullActivity: Activity = {
    id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: activity.type || 'page_visit',
    timestamp: Date.now(),
    details: {},
    ...activity
  };

  activities.push(fullActivity);

  // Trim old activities
  while (activities.length > MAX_ACTIVITIES) {
    activities.shift();
  }

  // Save periodically (every 10 activities)
  if (activities.length % 10 === 0) {
    await saveActivities();
  }

  // Broadcast to sidebar
  broadcastUpdate({
    type: 'ACTIVITY_LOG',
    payload: fullActivity
  });
}

// Get activities
function getActivities(limit?: number): Activity[] {
  const count = limit || 100;
  return activities.slice(-count);
}

// Broadcast update to all extension pages
async function broadcastUpdate(message: any): Promise<void> {
  // Send to sidebar/popup
  chrome.runtime.sendMessage(message).catch(() => {
    // No listeners
  });
}

// Alarm handler for periodic tasks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'email_check' && emailAgent && settings?.persona?.email?.autoCheck) {
    if (emailAgent.shouldCheck()) {
      try {
        await startAgent('email', 'Check inbox for new emails');
      } catch (error) {
        console.error('Email check failed:', error);
      }
    }
  }

  if (alarm.name === 'activity_save') {
    await saveActivities();
  }
});

// Set up alarms
chrome.alarms.create('email_check', { periodInMinutes: 30 });
chrome.alarms.create('activity_save', { periodInMinutes: 5 });

// Initialize on load
initialize();

// Handle extension install/update
chrome.runtime.onInstalled.addListener(async (details) => {
  // Enable side panel for all pages and open on action click
  try {
    await chrome.sidePanel.setOptions({
      enabled: true
    });
    // Open sidebar directly when clicking extension icon (no popup)
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.error('Failed to setup side panel:', error);
  }

  if (details.reason === 'install') {
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Also set panel behavior on startup (in case extension was already installed)
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

console.log('Background service worker loaded');
