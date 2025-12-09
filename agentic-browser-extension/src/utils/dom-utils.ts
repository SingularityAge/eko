// ============================================
// DOM Navigation and Page Analysis Utilities
// ============================================

import { DOMElement, PageState, FormInfo, FormField, LinkInfo } from '../shared/types';

// Build a labeled DOM tree for LLM navigation
export function buildDOMTree(): { elements: DOMElement[]; domString: string } {
  const elements: DOMElement[] = [];
  let index = 0;

  const isVisible = (el: Element): boolean => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none' &&
      style.opacity !== '0' &&
      rect.top < window.innerHeight &&
      rect.bottom > 0 &&
      rect.left < window.innerWidth &&
      rect.right > 0
    );
  };

  const isClickable = (el: Element): boolean => {
    const tag = el.tagName.toLowerCase();
    const clickableTags = ['a', 'button', 'input', 'select', 'textarea', 'label'];

    if (clickableTags.includes(tag)) return true;

    const role = el.getAttribute('role');
    if (role && ['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio'].includes(role)) {
      return true;
    }

    const hasClickHandler = el.getAttribute('onclick') ||
                            el.getAttribute('ng-click') ||
                            el.getAttribute('@click') ||
                            el.getAttribute('v-on:click');
    if (hasClickHandler) return true;

    const style = window.getComputedStyle(el);
    if (style.cursor === 'pointer') return true;

    return false;
  };

  const isInputElement = (el: Element): boolean => {
    const tag = el.tagName.toLowerCase();
    return ['input', 'textarea', 'select'].includes(tag) ||
           el.getAttribute('contenteditable') === 'true';
  };

  const getElementText = (el: Element): string => {
    const tag = el.tagName.toLowerCase();

    if (tag === 'input') {
      const input = el as HTMLInputElement;
      return input.placeholder || input.value || input.getAttribute('aria-label') || '';
    }
    if (tag === 'img') {
      return (el as HTMLImageElement).alt || '';
    }
    if (tag === 'select') {
      const select = el as HTMLSelectElement;
      return select.options[select.selectedIndex]?.text || '';
    }

    // Get direct text content, not including children
    let text = '';
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent?.trim() || '';
      }
    }

    return text.slice(0, 100); // Limit text length
  };

  const getAttributes = (el: Element): Record<string, string> => {
    const attrs: Record<string, string> = {};
    const importantAttrs = ['id', 'class', 'href', 'src', 'type', 'name', 'placeholder',
                           'aria-label', 'title', 'value', 'data-testid'];

    for (const attr of importantAttrs) {
      const value = el.getAttribute(attr);
      if (value) {
        attrs[attr] = value.slice(0, 100);
      }
    }

    return attrs;
  };

  const processElement = (el: Element): void => {
    if (!isVisible(el)) return;

    const clickable = isClickable(el);
    const isInput = isInputElement(el);

    if (clickable || isInput) {
      const rect = el.getBoundingClientRect();

      elements.push({
        index,
        tagName: el.tagName.toLowerCase(),
        text: getElementText(el),
        attributes: getAttributes(el),
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          toJSON: () => ({})
        },
        isVisible: true,
        isClickable: clickable,
        isInput
      });

      index++;
    }

    // Process children
    for (const child of el.children) {
      processElement(child);
    }
  };

  processElement(document.body);

  // Build DOM string for LLM
  const domString = elements.map(el => {
    const attrs = Object.entries(el.attributes)
      .map(([k, v]) => `${k}="${v}"`)
      .join(' ');

    let descriptor = `[${el.index}]:<${el.tagName}`;
    if (attrs) descriptor += ` ${attrs}`;
    descriptor += `>`;
    if (el.text) descriptor += el.text;
    descriptor += `</${el.tagName}>`;

    return descriptor;
  }).join('\n');

  return { elements, domString };
}

// Extract full page content for LLM context
export function extractPageContent(): string {
  const content: string[] = [];

  // Title
  content.push(`Title: ${document.title}`);
  content.push(`URL: ${window.location.href}`);
  content.push('');

  // Main content
  const mainContent = document.querySelector('main, article, [role="main"], #content, .content');
  const target = mainContent || document.body;

  const extractText = (el: Element, depth: number = 0): void => {
    if (depth > 10) return;

    const tag = el.tagName.toLowerCase();
    const style = window.getComputedStyle(el);

    if (style.display === 'none' || style.visibility === 'hidden') return;
    if (['script', 'style', 'noscript', 'svg', 'path'].includes(tag)) return;

    // Headers
    if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      content.push(`${'#'.repeat(parseInt(tag[1]))} ${el.textContent?.trim()}`);
      return;
    }

    // Links
    if (tag === 'a') {
      const href = el.getAttribute('href');
      const text = el.textContent?.trim();
      if (text && href) {
        content.push(`[${text}](${href})`);
      }
      return;
    }

    // Images
    if (tag === 'img') {
      const alt = (el as HTMLImageElement).alt;
      if (alt) content.push(`[Image: ${alt}]`);
      return;
    }

    // Paragraphs
    if (tag === 'p') {
      const text = el.textContent?.trim();
      if (text) content.push(text + '\n');
      return;
    }

    // List items
    if (tag === 'li') {
      const text = el.textContent?.trim();
      if (text) content.push(`• ${text}`);
      return;
    }

    // Process children
    for (const child of el.children) {
      extractText(child, depth + 1);
    }
  };

  extractText(target);

  return content.join('\n').slice(0, 50000); // Limit content size
}

// Get all forms on the page
export function extractForms(): FormInfo[] {
  const forms: FormInfo[] = [];

  document.querySelectorAll('form').forEach((form, formIndex) => {
    const fields: FormField[] = [];

    form.querySelectorAll('input, select, textarea').forEach(field => {
      const input = field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const label = form.querySelector(`label[for="${input.id}"]`)?.textContent?.trim() ||
                    input.getAttribute('aria-label') ||
                    input.placeholder ||
                    input.name;

      const fieldInfo: FormField = {
        name: input.name || input.id || '',
        type: input.type || 'text',
        label,
        required: input.required,
        value: input.value
      };

      if (input instanceof HTMLSelectElement) {
        fieldInfo.options = Array.from(input.options).map(opt => opt.text);
      }

      fields.push(fieldInfo);
    });

    forms.push({
      index: formIndex,
      action: form.action,
      method: form.method,
      fields
    });
  });

  return forms;
}

// Get all links on the page
export function extractLinks(): LinkInfo[] {
  const links: LinkInfo[] = [];
  const currentHost = window.location.host;

  document.querySelectorAll('a[href]').forEach((link, index) => {
    const anchor = link as HTMLAnchorElement;
    const href = anchor.href;

    if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

    try {
      const url = new URL(href);
      links.push({
        index,
        href,
        text: anchor.textContent?.trim() || anchor.title || '',
        isExternal: url.host !== currentHost
      });
    } catch {
      // Invalid URL
    }
  });

  return links;
}

// Get complete page state
export function getPageState(): PageState {
  const { elements } = buildDOMTree();

  return {
    url: window.location.href,
    title: document.title,
    domain: window.location.hostname,
    elements,
    forms: extractForms(),
    links: extractLinks(),
    scrollPosition: {
      x: window.scrollX,
      y: window.scrollY
    },
    viewportSize: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    timestamp: Date.now()
  };
}

// Find element by various selectors
export function findElement(
  selector: string | number,
  elements?: DOMElement[]
): Element | null {
  // By index from labeled DOM
  if (typeof selector === 'number') {
    if (!elements) {
      const { elements: domElements } = buildDOMTree();
      elements = domElements;
    }

    const el = elements[selector];
    if (!el) return null;

    // Find by position
    const centerX = el.rect.x + el.rect.width / 2;
    const centerY = el.rect.y + el.rect.height / 2;
    return document.elementFromPoint(centerX, centerY);
  }

  // By CSS selector
  return document.querySelector(selector);
}

// Scroll element into view
export function scrollToElement(element: Element): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center'
  });
}

// Wait for element to appear
export function waitForElement(
  selector: string,
  timeout: number = 10000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

// Check if page is fully loaded
export function isPageLoaded(): boolean {
  return document.readyState === 'complete';
}

// Wait for page to load
export function waitForPageLoad(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isPageLoaded()) {
      resolve();
      return;
    }

    const timer = setTimeout(() => {
      reject(new Error('Page load timeout'));
    }, timeout);

    window.addEventListener('load', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

// Detect login/signup forms
export function detectAuthForms(): {
  type: 'login' | 'signup' | 'none';
  form?: FormInfo;
} {
  const forms = extractForms();

  for (const form of forms) {
    const fieldNames = form.fields.map(f => f.name.toLowerCase());
    const fieldTypes = form.fields.map(f => f.type.toLowerCase());

    const hasEmail = fieldNames.some(n => n.includes('email')) ||
                     fieldTypes.includes('email');
    const hasPassword = fieldTypes.includes('password');
    const hasConfirmPassword = form.fields.filter(f =>
      f.type === 'password'
    ).length > 1;
    const hasUsername = fieldNames.some(n =>
      n.includes('user') || n.includes('login')
    );

    if (hasPassword) {
      if (hasConfirmPassword || fieldNames.some(n => n.includes('confirm'))) {
        return { type: 'signup', form };
      }
      if (hasEmail || hasUsername) {
        return { type: 'login', form };
      }
    }
  }

  return { type: 'none' };
}

// Detect email provider from URL
export function detectEmailProvider(url: string): string | null {
  const providers: Record<string, string[]> = {
    gmail: ['mail.google.com', 'accounts.google.com'],
    outlook: ['outlook.live.com', 'login.live.com', 'outlook.office.com'],
    yahoo: ['mail.yahoo.com', 'login.yahoo.com'],
    protonmail: ['mail.proton.me', 'account.proton.me']
  };

  const urlObj = new URL(url);
  const host = urlObj.hostname;

  for (const [provider, hosts] of Object.entries(providers)) {
    if (hosts.some(h => host.includes(h))) {
      return provider;
    }
  }

  return null;
}
