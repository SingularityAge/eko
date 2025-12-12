// ============================================
// Human Behavior Simulation
// Natural mouse movements, typing, scrolling
// ============================================

// Bezier curve for smooth mouse movement
function bezierPoint(
  t: number,
  p0: number,
  p1: number,
  p2: number,
  p3: number
): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

// Generate random control points for natural curves
function generateControlPoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { cp1: { x: number; y: number }; cp2: { x: number; y: number } } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Random offset perpendicular to the path
  const perpX = -dy / distance;
  const perpY = dx / distance;
  const curvature = (Math.random() - 0.5) * distance * 0.5;

  return {
    cp1: {
      x: start.x + dx * 0.3 + perpX * curvature,
      y: start.y + dy * 0.3 + perpY * curvature
    },
    cp2: {
      x: start.x + dx * 0.7 + perpX * curvature * 0.5,
      y: start.y + dy * 0.7 + perpY * curvature * 0.5
    }
  };
}

// Generate natural mouse path points
export function generateMousePath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  steps: number = 20
): Array<{ x: number; y: number; delay: number }> {
  const path: Array<{ x: number; y: number; delay: number }> = [];
  const { cp1, cp2 } = generateControlPoints(
    { x: startX, y: startY },
    { x: endX, y: endY }
  );

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    // Ease in-out for more natural movement
    const easedT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const x = bezierPoint(easedT, startX, cp1.x, cp2.x, endX);
    const y = bezierPoint(easedT, startY, cp1.y, cp2.y, endY);

    // Add small jitter for realism
    const jitterX = (Math.random() - 0.5) * 2;
    const jitterY = (Math.random() - 0.5) * 2;

    // Variable delay - slower at start and end
    let delay = 5 + Math.random() * 10;
    if (i < steps * 0.2 || i > steps * 0.8) {
      delay *= 1.5;
    }

    path.push({
      x: Math.round(x + jitterX),
      y: Math.round(y + jitterY),
      delay: Math.round(delay)
    });
  }

  return path;
}

// Mouse Movement Emulator
export class MouseEmulator {
  private currentX: number = 0;
  private currentY: number = 0;

  constructor() {
    // Track mouse position
    document.addEventListener('mousemove', (e) => {
      this.currentX = e.clientX;
      this.currentY = e.clientY;
    });
  }

  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }

  async moveTo(x: number, y: number, speed: number = 1): Promise<void> {
    const path = generateMousePath(
      this.currentX,
      this.currentY,
      x,
      y,
      Math.round(20 / speed)
    );

    for (const point of path) {
      const event = new MouseEvent('mousemove', {
        clientX: point.x,
        clientY: point.y,
        bubbles: true,
        cancelable: true
      });

      document.elementFromPoint(point.x, point.y)?.dispatchEvent(event);

      this.currentX = point.x;
      this.currentY = point.y;

      await sleep(point.delay / speed);
    }
  }

  async click(x?: number, y?: number, button: 'left' | 'right' = 'left'): Promise<void> {
    if (x !== undefined && y !== undefined) {
      await this.moveTo(x, y);
    }

    const targetX = x ?? this.currentX;
    const targetY = y ?? this.currentY;
    const target = document.elementFromPoint(targetX, targetY);

    if (!target) return;

    // Small movement before click (human behavior)
    const jitterX = (Math.random() - 0.5) * 3;
    const jitterY = (Math.random() - 0.5) * 3;
    await this.moveTo(targetX + jitterX, targetY + jitterY, 2);

    // Mouse down
    const mousedownEvent = new MouseEvent('mousedown', {
      clientX: targetX,
      clientY: targetY,
      button: button === 'left' ? 0 : 2,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(mousedownEvent);

    // Small delay for click
    await sleep(50 + Math.random() * 100);

    // Mouse up
    const mouseupEvent = new MouseEvent('mouseup', {
      clientX: targetX,
      clientY: targetY,
      button: button === 'left' ? 0 : 2,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(mouseupEvent);

    // Click event
    const clickEvent = new MouseEvent('click', {
      clientX: targetX,
      clientY: targetY,
      button: button === 'left' ? 0 : 2,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(clickEvent);

    // Focus if input
    if (target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement) {
      target.focus();
    }
  }

  async doubleClick(x?: number, y?: number): Promise<void> {
    await this.click(x, y);
    await sleep(100 + Math.random() * 50);
    await this.click(x, y);

    const targetX = x ?? this.currentX;
    const targetY = y ?? this.currentY;
    const target = document.elementFromPoint(targetX, targetY);

    if (target) {
      const dblclickEvent = new MouseEvent('dblclick', {
        clientX: targetX,
        clientY: targetY,
        bubbles: true,
        cancelable: true
      });
      target.dispatchEvent(dblclickEvent);
    }
  }

  async hover(x: number, y: number, duration: number = 500): Promise<void> {
    await this.moveTo(x, y);

    const target = document.elementFromPoint(x, y);
    if (target) {
      const mouseenterEvent = new MouseEvent('mouseenter', {
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true
      });
      target.dispatchEvent(mouseenterEvent);
    }

    await sleep(duration);
  }
}

// Keyboard Typing Emulator
export class KeyboardEmulator {
  private typingSpeed: number = 150; // ms per character
  private typoRate: number = 0.02; // 2% chance of typo

  constructor(typingSpeed?: number, typoRate?: number) {
    if (typingSpeed) this.typingSpeed = typingSpeed;
    if (typoRate) this.typoRate = typoRate;
  }

  setTypingSpeed(wpm: number): void {
    // Average word is 5 characters
    this.typingSpeed = 60000 / (wpm * 5);
  }

  setTypoRate(rate: number): void {
    this.typoRate = Math.max(0, Math.min(1, rate));
  }

  // Get nearby keys for realistic typos
  private getNearbyKey(key: string): string {
    const keyboard: Record<string, string[]> = {
      'a': ['s', 'q', 'z', 'w'],
      'b': ['v', 'g', 'h', 'n'],
      'c': ['x', 'd', 'f', 'v'],
      'd': ['s', 'e', 'r', 'f', 'c', 'x'],
      'e': ['w', 'r', 'd', 's'],
      'f': ['d', 'r', 't', 'g', 'v', 'c'],
      'g': ['f', 't', 'y', 'h', 'b', 'v'],
      'h': ['g', 'y', 'u', 'j', 'n', 'b'],
      'i': ['u', 'o', 'k', 'j'],
      'j': ['h', 'u', 'i', 'k', 'm', 'n'],
      'k': ['j', 'i', 'o', 'l', 'm'],
      'l': ['k', 'o', 'p', ';'],
      'm': ['n', 'j', 'k', ','],
      'n': ['b', 'h', 'j', 'm'],
      'o': ['i', 'p', 'l', 'k'],
      'p': ['o', '[', ';', 'l'],
      'q': ['w', 'a', '1', '2'],
      'r': ['e', 't', 'f', 'd'],
      's': ['a', 'w', 'e', 'd', 'x', 'z'],
      't': ['r', 'y', 'g', 'f'],
      'u': ['y', 'i', 'j', 'h'],
      'v': ['c', 'f', 'g', 'b'],
      'w': ['q', 'e', 's', 'a'],
      'x': ['z', 's', 'd', 'c'],
      'y': ['t', 'u', 'h', 'g'],
      'z': ['a', 's', 'x']
    };

    const lowerKey = key.toLowerCase();
    const nearby = keyboard[lowerKey];

    if (!nearby || nearby.length === 0) return key;

    const typoChar = nearby[Math.floor(Math.random() * nearby.length)];
    return key === key.toUpperCase() ? typoChar.toUpperCase() : typoChar;
  }

  // Type a single character with realistic timing
  private async typeChar(
    target: HTMLElement,
    char: string,
    makeTypo: boolean = false
  ): Promise<void> {
    // Key down
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(keydownEvent);

    // Input event for form elements
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.value += char;

      const inputEvent = new InputEvent('input', {
        data: char,
        inputType: 'insertText',
        bubbles: true,
        cancelable: true
      });
      target.dispatchEvent(inputEvent);
    } else if (target.contentEditable === 'true') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(char));
        range.collapse(false);
      }
    }

    // Key up with slight delay
    await sleep(20 + Math.random() * 30);

    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: `Key${char.toUpperCase()}`,
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(keyupEvent);
  }

  // Delete last character (for typo correction)
  private async deleteChar(target: HTMLElement): Promise<void> {
    const backspaceDown = new KeyboardEvent('keydown', {
      key: 'Backspace',
      code: 'Backspace',
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(backspaceDown);

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.value = target.value.slice(0, -1);

      const inputEvent = new InputEvent('input', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true
      });
      target.dispatchEvent(inputEvent);
    }

    await sleep(50 + Math.random() * 50);

    const backspaceUp = new KeyboardEvent('keyup', {
      key: 'Backspace',
      code: 'Backspace',
      bubbles: true,
      cancelable: true
    });
    target.dispatchEvent(backspaceUp);
  }

  // Type text with human-like behavior
  async type(
    target: HTMLElement,
    text: string,
    options: {
      clearFirst?: boolean;
      pressEnter?: boolean;
      withTypos?: boolean;
    } = {}
  ): Promise<void> {
    // Focus the element
    target.focus();

    // Clear if requested
    if (options.clearFirst) {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        target.select();
        await sleep(100);
        target.value = '';
      }
    }

    // Type each character
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // Decide if we should make a typo
      const makeTypo = options.withTypos !== false &&
                       Math.random() < this.typoRate &&
                       /[a-zA-Z]/.test(char);

      if (makeTypo) {
        // Type wrong character
        const typoChar = this.getNearbyKey(char);
        await this.typeChar(target, typoChar);

        // Wait, then correct
        await sleep(150 + Math.random() * 300);
        await this.deleteChar(target);
        await sleep(100 + Math.random() * 100);
      }

      // Type correct character
      await this.typeChar(target, char);

      // Variable delay between characters
      let delay = this.typingSpeed * (0.7 + Math.random() * 0.6);

      // Longer pause after punctuation
      if (['.', ',', '!', '?', ';'].includes(char)) {
        delay *= 2;
      }

      // Pause after words
      if (char === ' ') {
        delay *= 1.5;
      }

      // Occasional thinking pauses
      if (Math.random() < 0.02) {
        delay += 200 + Math.random() * 500;
      }

      await sleep(delay);
    }

    // Press Enter if requested
    if (options.pressEnter) {
      await sleep(100 + Math.random() * 200);
      await this.pressKey('Enter');
    }
  }

  // Press a specific key
  async pressKey(key: string): Promise<void> {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return;

    const keydownEvent = new KeyboardEvent('keydown', {
      key,
      code: key,
      bubbles: true,
      cancelable: true
    });
    activeElement.dispatchEvent(keydownEvent);

    await sleep(50 + Math.random() * 50);

    const keyupEvent = new KeyboardEvent('keyup', {
      key,
      code: key,
      bubbles: true,
      cancelable: true
    });
    activeElement.dispatchEvent(keyupEvent);
  }

  // Type with keyboard shortcuts
  async pressShortcut(keys: string[]): Promise<void> {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return;

    // Press down all keys
    for (const key of keys) {
      const keydownEvent = new KeyboardEvent('keydown', {
        key,
        code: key,
        ctrlKey: keys.includes('Control'),
        shiftKey: keys.includes('Shift'),
        altKey: keys.includes('Alt'),
        metaKey: keys.includes('Meta'),
        bubbles: true,
        cancelable: true
      });
      activeElement.dispatchEvent(keydownEvent);
      await sleep(20);
    }

    await sleep(50);

    // Release all keys
    for (const key of keys.reverse()) {
      const keyupEvent = new KeyboardEvent('keyup', {
        key,
        code: key,
        bubbles: true,
        cancelable: true
      });
      activeElement.dispatchEvent(keyupEvent);
      await sleep(20);
    }
  }
}

// Scroll Emulator
export class ScrollEmulator {
  private isScrolling: boolean = false;

  // Natural scroll with momentum
  async scrollBy(
    deltaY: number,
    speed: 'slow' | 'medium' | 'fast' = 'medium'
  ): Promise<void> {
    if (this.isScrolling) return;
    this.isScrolling = true;

    const speedMap = { slow: 0.5, medium: 1, fast: 2 };
    const scrollSpeed = speedMap[speed];

    const steps = Math.abs(Math.round(deltaY / 50));
    const direction = deltaY > 0 ? 1 : -1;

    // Ease in-out scrolling
    for (let i = 0; i < steps; i++) {
      const progress = i / steps;
      const eased = Math.sin(progress * Math.PI);
      const scrollAmount = direction * 50 * (0.5 + eased);

      window.scrollBy({
        top: scrollAmount,
        behavior: 'auto'
      });

      await sleep((20 + Math.random() * 10) / scrollSpeed);
    }

    this.isScrolling = false;
  }

  // Scroll to specific position
  async scrollTo(y: number, speed: 'slow' | 'medium' | 'fast' = 'medium'): Promise<void> {
    const currentY = window.scrollY;
    const deltaY = y - currentY;
    await this.scrollBy(deltaY, speed);
  }

  // Scroll to element
  async scrollToElement(element: Element, speed: 'slow' | 'medium' | 'fast' = 'medium'): Promise<void> {
    const rect = element.getBoundingClientRect();
    const targetY = window.scrollY + rect.top - window.innerHeight / 3;
    await this.scrollTo(targetY, speed);
  }

  // Random reading scroll (simulates reading)
  async readingScroll(duration: number = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      // Small scroll down
      const scrollAmount = 50 + Math.random() * 100;
      await this.scrollBy(scrollAmount, 'slow');

      // Pause to "read"
      await sleep(1000 + Math.random() * 2000);

      // Occasional scroll back up
      if (Math.random() < 0.1) {
        await this.scrollBy(-scrollAmount * 0.5, 'slow');
        await sleep(500 + Math.random() * 500);
      }
    }
  }
}

// Utility sleep function
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Random delay within range
export function randomDelay(min: number, max: number): Promise<void> {
  return sleep(min + Math.random() * (max - min));
}

// Human-like thinking pause
export function thinkingPause(): Promise<void> {
  return sleep(500 + Math.random() * 2000);
}

// Create combined automation instance
export function createHumanSimulator(config?: {
  typingSpeed?: number;
  typoRate?: number;
}): {
  mouse: MouseEmulator;
  keyboard: KeyboardEmulator;
  scroll: ScrollEmulator;
} {
  const keyboard = new KeyboardEmulator();

  if (config?.typingSpeed) {
    keyboard.setTypingSpeed(config.typingSpeed);
  }
  if (config?.typoRate !== undefined) {
    keyboard.setTypoRate(config.typoRate);
  }

  return {
    mouse: new MouseEmulator(),
    keyboard,
    scroll: new ScrollEmulator()
  };
}
