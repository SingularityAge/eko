// ============================================
// Background Service Worker - Extension Core
// ============================================

import { getAgent } from '../services/agent';
import { getSettings, saveSettings, getCredentials, getActivities, logActivity } from '../services/storage';
import { BrowserState } from '../shared/types';

// Agent instance
const agent = getAgent();

// Current state for UI
let currentState: BrowserState = {
  status: 'idle',
  currentUrl: '',
  currentAction: 'Ready',
  totalActions: 0,
  errors: 0
};

// Tab management - track tabs opened by the agent
const agentTabs: Map<number, { openedAt: number; closeAfter: number }> = new Map();

// Listen for state changes from agent
agent.setStateCallback((state) => {
  currentState = state;
  broadcastState();
});

// Broadcast state to all extension UIs
function broadcastState(): void {
  const message = { type: 'STATE_UPDATE', payload: currentState };
  chrome.runtime.sendMessage(message).catch(() => {});
}

// Fetch multimodal models from OpenRouter
async function fetchOpenRouterModels(apiKey: string): Promise<any[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'chrome-extension://autobrowser'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    const models = data.data || [];

    // Filter for multimodal models (support images)
    const multimodal = models.filter((m: any) => {
      const modalities = m.architecture?.modality || '';
      const supportsImages = modalities.includes('image') ||
                            m.id.includes('vision') ||
                            m.id.includes('4o') ||
                            m.id.includes('gemini') ||
                            m.id.includes('claude-3') ||
                            m.id.includes('pixtral') ||
                            m.id.includes('llava');
      return supportsImages;
    });

    // Sort by provider alphabetically
    multimodal.sort((a: any, b: any) => {
      const providerA = a.id.split('/')[0].toLowerCase();
      const providerB = b.id.split('/')[0].toLowerCase();
      if (providerA !== providerB) {
        return providerA.localeCompare(providerB);
      }
      return a.id.localeCompare(b.id);
    });

    console.log('[BG] Found', multimodal.length, 'multimodal models');
    return multimodal;
  } catch (error) {
    console.error('[BG] Error fetching models:', error);
    return [];
  }
}

// Tab cleanup - close abandoned tabs
function scheduleTabCleanup(tabId: number): void {
  // Random delay between 10 seconds and 3 minutes
  const delay = 10000 + Math.random() * 170000;
  agentTabs.set(tabId, { openedAt: Date.now(), closeAfter: delay });

  setTimeout(() => {
    const tabInfo = agentTabs.get(tabId);
    if (tabInfo && Date.now() - tabInfo.openedAt >= tabInfo.closeAfter) {
      chrome.tabs.remove(tabId).catch(() => {});
      agentTabs.delete(tabId);
      console.log('[BG] Closed abandoned tab:', tabId);
    }
  }, delay);
}

// Keep active tab in focus
async function focusTab(tabId: number): Promise<void> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.windowId) {
      await chrome.windows.update(tab.windowId, { focused: true });
    }
    await chrome.tabs.update(tabId, { active: true });
  } catch (e) {
    console.warn('[BG] Failed to focus tab:', e);
  }
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const { type, payload } = message;
      console.log('[BG] Message:', type);

      switch (type) {
        case 'GET_STATE':
          const settings = await getSettings();
          sendResponse({
            state: currentState,
            hasApiKey: !!settings.openRouterApiKey,
            hasPersona: !!settings.persona
          });
          break;

        case 'START':
          agent.start();
          sendResponse({ ok: true });
          break;

        case 'STOP':
          agent.stop();
          sendResponse({ ok: true });
          break;

        case 'PAUSE':
          agent.pause();
          sendResponse({ ok: true });
          break;

        case 'RESUME':
          agent.resume();
          sendResponse({ ok: true });
          break;

        case 'GET_SETTINGS':
          const currentSettings = await getSettings();
          sendResponse(currentSettings);
          break;

        case 'SAVE_SETTINGS':
          await saveSettings(payload);
          sendResponse({ ok: true });
          break;

        case 'GET_CREDENTIALS':
          const creds = await getCredentials();
          sendResponse(creds);
          break;

        case 'GET_ACTIVITIES':
          const activities = await getActivities(payload?.limit || 50);
          sendResponse(activities);
          break;

        case 'FETCH_MODELS':
          const models = await fetchOpenRouterModels(payload.apiKey);
          sendResponse({ models });
          break;

        case 'TRACK_TAB':
          scheduleTabCleanup(payload.tabId);
          sendResponse({ ok: true });
          break;

        case 'FOCUS_TAB':
          await focusTab(payload.tabId);
          sendResponse({ ok: true });
          break;

        case 'TAKE_SCREENSHOT':
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
            sendResponse({ screenshot: dataUrl });
          } catch (e) {
            sendResponse({ error: 'Failed to capture screenshot' });
          }
          break;

        default:
          sendResponse({ error: `Unknown message type: ${type}` });
      }
    } catch (error) {
      console.error('[BG] Error:', error);
      sendResponse({ error: error instanceof Error ? error.message : String(error) });
    }
  })();

  return true;
});

// Handle extension icon click - open sidebar
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Open side panel for this tab's window
    if (tab.windowId) {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    }
  } catch (e) {
    console.error('[BG] Failed to open sidebar:', e);
  }
});

// Set up side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Log startup
console.log('[AUTOBROWSER] Background service worker started');
logActivity({ type: 'navigation', details: 'Extension started' });
