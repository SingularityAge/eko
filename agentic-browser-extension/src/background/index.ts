// ============================================
// Background Service Worker - Extension Core
// ============================================

import { getAgent, AutonomousBrowserAgent } from '../services/agent';
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

// Listen for state changes from agent
agent.setStateCallback((state) => {
  currentState = state;
  broadcastState();
});

// Broadcast state to all extension UIs
function broadcastState(): void {
  const message = { type: 'STATE_UPDATE', payload: currentState };

  // Send to sidebar/popup
  chrome.runtime.sendMessage(message).catch(() => {
    // No listeners, that's OK
  });
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

        default:
          sendResponse({ error: `Unknown message type: ${type}` });
      }
    } catch (error) {
      console.error('[BG] Error:', error);
      sendResponse({ error: error instanceof Error ? error.message : String(error) });
    }
  })();

  return true; // Keep channel open
});

// Handle extension icon click
chrome.action.onClicked.addListener(() => {
  // Open sidebar
  chrome.sidePanel.open({ windowId: undefined as any });
});

// Set up side panel
chrome.sidePanel.setOptions({
  path: 'sidebar.html',
  enabled: true
});

// Log startup
console.log('[AUTOBROWSER] Background service worker started');
logActivity({ type: 'navigation', details: 'Extension started' });
