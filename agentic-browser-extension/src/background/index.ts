// ============================================
// Background Service Worker - Extension Core
// ============================================

import { getAgent } from '../services/agent';
import { getSettings, saveSettings, getCredentials, getActivities, logActivity } from '../services/storage';
import { getOpenRouter } from '../services/openrouter';
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
let currentMaxTabs: number = 1 + Math.floor(Math.random() * 5); // Random 1-5 tabs max
let workingTabId: number | null = null; // The agent's primary working tab - NEVER close this

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

// Tab cleanup - close abandoned tabs and enforce max tab limit
function scheduleTabCleanup(tabId: number): void {
  // NEVER schedule cleanup for the working tab
  if (tabId === workingTabId) {
    console.log('[BG] Skipping cleanup schedule for working tab:', tabId);
    return;
  }

  // Random delay between 1-5 minutes (60000ms - 300000ms)
  const delay = 60000 + Math.random() * 240000;
  agentTabs.set(tabId, { openedAt: Date.now(), closeAfter: delay });

  // Check if we exceed max tabs - close oldest ones
  enforceMaxTabs();

  setTimeout(() => {
    // Double-check it's not the working tab before closing
    if (tabId === workingTabId) {
      console.log('[BG] Skipping close for working tab:', tabId);
      return;
    }
    const tabInfo = agentTabs.get(tabId);
    if (tabInfo && Date.now() - tabInfo.openedAt >= tabInfo.closeAfter) {
      chrome.tabs.remove(tabId).catch(() => {});
      agentTabs.delete(tabId);
      console.log('[BG] Closed abandoned tab after timeout:', tabId);
      // Randomize max tabs for next cycle
      currentMaxTabs = 1 + Math.floor(Math.random() * 5);
    }
  }, delay);
}

// Enforce maximum tab limit - close oldest tabs if over limit
function enforceMaxTabs(): void {
  if (agentTabs.size <= currentMaxTabs) return;

  // Sort tabs by openedAt time (oldest first), excluding the working tab
  const sortedTabs = Array.from(agentTabs.entries())
    .filter(([tabId]) => tabId !== workingTabId) // Never close working tab
    .sort((a, b) => a[1].openedAt - b[1].openedAt);

  // Close oldest tabs until we're within limit
  const tabsToClose = sortedTabs.slice(0, Math.max(0, agentTabs.size - currentMaxTabs));

  for (const [tabId] of tabsToClose) {
    chrome.tabs.remove(tabId).catch(() => {});
    agentTabs.delete(tabId);
    console.log('[BG] Closed tab to enforce limit:', tabId, '(max:', currentMaxTabs, ')');
  }
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

        case 'SET_WORKING_TAB':
          workingTabId = payload.tabId;
          // Remove from cleanup tracking if it was added
          if (agentTabs.has(payload.tabId)) {
            agentTabs.delete(payload.tabId);
          }
          console.log('[BG] Working tab set to:', workingTabId);
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

        case 'AUTOCOMPLETE_CITY':
          try {
            const citySettings = await getSettings();
            if (!citySettings.openRouterApiKey) {
              sendResponse({ cities: [] });
              break;
            }
            const llm = getOpenRouter(citySettings.openRouterApiKey);
            const cityResponse = await llm.chat([
              { role: 'system', content: 'You are a geography assistant. Return ONLY a JSON array of city names, nothing else.' },
              { role: 'user', content: `List up to 5 cities in ${payload.country} that start with or contain "${payload.query}". Return ONLY a JSON array like ["City1", "City2"]. If no matches, return [].` }
            ], citySettings.model || 'anthropic/claude-sonnet-4', undefined, 0.3);

            const cityMatch = (cityResponse.content || '').match(/\[[\s\S]*?\]/);
            const cities = cityMatch ? JSON.parse(cityMatch[0]) : [];
            sendResponse({ cities: cities.slice(0, 5) });
          } catch (e) {
            console.error('[BG] City autocomplete error:', e);
            sendResponse({ cities: [] });
          }
          break;

        case 'GENERATE_PERSONA':
          try {
            const personaSettings = await getSettings();
            if (!personaSettings.openRouterApiKey) {
              sendResponse({ error: 'No API key' });
              break;
            }
            const llm = getOpenRouter(personaSettings.openRouterApiKey);

            const personaResponse = await llm.chat([
              { role: 'system', content: 'Generate a realistic persona for web browsing. Return ONLY valid JSON, no markdown or explanation.' },
              { role: 'user', content: `Create a realistic persona living in ${payload.city}, ${payload.country}. The persona should feel authentic to this location without being a stereotype.

Return ONLY this JSON structure:
{
  "firstName": "local first name",
  "lastName": "local last name",
  "age": number between 18-55,
  "country": "${payload.country}",
  "city": "${payload.city}",
  "occupation": "realistic job or student",
  "interests": ["interest1", "interest2", "interest3", "interest4", "interest5"]
}

Make interests specific and varied (e.g., "urban photography", "indie music", "sustainable fashion", "board games", "hiking"). Return ONLY the JSON.` }
            ], personaSettings.model || 'anthropic/claude-sonnet-4', undefined, 0.9);

            const personaMatch = (personaResponse.content || '').match(/\{[\s\S]*\}/);
            if (personaMatch) {
              const persona = JSON.parse(personaMatch[0]);
              persona.country = payload.country;
              persona.city = payload.city;

              // Also trigger URL discovery with Perplexity
              console.log('[BG] Persona generated, discovering URLs...');
              try {
                const urlQuery = `Best websites and online communities for someone in ${persona.city}, ${persona.country} who is a ${persona.occupation} interested in ${persona.interests.join(', ')}. List specific URLs.`;
                const urlResponse = await llm.searchWithPerplexity(urlQuery);

                const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]()]+/gi;
                const urls = (urlResponse.match(urlRegex) || [])
                  .map((url: string) => url.replace(/[.,;:!?*#@'"\]\[]+$/, ''))
                  .filter((url: string) => {
                    try {
                      const u = new URL(url);
                      return !u.hostname.includes('google.') && !u.hostname.includes('bing.');
                    } catch { return false; }
                  });

                // Save URLs for browsing
                await saveSettings({ discoveredUrls: [...new Set(urls)].slice(0, 20) });
                console.log('[BG] Discovered', urls.length, 'URLs for persona');
              } catch (urlErr) {
                console.warn('[BG] URL discovery failed:', urlErr);
              }

              sendResponse({ persona });
            } else {
              sendResponse({ error: 'Failed to parse persona' });
            }
          } catch (e) {
            console.error('[BG] Persona generation error:', e);
            sendResponse({ error: String(e) });
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

// Listen for new tabs and automatically track them for cleanup
chrome.tabs.onCreated.addListener((tab) => {
  // Don't track extension pages, chrome:// pages, or the working tab
  if (tab.id &&
      tab.id !== workingTabId &&
      !tab.url?.startsWith('chrome://') &&
      !tab.url?.startsWith('chrome-extension://')) {
    console.log('[BG] New tab created, scheduling cleanup:', tab.id);
    scheduleTabCleanup(tab.id);
  }
});

// Track when tabs are removed to clean up our tracking
chrome.tabs.onRemoved.addListener((tabId) => {
  if (agentTabs.has(tabId)) {
    agentTabs.delete(tabId);
    console.log('[BG] Tab removed from tracking:', tabId);
  }
});

// Periodic tab cleanup - runs every 30 seconds to enforce limits
setInterval(() => {
  // Enforce max tabs
  enforceMaxTabs();

  // Clean up any tabs that have exceeded their timeout (except working tab)
  const now = Date.now();
  for (const [tabId, tabInfo] of agentTabs.entries()) {
    // NEVER close the working tab
    if (tabId === workingTabId) continue;

    if (now - tabInfo.openedAt >= tabInfo.closeAfter) {
      chrome.tabs.remove(tabId).catch(() => {});
      agentTabs.delete(tabId);
      console.log('[BG] Periodic cleanup - closed tab:', tabId);
    }
  }

  // Periodically randomize max tabs (every ~5 minutes based on 30s intervals)
  if (Math.random() < 0.1) {
    currentMaxTabs = 1 + Math.floor(Math.random() * 5);
    console.log('[BG] New max tabs limit:', currentMaxTabs);
  }
}, 30000);

// Log startup
console.log('[AUTOBROWSER] Background service worker started');
logActivity({ type: 'navigation', details: 'Extension started' });
