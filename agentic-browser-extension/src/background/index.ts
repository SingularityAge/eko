// ============================================
// Background Service Worker - Extension Core
// ============================================

import { getAgent } from '../services/agent';
import { getSettings, saveSettings, getCredentials } from '../services/storage';
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

// Tab management - simplified approach
// Only track secondary tabs (popups, new windows opened by agent)
// Each tab has a lastActivity timestamp - close if inactive for 3-5 minutes
const secondaryTabs: Map<number, { lastActivity: number; closeAfterMs: number }> = new Map();
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

// Track a secondary tab (not the working tab) for cleanup
function trackSecondaryTab(tabId: number): void {
  // Never track the working tab
  if (tabId === workingTabId) {
    console.log('[BG] Not tracking working tab:', tabId);
    return;
  }

  // Random timeout between 3-5 minutes
  const closeAfterMs = (180 + Math.random() * 120) * 1000; // 180-300 seconds
  secondaryTabs.set(tabId, {
    lastActivity: Date.now(),
    closeAfterMs
  });
  console.log('[BG] Tracking secondary tab:', tabId, 'will close after', Math.round(closeAfterMs / 1000), 'seconds of inactivity');
}

// Update activity on a secondary tab (keeps it alive)
function updateTabActivity(tabId: number): void {
  if (secondaryTabs.has(tabId)) {
    const info = secondaryTabs.get(tabId)!;
    info.lastActivity = Date.now();
    console.log('[BG] Updated activity for tab:', tabId);
  }
}

// Clean up inactive secondary tabs
function cleanupInactiveTabs(): void {
  const now = Date.now();

  for (const [tabId, info] of secondaryTabs.entries()) {
    // Never close the working tab
    if (tabId === workingTabId) {
      secondaryTabs.delete(tabId);
      continue;
    }

    const inactiveFor = now - info.lastActivity;
    if (inactiveFor >= info.closeAfterMs) {
      console.log('[BG] Closing inactive tab:', tabId, 'inactive for', Math.round(inactiveFor / 1000), 'seconds');
      chrome.tabs.remove(tabId).catch(() => {});
      secondaryTabs.delete(tabId);
    }
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

        case 'FETCH_MODELS':
          const models = await fetchOpenRouterModels(payload.apiKey);
          sendResponse({ models });
          break;

        case 'VALIDATE_API_KEY':
          try {
            console.log('[BG] Validating API key...');
            const testLlm = getOpenRouter(payload.apiKey);
            const testResponse = await testLlm.chat([
              { role: 'user', content: 'Say "OK" and nothing else.' }
            ], 'openai/gpt-4o-mini', undefined, 0);
            console.log('[BG] API key validation response:', testResponse.content?.slice(0, 50));
            sendResponse({ valid: true });
          } catch (e) {
            console.error('[BG] API key validation failed:', e);
            sendResponse({ valid: false, error: String(e) });
          }
          break;

        case 'TRACK_TAB':
          trackSecondaryTab(payload.tabId);
          sendResponse({ ok: true });
          break;

        case 'FOCUS_TAB':
          await focusTab(payload.tabId);
          // Update activity when focusing
          updateTabActivity(payload.tabId);
          sendResponse({ ok: true });
          break;

        case 'SET_WORKING_TAB':
          workingTabId = payload.tabId;
          // Remove from secondary tracking if it was added
          if (secondaryTabs.has(payload.tabId)) {
            secondaryTabs.delete(payload.tabId);
          }
          console.log('[BG] Working tab set to:', workingTabId);
          sendResponse({ ok: true });
          break;

        case 'CLEAR_WORKING_TAB':
          console.log('[BG] Clearing working tab:', workingTabId);
          workingTabId = null;
          sendResponse({ ok: true });
          break;

        case 'GET_WORKING_TAB':
          sendResponse({ tabId: workingTabId });
          break;

        case 'GET_SCHEDULE':
          const schedule = agent.getSchedule();
          sendResponse({ schedule });
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
            console.log('[BG] Autocomplete request for:', payload.country, payload.query);
            const citySettings = await getSettings();
            if (!citySettings.openRouterApiKey) {
              console.log('[BG] No API key for autocomplete');
              sendResponse({ cities: [] });
              break;
            }
            const llm = getOpenRouter(citySettings.openRouterApiKey);
            console.log('[BG] Calling LLM for city suggestions...');
            const cityResponse = await llm.chat([
              { role: 'system', content: 'You are a geography assistant. Return ONLY a JSON array of city names, nothing else.' },
              { role: 'user', content: `List up to 5 cities in ${payload.country} that start with or contain "${payload.query}". Return ONLY a JSON array like ["City1", "City2"]. If no matches, return [].` }
            ], citySettings.model || 'anthropic/claude-sonnet-4', undefined, 0.3);

            console.log('[BG] City response:', cityResponse.content?.slice(0, 200));
            const cityMatch = (cityResponse.content || '').match(/\[[\s\S]*?\]/);
            const cities = cityMatch ? JSON.parse(cityMatch[0]) : [];
            console.log('[BG] Parsed cities:', cities);
            sendResponse({ cities: cities.slice(0, 5) });
          } catch (e) {
            console.error('[BG] City autocomplete error:', e);
            sendResponse({ cities: [] });
          }
          break;

        case 'GENERATE_PERSONA':
          try {
            console.log('[BG] Generating persona for:', payload.city, payload.country);
            const personaSettings = await getSettings();
            if (!personaSettings.openRouterApiKey) {
              console.error('[BG] No API key for persona generation');
              sendResponse({ error: 'No API key' });
              break;
            }
            const llm = getOpenRouter(personaSettings.openRouterApiKey);
            console.log('[BG] Using model:', personaSettings.model || 'anthropic/claude-sonnet-4');

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

            console.log('[BG] Persona response received:', personaResponse.content?.slice(0, 200));
            const personaMatch = (personaResponse.content || '').match(/\{[\s\S]*\}/);
            if (personaMatch) {
              const persona = JSON.parse(personaMatch[0]);
              persona.country = payload.country;
              persona.city = payload.city;
              console.log('[BG] Parsed persona:', persona.firstName, persona.lastName);

              // Fetch a random address using Perplexity/Sonar (headless API call)
              console.log('[BG] Fetching random address for persona...');
              try {
                const addressQuery = `${payload.city}, ${payload.country}, random, insignificant house numbers with their street names, federal states and ZIP codes.`;
                const addressResponse = await llm.searchWithPerplexity(addressQuery);

                // Parse the address from response - extract one clean address
                const addressParseResponse = await llm.chat([
                  { role: 'system', content: 'Extract address information from the text. Return ONLY valid JSON, no markdown.' },
                  { role: 'user', content: `From this text, extract ONE random residential address (not a famous landmark or business).
Text: ${addressResponse}

Return ONLY this JSON (no citations, no special characters, plain text only):
{
  "streetAddress": "house number and street name",
  "state": "state/province/region name",
  "zipCode": "postal/ZIP code"
}

Example for New York: {"streetAddress": "247 West 38th Street", "state": "New York", "zipCode": "10018"}
Pick an insignificant, ordinary address. Return ONLY the JSON.` }
                ], personaSettings.model || 'anthropic/claude-sonnet-4', undefined, 0.3);

                const addressMatch = (addressParseResponse.content || '').match(/\{[\s\S]*\}/);
                if (addressMatch) {
                  const addressData = JSON.parse(addressMatch[0]);
                  // Clean up any citation markers or special characters
                  persona.streetAddress = (addressData.streetAddress || '').replace(/\[\d+\]|\[|\]|[*#]/g, '').trim();
                  persona.state = (addressData.state || '').replace(/\[\d+\]|\[|\]|[*#]/g, '').trim();
                  persona.zipCode = (addressData.zipCode || '').replace(/\[\d+\]|\[|\]|[*#]/g, '').trim();
                  console.log('[BG] Address set:', persona.streetAddress, persona.city, persona.state, persona.zipCode);
                } else {
                  // Fallback: generate a plausible address
                  persona.streetAddress = `${100 + Math.floor(Math.random() * 900)} Main Street`;
                  persona.state = payload.city;
                  persona.zipCode = String(10000 + Math.floor(Math.random() * 89999));
                  console.warn('[BG] Using fallback address');
                }
              } catch (addrErr) {
                console.warn('[BG] Address lookup failed, using fallback:', addrErr);
                persona.streetAddress = `${100 + Math.floor(Math.random() * 900)} Main Street`;
                persona.state = payload.city;
                persona.zipCode = String(10000 + Math.floor(Math.random() * 89999));
              }

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
              console.error('[BG] Failed to parse persona from:', personaResponse.content);
              sendResponse({ error: 'Failed to parse persona response' });
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

// Listen for new tabs - only track them if the agent is running and they're not the working tab
chrome.tabs.onCreated.addListener((tab) => {
  // Skip extension pages, chrome:// pages
  if (!tab.id ||
      tab.url?.startsWith('chrome://') ||
      tab.url?.startsWith('chrome-extension://')) {
    return;
  }

  // Skip the working tab
  if (tab.id === workingTabId) {
    console.log('[BG] New tab is working tab, not tracking for cleanup:', tab.id);
    return;
  }

  // Only track if the agent is running (to avoid tracking user's normal tabs)
  if (currentState.status === 'running') {
    console.log('[BG] New tab created while agent running, tracking for cleanup:', tab.id);
    trackSecondaryTab(tab.id);
  }
});

// Track when tabs are removed to clean up our tracking
chrome.tabs.onRemoved.addListener((tabId) => {
  // Clean up secondary tab tracking
  if (secondaryTabs.has(tabId)) {
    secondaryTabs.delete(tabId);
    console.log('[BG] Secondary tab removed:', tabId);
  }

  // Check if the working tab was closed
  if (tabId === workingTabId) {
    console.log('[BG] WARNING: Working tab was closed:', tabId);
    workingTabId = null;
    // Notify the agent that its tab was closed
    agent.handleTabClosed();
  }
});

// Listen for tab activation to update activity timestamps
chrome.tabs.onActivated.addListener((activeInfo) => {
  updateTabActivity(activeInfo.tabId);
});

// Periodic cleanup - runs every 30 seconds
setInterval(() => {
  cleanupInactiveTabs();
}, 30000);

// Log startup
console.log('[AUTOBROWSER] Background service worker started');
