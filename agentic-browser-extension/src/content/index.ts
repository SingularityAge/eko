// ============================================
// Content Script - Page Interaction
// ============================================

interface DOMElement {
  index: number;
  tag: string;
  text: string;
  type?: string;
  placeholder?: string;
  href?: string;
  rect: { x: number; y: number; width: number; height: number };
}

// Build DOM tree of interactive elements
function buildDOMTree(): { elements: DOMElement[]; domString: string } {
  const elements: DOMElement[] = [];
  const lines: string[] = [];

  const interactiveSelectors = [
    'a[href]',
    'button',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="link"]',
    '[onclick]',
    '[tabindex]:not([tabindex="-1"])'
  ];

  const allElements = document.querySelectorAll(interactiveSelectors.join(','));
  let index = 0;

  allElements.forEach(el => {
    const htmlEl = el as HTMLElement;

    // Skip hidden elements
    if (htmlEl.offsetWidth === 0 && htmlEl.offsetHeight === 0) return;
    const style = getComputedStyle(htmlEl);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const rect = htmlEl.getBoundingClientRect();

    // Skip elements outside viewport or too small
    if (rect.width < 5 || rect.height < 5) return;

    const text = (htmlEl.innerText || htmlEl.getAttribute('aria-label') || htmlEl.getAttribute('title') || '').trim().slice(0, 100);
    const tag = htmlEl.tagName.toLowerCase();
    const type = htmlEl.getAttribute('type') || undefined;
    const placeholder = htmlEl.getAttribute('placeholder') || undefined;
    const href = htmlEl.getAttribute('href') || undefined;

    const elem: DOMElement = {
      index,
      tag,
      text,
      type,
      placeholder,
      href,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };

    elements.push(elem);

    // Build readable string
    let desc = `[${index}] <${tag}`;
    if (type) desc += ` type="${type}"`;
    if (placeholder) desc += ` placeholder="${placeholder}"`;
    if (href) desc += ` href="${href.slice(0, 50)}"`;
    desc += `>`;
    if (text) desc += ` "${text.slice(0, 50)}"`;
    lines.push(desc);

    index++;
  });

  return { elements, domString: lines.join('\n') };
}

// Get page state
function getPageState(): { url: string; title: string; elements: string } {
  const { domString } = buildDOMTree();
  return {
    url: window.location.href,
    title: document.title,
    elements: domString
  };
}

// Click element by index
async function clickElement(index: number): Promise<string> {
  const { elements } = buildDOMTree();
  const elem = elements[index];

  if (!elem) {
    return `Error: Element [${index}] not found`;
  }

  const x = elem.rect.x + elem.rect.width / 2;
  const y = elem.rect.y + elem.rect.height / 2;

  // Scroll into view if needed
  if (y < 0 || y > window.innerHeight) {
    window.scrollTo({ top: y - window.innerHeight / 2, behavior: 'smooth' });
    await sleep(300);
  }

  const target = document.elementFromPoint(x, y) as HTMLElement;
  if (!target) {
    return `Error: Could not find element at position (${x}, ${y})`;
  }

  // Simulate human-like click
  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }));
  await sleep(50 + Math.random() * 50);
  target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }));
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));

  // Also try native click
  if (typeof target.click === 'function') {
    target.click();
  }

  return `Clicked [${index}] <${elem.tag}> "${elem.text.slice(0, 30)}"`;
}

// Type text into focused element
async function typeText(text: string, pressEnter: boolean = false): Promise<string> {
  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;

  if (!active || active === document.body) {
    return 'Error: No element focused. Click on an input first.';
  }

  // Clear existing value
  active.value = '';
  active.dispatchEvent(new Event('input', { bubbles: true }));

  // Type character by character with human-like delays
  for (const char of text) {
    active.value += char;
    active.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
    active.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
    active.dispatchEvent(new Event('input', { bubbles: true }));
    active.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    await sleep(30 + Math.random() * 70); // 30-100ms per character
  }

  if (pressEnter) {
    await sleep(100);
    active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
    active.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', code: 'Enter', bubbles: true }));
    active.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));

    // Submit form if exists
    const form = active.closest('form');
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  }

  return `Typed "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"${pressEnter ? ' and pressed Enter' : ''}`;
}

// Scroll page
async function scrollPage(direction: 'up' | 'down', amount: number = 500): Promise<string> {
  const delta = direction === 'down' ? amount : -amount;

  // Smooth scroll with slight randomization
  const steps = 5;
  const stepAmount = delta / steps;

  for (let i = 0; i < steps; i++) {
    window.scrollBy({ top: stepAmount + (Math.random() * 20 - 10), behavior: 'auto' });
    await sleep(20 + Math.random() * 30);
  }

  return `Scrolled ${direction} ${amount}px`;
}

// Wait/sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract page content
function extractContent(): string {
  const article = document.querySelector('article');
  const main = document.querySelector('main');
  const content = article || main || document.body;

  // Get text content, clean up whitespace
  let text = content.innerText || '';
  text = text.replace(/\s+/g, ' ').trim();
  return text.slice(0, 10000);
}

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const { type, payload } = message;

      switch (type) {
        case 'PING':
          sendResponse({ ok: true });
          break;

        case 'GET_PAGE_STATE':
          sendResponse(getPageState());
          break;

        case 'CLICK':
          const clickResult = await clickElement(payload.index);
          sendResponse({ result: clickResult });
          break;

        case 'TYPE':
          const typeResult = await typeText(payload.text, payload.pressEnter);
          sendResponse({ result: typeResult });
          break;

        case 'SCROLL':
          const scrollResult = await scrollPage(payload.direction, payload.amount);
          sendResponse({ result: scrollResult });
          break;

        case 'EXTRACT_CONTENT':
          sendResponse({ content: extractContent() });
          break;

        case 'WAIT':
          await sleep(payload.ms || 1000);
          sendResponse({ result: `Waited ${payload.ms || 1000}ms` });
          break;

        default:
          sendResponse({ error: `Unknown message type: ${type}` });
      }
    } catch (error) {
      console.error('[CONTENT] Error:', error);
      sendResponse({ error: error instanceof Error ? error.message : String(error) });
    }
  })();

  return true; // Keep channel open for async
});

console.log('[AUTOBROWSER] Content script loaded');
