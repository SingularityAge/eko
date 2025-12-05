export interface PersonaTraits {
  typingSpeed: 'slow' | 'normal' | 'fast';
  errorRate: number;
}

export class KeyboardEmulator {
  private keyboardLayout: Record<string, string[]> = {
    'q': ['w', 'a'],
    'w': ['q', 'e', 's'],
    'e': ['w', 'r', 'd'],
    'r': ['e', 't', 'f'],
    't': ['r', 'y', 'g'],
    'y': ['t', 'u', 'h'],
    'u': ['y', 'i', 'j'],
    'i': ['u', 'o', 'k'],
    'o': ['i', 'p', 'l'],
    'p': ['o', 'l'],
    'a': ['q', 's', 'z'],
    's': ['w', 'a', 'd', 'x'],
    'd': ['e', 's', 'f', 'c'],
    'f': ['r', 'd', 'g', 'v'],
    'g': ['t', 'f', 'h', 'b'],
    'h': ['y', 'g', 'j', 'n'],
    'j': ['u', 'h', 'k', 'm'],
    'k': ['i', 'j', 'l'],
    'l': ['o', 'k', 'p'],
    'z': ['a', 'x'],
    'x': ['z', 's', 'c'],
    'c': ['x', 'd', 'v'],
    'v': ['c', 'f', 'b'],
    'b': ['v', 'g', 'n'],
    'n': ['b', 'h', 'm'],
    'm': ['n', 'j'],
  };

  private personaTraits: PersonaTraits = {
    typingSpeed: 'normal',
    errorRate: 0.05,
  };

  constructor(traits?: Partial<PersonaTraits>) {
    if (traits) {
      this.personaTraits = { ...this.personaTraits, ...traits };
    }
  }

  async typeText(element: HTMLInputElement | HTMLTextAreaElement, text: string): Promise<void> {
    element.focus();
    await this.wait(this.randomDelay(200, 500));

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (Math.random() < this.personaTraits.errorRate && this.keyboardLayout[char.toLowerCase()]) {
        await this.typeWithTypo(element, char);
      } else {
        await this.typeCharacter(element, char);
      }

      const delay = this.getTypingDelay();
      await this.wait(delay);
    }

    await this.wait(this.randomDelay(100, 300));
  }

  private async typeWithTypo(element: HTMLInputElement | HTMLTextAreaElement, correctChar: string): Promise<void> {
    const neighbors = this.keyboardLayout[correctChar.toLowerCase()];
    if (!neighbors || neighbors.length === 0) {
      await this.typeCharacter(element, correctChar);
      return;
    }

    const typo = neighbors[Math.floor(Math.random() * neighbors.length)];

    await this.typeCharacter(element, typo);
    await this.wait(this.randomDelay(100, 300));

    await this.pressBackspace(element);
    await this.wait(this.randomDelay(50, 150));

    await this.typeCharacter(element, correctChar);
  }

  private async typeCharacter(element: HTMLInputElement | HTMLTextAreaElement, char: string): Promise<void> {
    const keydownEvent = new KeyboardEvent('keydown', {
      key: char,
      code: this.getKeyCode(char),
      bubbles: true,
      cancelable: true,
    });

    const keypressEvent = new KeyboardEvent('keypress', {
      key: char,
      code: this.getKeyCode(char),
      bubbles: true,
      cancelable: true,
    });

    const keyupEvent = new KeyboardEvent('keyup', {
      key: char,
      code: this.getKeyCode(char),
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(keypressEvent);

    element.value += char;
    element.dispatchEvent(new Event('input', { bubbles: true }));

    await this.wait(this.randomDelay(30, 80));
    element.dispatchEvent(keyupEvent);
  }

  private async pressBackspace(element: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Backspace',
      code: 'Backspace',
      bubbles: true,
      cancelable: true,
    });

    const keyupEvent = new KeyboardEvent('keyup', {
      key: 'Backspace',
      code: 'Backspace',
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(keydownEvent);

    element.value = element.value.slice(0, -1);
    element.dispatchEvent(new Event('input', { bubbles: true }));

    await this.wait(this.randomDelay(30, 80));
    element.dispatchEvent(keyupEvent);
  }

  private getTypingDelay(): number {
    switch (this.personaTraits.typingSpeed) {
      case 'slow':
        return this.randomDelay(150, 300);
      case 'fast':
        return this.randomDelay(30, 80);
      case 'normal':
      default:
        return this.randomDelay(80, 200);
    }
  }

  private getKeyCode(char: string): string {
    if (char === ' ') return 'Space';
    if (char === '\n') return 'Enter';
    if (char.length === 1) return `Key${char.toUpperCase()}`;
    return char;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async pressEnter(element: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    const keypressEvent = new KeyboardEvent('keypress', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    const keyupEvent = new KeyboardEvent('keyup', {
      key: 'Enter',
      code: 'Enter',
      bubbles: true,
      cancelable: true,
    });

    element.dispatchEvent(keydownEvent);
    element.dispatchEvent(keypressEvent);
    await this.wait(this.randomDelay(50, 100));
    element.dispatchEvent(keyupEvent);
  }
}
