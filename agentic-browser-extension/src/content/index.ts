// ============================================
// Content Script - Main Entry Point
// Handles DOM interaction and human simulation
// ============================================

import {
  buildDOMTree,
  extractPageContent,
  getPageState,
  findElement,
  scrollToElement,
  waitForElement,
  detectAuthForms,
  detectEmailProvider
} from '../utils/dom-utils';

import {
  MouseEmulator,
  KeyboardEmulator,
  ScrollEmulator,
  sleep,
  randomDelay,
  thinkingPause,
  createHumanSimulator
} from '../utils/human-simulation';

import { ExtensionMessage, DOMElement } from '../shared/types';

// Global instances
let mouseEmulator: MouseEmulator;
let keyboardEmulator: KeyboardEmulator;
let scrollEmulator: ScrollEmulator;
let currentElements: DOMElement[] = [];
let humanizationEnabled = true;

// Initialize emulators
function initializeEmulators(config?: { typingSpeed?: number; typoRate?: number }) {
  const simulator = createHumanSimulator(config);
  mouseEmulator = simulator.mouse;
  keyboardEmulator = simulator.keyboard;
  scrollEmulator = simulator.scroll;
}

// Initialize on load
initializeEmulators();

// Message handler
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message)
    .then(result => sendResponse({ result }))
    .catch(error => sendResponse({ error: error.message }));

  return true; // Keep channel open for async response
});

async function handleMessage(message: ExtensionMessage): Promise<any> {
  switch (message.type) {
    case 'GET_PAGE_STATE':
      return getPageState();

    case 'EXTRACT_PAGE_CONTENT':
      return extractPageContent();

    case 'CLICK_ELEMENT':
      return clickElement(message.payload);

    case 'TYPE_TEXT':
      return typeText(message.payload);

    case 'SCROLL_PAGE':
      return scrollPage(message.payload);

    case 'SCROLL_TO_ELEMENT':
      return scrollToElementAction(message.payload);

    case 'HOVER_ELEMENT':
      return hoverElement(message.payload);

    case 'FILL_FORM':
      return fillForm(message.payload);

    case 'WAIT_FOR_ELEMENT':
      return waitForElementAction(message.payload);

    case 'NAVIGATE_TO':
      window.location.href = message.payload.url;
      return 'Navigating...';

    case 'TAKE_SCREENSHOT':
      return takeScreenshot();

    case 'UPDATE_SETTINGS':
      updateSettings(message.payload);
      return 'Settings updated';

    case 'EXECUTE_TOOL':
      return executeTool(message.payload);

    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

// Execute a tool action
async function executeTool(payload: { tool: string; args: Record<string, any> }): Promise<string> {
  const { tool, args } = payload;

  switch (tool) {
    case 'navigate_to':
      window.location.href = args.url;
      return `Navigating to ${args.url}`;

    case 'click_element':
      return clickElement({ index: args.index });

    case 'type_text':
      return typeText({
        text: args.text,
        pressEnter: args.press_enter
      });

    case 'scroll_page':
      return scrollPage({
        direction: args.direction,
        amount: args.amount || 500
      });

    case 'wait':
      await sleep(args.seconds * 1000);
      return `Waited ${args.seconds} seconds`;

    case 'extract_content':
      return extractPageContent();

    case 'get_page_info':
      return JSON.stringify({
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname
      });

    case 'go_back':
      window.history.back();
      return 'Going back';

    case 'refresh_page':
      window.location.reload();
      return 'Refreshing page';

    case 'fill_form':
      return fillForm({
        elementIndex: args.element_index,
        value: args.value
      });

    case 'hover_element':
      return hoverElement({ index: args.index });

    case 'search_google':
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(args.query)}`;
      window.location.href = searchUrl;
      return `Searching Google for: ${args.query}`;

    case 'read_article':
      return readArticle(args.duration_seconds);

    case 'browse_feed':
      return browseFeed(args.duration_seconds);

    case 'complete':
      return args.summary;

    default:
      // Return DOM tree for unknown tools
      const { domString } = buildDOMTree();
      return `Unknown tool: ${tool}. Current page DOM:\n${domString}`;
  }
}

// Click on an element by index
async function clickElement(payload: { index: number }): Promise<string> {
  // Rebuild DOM tree to get fresh positions
  const { elements } = buildDOMTree();
  currentElements = elements;

  const element = elements[payload.index];
  if (!element) {
    throw new Error(`Element with index ${payload.index} not found`);
  }

  const centerX = element.rect.x + element.rect.width / 2;
  const centerY = element.rect.y + element.rect.height / 2;

  // Scroll element into view if needed
  if (centerY < 0 || centerY > window.innerHeight) {
    const domElement = findElement(payload.index, elements);
    if (domElement) {
      scrollToElement(domElement);
      await sleep(500);
    }
  }

  if (humanizationEnabled) {
    // Simulate human-like mouse movement and click
    await thinkingPause();
    await mouseEmulator.click(centerX, centerY);
  } else {
    // Direct click
    const domElement = findElement(payload.index, elements);
    if (domElement) {
      (domElement as HTMLElement).click();
    }
  }

  await sleep(300);

  return `Clicked element [${payload.index}]: ${element.tagName} "${element.text.slice(0, 50)}"`;
}

// Type text into focused element
async function typeText(payload: { text: string; pressEnter?: boolean }): Promise<string> {
  const activeElement = document.activeElement as HTMLElement;

  if (!activeElement || activeElement === document.body) {
    throw new Error('No element is focused. Click on an input field first.');
  }

  if (humanizationEnabled) {
    await thinkingPause();
    await keyboardEmulator.type(activeElement, payload.text, {
      pressEnter: payload.pressEnter,
      withTypos: true
    });
  } else {
    // Direct input
    if (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement) {
      activeElement.value = payload.text;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));

      if (payload.pressEnter) {
        activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        const form = activeElement.closest('form');
        if (form) form.submit();
      }
    }
  }

  return `Typed: "${payload.text.slice(0, 50)}${payload.text.length > 50 ? '...' : ''}"`;
}

// Scroll the page
async function scrollPage(payload: { direction: 'up' | 'down'; amount?: number }): Promise<string> {
  const amount = payload.amount || 500;
  const delta = payload.direction === 'down' ? amount : -amount;

  if (humanizationEnabled) {
    await scrollEmulator.scrollBy(delta, 'medium');
  } else {
    window.scrollBy(0, delta);
  }

  return `Scrolled ${payload.direction} by ${amount}px`;
}

// Scroll to a specific element
async function scrollToElementAction(payload: { index: number }): Promise<string> {
  const { elements } = buildDOMTree();
  const element = findElement(payload.index, elements);

  if (!element) {
    throw new Error(`Element with index ${payload.index} not found`);
  }

  if (humanizationEnabled) {
    await scrollEmulator.scrollToElement(element, 'medium');
  } else {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  await sleep(500);

  return `Scrolled to element [${payload.index}]`;
}

// Hover over an element
async function hoverElement(payload: { index: number }): Promise<string> {
  const { elements } = buildDOMTree();
  const element = elements[payload.index];

  if (!element) {
    throw new Error(`Element with index ${payload.index} not found`);
  }

  const centerX = element.rect.x + element.rect.width / 2;
  const centerY = element.rect.y + element.rect.height / 2;

  if (humanizationEnabled) {
    await mouseEmulator.hover(centerX, centerY, 1000);
  } else {
    const domElement = findElement(payload.index, elements);
    if (domElement) {
      domElement.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      domElement.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    }
  }

  return `Hovered over element [${payload.index}]`;
}

// Fill a form field
async function fillForm(payload: { elementIndex: number; value: string }): Promise<string> {
  // Click on the element first
  await clickElement({ index: payload.elementIndex });
  await sleep(200);

  // Type the value
  await typeText({ text: payload.value });

  return `Filled form field [${payload.elementIndex}] with "${payload.value.slice(0, 30)}..."`;
}

// Wait for an element to appear
async function waitForElementAction(payload: { selector: string; timeout?: number }): Promise<string> {
  const element = await waitForElement(payload.selector, payload.timeout || 10000);

  if (element) {
    return `Element found: ${payload.selector}`;
  } else {
    throw new Error(`Element not found within timeout: ${payload.selector}`);
  }
}

// Take a screenshot (returns base64)
async function takeScreenshot(): Promise<string> {
  // Screenshots are taken by the background script using chrome.tabs API
  // This just signals the request
  return 'Screenshot requested - handled by background script';
}

// Update content script settings
function updateSettings(settings: any): void {
  if (settings.humanization !== undefined) {
    humanizationEnabled = settings.humanization.enabled;

    if (settings.humanization.typingSpeed) {
      keyboardEmulator.setTypingSpeed(settings.humanization.typingSpeed);
    }
    if (settings.humanization.typoRate !== undefined) {
      keyboardEmulator.setTypoRate(settings.humanization.typoRate);
    }
  }
}

// Simulate reading an article
async function readArticle(durationSeconds: number): Promise<string> {
  const duration = Math.min(120, Math.max(10, durationSeconds)) * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < duration) {
    // Random scroll
    const scrollAmount = 100 + Math.random() * 200;
    await scrollEmulator.scrollBy(scrollAmount, 'slow');

    // Random pause (simulating reading)
    const readPause = 2000 + Math.random() * 4000;
    await sleep(readPause);

    // Occasional scroll back (re-reading)
    if (Math.random() < 0.15) {
      await scrollEmulator.scrollBy(-scrollAmount * 0.5, 'slow');
      await sleep(1000 + Math.random() * 1000);
    }
  }

  const actualDuration = Math.round((Date.now() - startTime) / 1000);
  return `Read article for ${actualDuration} seconds`;
}

// Simulate browsing a feed (social media, news, etc.)
async function browseFeed(durationSeconds: number): Promise<string> {
  const duration = Math.min(300, Math.max(30, durationSeconds)) * 1000;
  const startTime = Date.now();
  let scrollCount = 0;

  while (Date.now() - startTime < duration) {
    // Scroll through feed
    const scrollAmount = 300 + Math.random() * 400;
    await scrollEmulator.scrollBy(scrollAmount, 'medium');
    scrollCount++;

    // Pause to view content
    const viewPause = 1500 + Math.random() * 3500;
    await sleep(viewPause);

    // Occasionally pause longer (engaging with content)
    if (Math.random() < 0.1) {
      await sleep(3000 + Math.random() * 5000);
    }

    // Rarely scroll up (checking something again)
    if (Math.random() < 0.05) {
      await scrollEmulator.scrollBy(-scrollAmount * 2, 'medium');
      await sleep(2000);
    }
  }

  const actualDuration = Math.round((Date.now() - startTime) / 1000);
  return `Browsed feed for ${actualDuration} seconds (${scrollCount} scrolls)`;
}

// Auto-detect and report page info on load
function reportPageInfo(): void {
  const pageInfo = {
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname,
    authForm: detectAuthForms(),
    emailProvider: detectEmailProvider(window.location.href)
  };

  chrome.runtime.sendMessage({
    type: 'ACTIVITY_LOG',
    payload: {
      type: 'page_visit',
      url: pageInfo.url,
      title: pageInfo.title,
      details: pageInfo,
      timestamp: Date.now()
    }
  }).catch(() => {
    // Ignore if background not ready
  });
}

// Initial page report
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', reportPageInfo);
} else {
  reportPageInfo();
}

// Report on navigation
window.addEventListener('popstate', reportPageInfo);

// Expose functions for debugging
(window as any).__agenticBrowser = {
  getPageState,
  buildDOMTree,
  extractPageContent,
  clickElement,
  typeText,
  scrollPage
};

console.log('Agentic Browser content script loaded');
