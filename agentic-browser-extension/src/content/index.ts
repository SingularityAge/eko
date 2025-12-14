// ============================================
// Content Script - Page Interaction
// With Human-Like Mouse Movements and Typing
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

// ============================================
// Human-Like Mouse Movement System
// Uses Bezier curves, jitter, and natural timing
// ============================================

interface Point { x: number; y: number; }

// Current simulated cursor position
let currentCursorPos: Point = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

// Generate a random number with gaussian-like distribution
function gaussianRandom(mean: number = 0, stdev: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdev + mean;
}

// Add natural jitter/noise to a point
function addJitter(point: Point, intensity: number = 1): Point {
  return {
    x: point.x + gaussianRandom(0, intensity),
    y: point.y + gaussianRandom(0, intensity)
  };
}

// Calculate a point on a cubic Bezier curve
function bezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
  };
}

// Generate control points for a natural-looking Bezier curve
function generateBezierControlPoints(start: Point, end: Point): { p1: Point; p2: Point } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Control point offset - varies based on distance and adds randomness
  const offsetScale = 0.2 + Math.random() * 0.3; // 20-50% of distance
  const perpScale = 0.1 + Math.random() * 0.4; // Perpendicular offset

  // Perpendicular direction (for curve deviation)
  const perpX = -dy / (distance || 1);
  const perpY = dx / (distance || 1);

  // Random curve direction (left or right)
  const curveDirection = Math.random() < 0.5 ? 1 : -1;
  const perpOffset = distance * perpScale * curveDirection;

  // First control point - closer to start
  const p1: Point = {
    x: start.x + dx * (0.2 + Math.random() * 0.2) + perpX * perpOffset * (0.5 + Math.random() * 0.5),
    y: start.y + dy * (0.2 + Math.random() * 0.2) + perpY * perpOffset * (0.5 + Math.random() * 0.5)
  };

  // Second control point - closer to end
  const p2: Point = {
    x: start.x + dx * (0.6 + Math.random() * 0.2) + perpX * perpOffset * (0.3 + Math.random() * 0.4),
    y: start.y + dy * (0.6 + Math.random() * 0.2) + perpY * perpOffset * (0.3 + Math.random() * 0.4)
  };

  return { p1, p2 };
}

// Generate non-linear easing for timing
function humanEasing(t: number): number {
  // Mix of ease-in-out with slight randomization
  // Humans tend to start slow, speed up, then slow down at the end
  const baseEase = t < 0.5
    ? 2 * t * t
    : 1 - Math.pow(-2 * t + 2, 2) / 2;

  // Add slight variation to the easing
  const noise = (Math.random() - 0.5) * 0.05;
  return Math.max(0, Math.min(1, baseEase + noise));
}

// Calculate movement duration based on distance (Fitts's law approximation)
function calculateMoveDuration(distance: number): number {
  // Base time + logarithmic scaling based on distance
  // Faster for short distances, not linearly slower for long distances
  const baseTime = 150 + Math.random() * 100; // 150-250ms minimum
  const distanceTime = Math.log2(distance / 10 + 1) * (80 + Math.random() * 40);
  return Math.min(baseTime + distanceTime, 800 + Math.random() * 400); // Cap at ~800-1200ms
}

// Dispatch mouse move event at a point
function dispatchMouseMove(point: Point): void {
  const event = new MouseEvent('mousemove', {
    bubbles: true,
    cancelable: true,
    clientX: point.x,
    clientY: point.y,
    view: window
  });
  document.elementFromPoint(point.x, point.y)?.dispatchEvent(event);
}

// Move mouse naturally from current position to target
async function moveMouseNaturally(targetX: number, targetY: number): Promise<void> {
  const start = { ...currentCursorPos };
  const end = { x: targetX, y: targetY };

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // For very short distances, use simpler movement
  if (distance < 20) {
    const steps = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = addJitter({
        x: start.x + dx * t,
        y: start.y + dy * t
      }, 1);
      dispatchMouseMove(point);
      currentCursorPos = point;
      await sleep(10 + Math.random() * 20);
    }
    return;
  }

  // Generate Bezier control points
  const { p1, p2 } = generateBezierControlPoints(start, end);

  // Calculate duration and steps
  const duration = calculateMoveDuration(distance);
  const steps = Math.floor(duration / 16); // ~60fps
  const stepDelay = duration / steps;

  // Track time for occasional micro-pauses
  let lastPauseTime = 0;
  const pauseInterval = 80 + Math.random() * 100; // Pause every 80-180ms maybe

  for (let i = 0; i <= steps; i++) {
    const t = humanEasing(i / steps);
    let point = bezierPoint(t, start, p1, p2, end);

    // Add jitter that decreases as we approach the target
    const jitterIntensity = Math.max(0.5, (1 - t) * 2);
    point = addJitter(point, jitterIntensity);

    dispatchMouseMove(point);
    currentCursorPos = point;

    // Calculate delay with variation
    let delay = stepDelay * (0.7 + Math.random() * 0.6);

    // Occasional micro-pauses (humans don't move perfectly smoothly)
    if (i > 3 && i < steps - 3) {
      lastPauseTime += delay;
      if (lastPauseTime > pauseInterval && Math.random() < 0.15) {
        delay += 20 + Math.random() * 40; // 20-60ms micro-pause
        lastPauseTime = 0;
      }
    }

    await sleep(delay);
  }

  // Final correction to ensure we're at target (with tiny jitter)
  const finalPoint = addJitter(end, 0.5);
  dispatchMouseMove(finalPoint);
  currentCursorPos = finalPoint;
}

// Hover over an element briefly before clicking
async function hoverBeforeClick(x: number, y: number): Promise<void> {
  // First move to the target
  await moveMouseNaturally(x, y);

  // Small random overshoot and correction (humans often overshoot slightly)
  if (Math.random() < 0.3) {
    const overshootX = x + gaussianRandom(0, 5);
    const overshootY = y + gaussianRandom(0, 5);
    dispatchMouseMove({ x: overshootX, y: overshootY });
    currentCursorPos = { x: overshootX, y: overshootY };
    await sleep(30 + Math.random() * 50);

    // Correct to actual target
    await moveMouseNaturally(x, y);
  }

  // Brief hover pause before clicking (humans pause before clicking)
  await sleep(50 + Math.random() * 150);
}

// ============================================
// Human-Like Typing System
// Variable speed, typos, and corrections
// ============================================

// Common typo patterns (nearby keys on QWERTY)
const NEARBY_KEYS: Record<string, string[]> = {
  'a': ['s', 'q', 'w', 'z'],
  'b': ['v', 'n', 'g', 'h'],
  'c': ['x', 'v', 'd', 'f'],
  'd': ['s', 'f', 'e', 'r', 'c', 'x'],
  'e': ['w', 'r', 'd', 's'],
  'f': ['d', 'g', 'r', 't', 'v', 'c'],
  'g': ['f', 'h', 't', 'y', 'b', 'v'],
  'h': ['g', 'j', 'y', 'u', 'n', 'b'],
  'i': ['u', 'o', 'k', 'j'],
  'j': ['h', 'k', 'u', 'i', 'm', 'n'],
  'k': ['j', 'l', 'i', 'o', 'm'],
  'l': ['k', 'o', 'p'],
  'm': ['n', 'j', 'k'],
  'n': ['b', 'm', 'h', 'j'],
  'o': ['i', 'p', 'k', 'l'],
  'p': ['o', 'l'],
  'q': ['w', 'a'],
  'r': ['e', 't', 'd', 'f'],
  's': ['a', 'd', 'w', 'e', 'x', 'z'],
  't': ['r', 'y', 'f', 'g'],
  'u': ['y', 'i', 'h', 'j'],
  'v': ['c', 'b', 'f', 'g'],
  'w': ['q', 'e', 'a', 's'],
  'x': ['z', 'c', 's', 'd'],
  'y': ['t', 'u', 'g', 'h'],
  'z': ['a', 'x', 's'],
  '0': ['9', '-'],
  '1': ['2', '`'],
  '2': ['1', '3', 'q'],
  '3': ['2', '4', 'w'],
  '4': ['3', '5', 'e'],
  '5': ['4', '6', 'r'],
  '6': ['5', '7', 't'],
  '7': ['6', '8', 'y'],
  '8': ['7', '9', 'u'],
  '9': ['8', '0', 'i'],
};

// Get a typo character for a given key
function getTypoChar(char: string): string {
  const lower = char.toLowerCase();
  const nearby = NEARBY_KEYS[lower];
  if (!nearby || nearby.length === 0) return char;

  const typoChar = nearby[Math.floor(Math.random() * nearby.length)];
  // Preserve case
  return char === char.toUpperCase() ? typoChar.toUpperCase() : typoChar;
}

// Generate typing delay with natural variation
function getTypingDelay(char: string, prevChar: string | null, wordPosition: number, wordLength: number): number {
  // Base delay: 50-150ms
  let delay = 50 + Math.random() * 100;

  // Faster in the middle of familiar patterns
  if (wordPosition > 0 && wordPosition < wordLength - 1) {
    delay *= 0.8 + Math.random() * 0.3;
  }

  // Slower at start of words
  if (wordPosition === 0) {
    delay += 30 + Math.random() * 50;
  }

  // Slower for capital letters (shift key)
  if (char === char.toUpperCase() && char !== char.toLowerCase()) {
    delay += 20 + Math.random() * 40;
  }

  // Slower for numbers and special characters
  if (/[0-9]/.test(char)) {
    delay += 40 + Math.random() * 60;
  }
  if (/[^a-zA-Z0-9\s]/.test(char)) {
    delay += 30 + Math.random() * 50;
  }

  // Pause after spaces and punctuation
  if (prevChar === ' ') {
    delay += 20 + Math.random() * 60;
  }
  if (prevChar && /[.,!?;:]/.test(prevChar)) {
    delay += 50 + Math.random() * 100;
  }

  // Same finger penalty (same key twice)
  if (prevChar && prevChar.toLowerCase() === char.toLowerCase()) {
    delay += 20 + Math.random() * 30;
  }

  // Occasional longer pauses (thinking)
  if (Math.random() < 0.03) {
    delay += 100 + Math.random() * 200;
  }

  // Occasional burst of fast typing
  if (Math.random() < 0.1) {
    delay *= 0.5 + Math.random() * 0.3;
  }

  return Math.max(30, delay);
}

// Simulate pressing backspace to delete characters
async function typeBackspace(element: HTMLInputElement | HTMLTextAreaElement, count: number = 1): Promise<void> {
  for (let i = 0; i < count; i++) {
    // Dispatch key events for backspace
    element.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Backspace',
      code: 'Backspace',
      keyCode: 8,
      which: 8,
      bubbles: true
    }));

    // Actually delete the character
    const currentValue = element.value;
    element.value = currentValue.slice(0, -1);

    element.dispatchEvent(new Event('input', { bubbles: true }));

    element.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Backspace',
      code: 'Backspace',
      keyCode: 8,
      which: 8,
      bubbles: true
    }));

    // Delay between backspaces (faster than typing)
    await sleep(30 + Math.random() * 50);
  }
}

// Type a single character with events
async function typeSingleChar(element: HTMLInputElement | HTMLTextAreaElement, char: string): Promise<void> {
  element.dispatchEvent(new KeyboardEvent('keydown', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keypress', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true }));
  element.value += char;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent('keyup', { key: char, code: `Key${char.toUpperCase()}`, bubbles: true }));
}

// Detect Google One Tap and social login overlays
function detectSocialLoginOverlays(): string[] {
  const overlays: string[] = [];

  // Google One Tap iframe
  const googleOneTap = document.querySelector('iframe[src*="accounts.google.com"]') ||
                       document.querySelector('#credential_picker_container') ||
                       document.querySelector('[id*="g_id_"]') ||
                       document.querySelector('.g_id_signin');
  if (googleOneTap) {
    overlays.push('[OVERLAY] Google One Tap login popup detected - use press_escape to close');
  }

  // Generic social login modals
  const socialModals = document.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="popup"], [role="dialog"]');
  socialModals.forEach(modal => {
    const text = (modal as HTMLElement).innerText?.toLowerCase() || '';
    if (text.includes('sign in with google') || text.includes('continue with google') ||
        text.includes('sign in with apple') || text.includes('sign in with facebook')) {
      overlays.push('[OVERLAY] Social login modal detected - close it with X button or press_escape');
    }
  });

  // Cookie consent popups
  const cookieSelectors = ['[class*="cookie"]', '[class*="consent"]', '[id*="cookie"]', '[id*="consent"]', '[class*="gdpr"]'];
  cookieSelectors.forEach(sel => {
    const el = document.querySelector(sel);
    if (el && (el as HTMLElement).offsetHeight > 50) {
      const text = (el as HTMLElement).innerText?.toLowerCase() || '';
      if (text.includes('cookie') || text.includes('accept')) {
        overlays.push('[OVERLAY] Cookie consent popup - click Accept/Allow to dismiss');
      }
    }
  });

  return overlays;
}

// Build DOM tree of interactive elements
function buildDOMTree(): { elements: DOMElement[]; domString: string } {
  const elements: DOMElement[] = [];
  const lines: string[] = [];

  // First, detect overlays
  const overlays = detectSocialLoginOverlays();
  overlays.forEach(o => lines.push(o));
  if (overlays.length > 0) {
    lines.push('---');
  }

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

// Click element by index with natural mouse movement
async function clickElement(index: number): Promise<string> {
  const { elements } = buildDOMTree();
  const elem = elements[index];

  if (!elem) {
    return `Error: Element [${index}] not found`;
  }

  // Add slight randomness to click position within element (humans don't click exactly center)
  const xOffset = (Math.random() - 0.5) * elem.rect.width * 0.4; // Within 40% of center
  const yOffset = (Math.random() - 0.5) * elem.rect.height * 0.4;
  const x = elem.rect.x + elem.rect.width / 2 + xOffset;
  const y = elem.rect.y + elem.rect.height / 2 + yOffset;

  // Scroll into view if needed (with natural scroll)
  if (y < 0 || y > window.innerHeight) {
    const scrollTarget = y - window.innerHeight / 2 + (Math.random() - 0.5) * 50;
    await smoothHumanScroll(scrollTarget - window.scrollY);
    await sleep(200 + Math.random() * 200);
  }

  // Move mouse naturally to the target with hover
  await hoverBeforeClick(x, y);

  const target = document.elementFromPoint(x, y) as HTMLElement;
  if (!target) {
    return `Error: Could not find element at position (${x}, ${y})`;
  }

  // Dispatch mouseenter/mouseover events (natural hover behavior)
  target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: x, clientY: y }));
  target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: x, clientY: y }));

  // Small pre-click pause (humans hesitate slightly)
  await sleep(20 + Math.random() * 80);

  // Simulate human-like click with natural timing
  target.dispatchEvent(new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1
  }));

  // Variable mousedown duration (30-120ms, humans vary)
  await sleep(30 + Math.random() * 90);

  target.dispatchEvent(new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 0
  }));

  // Slight delay before click event
  await sleep(5 + Math.random() * 15);

  target.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0
  }));

  // Also try native click
  if (typeof target.click === 'function') {
    target.click();
  }

  // Small movement after click (humans don't keep mouse perfectly still)
  if (Math.random() < 0.4) {
    await sleep(50 + Math.random() * 100);
    const driftX = x + gaussianRandom(0, 3);
    const driftY = y + gaussianRandom(0, 3);
    dispatchMouseMove({ x: driftX, y: driftY });
    currentCursorPos = { x: driftX, y: driftY };
  }

  return `Clicked [${index}] <${elem.tag}> "${elem.text.slice(0, 30)}"`;
}

// Smooth human-like scrolling
async function smoothHumanScroll(totalDelta: number): Promise<void> {
  const direction = totalDelta > 0 ? 1 : -1;
  const absDelta = Math.abs(totalDelta);

  // Calculate number of scroll steps (more steps for larger scrolls)
  const baseSteps = 8 + Math.floor(Math.random() * 5);
  const steps = Math.min(baseSteps + Math.floor(absDelta / 200), 20);

  // Use ease-out pattern (fast start, slow end)
  let scrolled = 0;
  for (let i = 0; i < steps; i++) {
    // Ease-out: more scroll at beginning, less at end
    const progress = i / steps;
    const easeOut = 1 - Math.pow(1 - progress, 2);
    const nextProgress = (i + 1) / steps;
    const nextEaseOut = 1 - Math.pow(1 - nextProgress, 2);

    const stepScroll = (nextEaseOut - easeOut) * absDelta * direction;

    // Add variation to each step
    const variation = stepScroll * (0.8 + Math.random() * 0.4);

    window.scrollBy({
      top: variation + gaussianRandom(0, 3),
      behavior: 'auto'
    });

    scrolled += variation;

    // Variable delay between scroll steps
    const delay = 15 + Math.random() * 25;
    await sleep(delay);

    // Occasional micro-pause in scrolling
    if (Math.random() < 0.1 && i > 2 && i < steps - 2) {
      await sleep(30 + Math.random() * 50);
    }
  }
}

// Type text into focused element with human-like behavior (variable speed, typos, corrections)
async function typeText(text: string, pressEnter: boolean = false): Promise<string> {
  const active = document.activeElement as HTMLInputElement | HTMLTextAreaElement;

  if (!active || active === document.body) {
    return 'Error: No element focused. Click on an input first.';
  }

  // Clear existing value with natural behavior
  if (active.value) {
    // Select all and delete (like a human would)
    active.select();
    await sleep(50 + Math.random() * 100);
    await typeBackspace(active, 1);
    active.value = '';
  }
  active.dispatchEvent(new Event('input', { bubbles: true }));

  // Brief pause before starting to type
  await sleep(100 + Math.random() * 200);

  // Split text into words for context-aware typing
  const words = text.split(/(\s+)/);
  let charIndex = 0;
  let prevChar: string | null = null;

  // Determine typo probability (2-5% base chance)
  const typoBaseChance = 0.02 + Math.random() * 0.03;

  for (const word of words) {
    const wordLength = word.length;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];

      // Calculate delay based on context
      const delay = getTypingDelay(char, prevChar, i, wordLength);
      await sleep(delay);

      // Check if we should make a typo (only for letters, not spaces/punctuation)
      const shouldTypo = /[a-zA-Z]/.test(char) &&
                         Math.random() < typoBaseChance &&
                         i > 0 && i < wordLength - 1; // Not at word boundaries

      if (shouldTypo) {
        // Make a typo
        const typoChar = getTypoChar(char);

        // Type the wrong character
        await typeSingleChar(active, typoChar);

        // Realize the mistake after 1-4 more characters (or immediately sometimes)
        const charsBeforeNotice = Math.random() < 0.3 ? 0 : Math.floor(Math.random() * 3) + 1;
        const remainingInWord = word.slice(i + 1, i + 1 + charsBeforeNotice);

        // Type a few more characters before noticing
        for (const nextChar of remainingInWord) {
          await sleep(getTypingDelay(nextChar, typoChar, i + 1, wordLength) * 0.8); // Slightly faster when in flow
          await typeSingleChar(active, nextChar);
        }

        // Pause - realizing the mistake
        await sleep(150 + Math.random() * 300);

        // Delete the typo and any extra characters
        const charsToDelete = 1 + remainingInWord.length;
        await typeBackspace(active, charsToDelete);

        // Brief pause after correcting
        await sleep(80 + Math.random() * 120);

        // Type the correct character
        await typeSingleChar(active, char);

        // Now type the characters we deleted correctly
        for (let j = 0; j < remainingInWord.length; j++) {
          const reTypeChar = remainingInWord[j];
          await sleep(getTypingDelay(reTypeChar, j === 0 ? char : remainingInWord[j-1], i + j + 1, wordLength));
          await typeSingleChar(active, reTypeChar);
        }

        // Skip the characters we already retyped
        i += remainingInWord.length;
        prevChar = remainingInWord.length > 0 ? remainingInWord[remainingInWord.length - 1] : char;
      } else {
        // Normal typing
        await typeSingleChar(active, char);
        prevChar = char;
      }

      charIndex++;
    }
  }

  if (pressEnter) {
    // Pause before pressing enter (like reviewing what was typed)
    await sleep(150 + Math.random() * 250);

    active.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    }));

    await sleep(30 + Math.random() * 50);

    active.dispatchEvent(new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    }));

    active.dispatchEvent(new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true
    }));

    // Submit form if exists
    const form = active.closest('form');
    if (form) {
      await sleep(10 + Math.random() * 30);
      form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  }

  return `Typed "${text.slice(0, 30)}${text.length > 30 ? '...' : ''}"${pressEnter ? ' and pressed Enter' : ''}`;
}

// Scroll page with human-like behavior
async function scrollPage(direction: 'up' | 'down', amount: number = 500): Promise<string> {
  // Add randomness to scroll amount (humans don't scroll exact amounts)
  const variation = amount * (0.85 + Math.random() * 0.3); // 85-115% of requested amount
  const delta = direction === 'down' ? variation : -variation;

  // Use natural human scroll
  await smoothHumanScroll(delta);

  // Small random post-scroll adjustment (humans often overshoot slightly)
  if (Math.random() < 0.2) {
    await sleep(100 + Math.random() * 150);
    const correction = gaussianRandom(0, 30);
    window.scrollBy({ top: correction, behavior: 'auto' });
  }

  return `Scrolled ${direction} ${Math.round(variation)}px`;
}

// Wait/sleep
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Click at specific coordinates with human-like mouse movement (for vision mode)
async function clickAtCoordinates(x: number, y: number): Promise<string> {
  // Add slight randomness to click position
  const actualX = x + gaussianRandom(0, 2);
  const actualY = y + gaussianRandom(0, 2);

  // Scroll into view if needed (with natural scroll)
  if (actualY < 0 || actualY > window.innerHeight) {
    const scrollTarget = actualY - window.innerHeight / 2;
    await smoothHumanScroll(scrollTarget);
    await sleep(200 + Math.random() * 200);
  }

  // Move mouse naturally to target with hover
  await hoverBeforeClick(actualX, actualY);

  const target = document.elementFromPoint(actualX, actualY) as HTMLElement;
  if (!target) {
    return `Error: No element found at coordinates (${actualX}, ${actualY})`;
  }

  // Dispatch hover events
  target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: actualX, clientY: actualY }));
  target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, clientX: actualX, clientY: actualY }));

  // Small pre-click pause
  await sleep(30 + Math.random() * 70);

  // Natural click sequence
  target.dispatchEvent(new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: actualX,
    clientY: actualY,
    button: 0,
    buttons: 1
  }));

  // Variable mousedown duration
  await sleep(40 + Math.random() * 80);

  target.dispatchEvent(new MouseEvent('mouseup', {
    bubbles: true,
    cancelable: true,
    clientX: actualX,
    clientY: actualY,
    button: 0,
    buttons: 0
  }));

  await sleep(5 + Math.random() * 15);

  target.dispatchEvent(new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    clientX: actualX,
    clientY: actualY,
    button: 0
  }));

  // Also try native click
  if (typeof target.click === 'function') {
    target.click();
  }

  // Post-click drift
  if (Math.random() < 0.3) {
    await sleep(50 + Math.random() * 100);
    const driftX = actualX + gaussianRandom(0, 4);
    const driftY = actualY + gaussianRandom(0, 4);
    dispatchMouseMove({ x: driftX, y: driftY });
    currentCursorPos = { x: driftX, y: driftY };
  }

  return `Clicked at coordinates (${Math.round(actualX)}, ${Math.round(actualY)}) on <${target.tagName.toLowerCase()}>`;
}

// Press a key with human-like timing (for closing popups, overlays, etc.)
async function pressKey(key: string): Promise<string> {
  const keyMap: Record<string, { key: string; code: string; keyCode: number }> = {
    'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
    'Enter': { key: 'Enter', code: 'Enter', keyCode: 13 },
    'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
    'Space': { key: ' ', code: 'Space', keyCode: 32 },
    'ArrowUp': { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
    'ArrowDown': { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
    'ArrowLeft': { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
    'ArrowRight': { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  };

  const keyInfo = keyMap[key] || { key, code: key, keyCode: 0 };
  const target = document.activeElement || document.body;

  // Brief pause before pressing key (human reaction time)
  await sleep(50 + Math.random() * 100);

  // Dispatch keydown event
  target.dispatchEvent(new KeyboardEvent('keydown', {
    key: keyInfo.key,
    code: keyInfo.code,
    keyCode: keyInfo.keyCode,
    which: keyInfo.keyCode,
    bubbles: true,
    cancelable: true
  }));

  // Variable key hold duration (humans don't have consistent key press durations)
  const holdDuration = 40 + Math.random() * 80; // 40-120ms
  await sleep(holdDuration);

  target.dispatchEvent(new KeyboardEvent('keyup', {
    key: keyInfo.key,
    code: keyInfo.code,
    keyCode: keyInfo.keyCode,
    which: keyInfo.keyCode,
    bubbles: true,
    cancelable: true
  }));

  // Sometimes humans press a key multiple times when trying to close something
  if (key === 'Escape' && Math.random() < 0.15) {
    await sleep(100 + Math.random() * 150);
    // Second press
    target.dispatchEvent(new KeyboardEvent('keydown', {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.keyCode,
      bubbles: true,
      cancelable: true
    }));
    await sleep(30 + Math.random() * 50);
    target.dispatchEvent(new KeyboardEvent('keyup', {
      key: keyInfo.key,
      code: keyInfo.code,
      keyCode: keyInfo.keyCode,
      which: keyInfo.keyCode,
      bubbles: true,
      cancelable: true
    }));
  }

  return `Pressed key: ${key}`;
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

        case 'CLICK_COORDINATES':
          const coordResult = await clickAtCoordinates(payload.x, payload.y);
          sendResponse({ result: coordResult });
          break;

        case 'PRESS_KEY':
          const keyResult = await pressKey(payload.key);
          sendResponse({ result: keyResult });
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
