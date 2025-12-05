export interface BrowserAction {
  type: 'navigate' | 'scroll' | 'read' | 'click' | 'type' | 'wait';
  data?: any;
}

export class BrowserAutomation {
  private isActive = false;
  private currentAction: BrowserAction | null = null;

  constructor() {}

  async start(): Promise<void> {
    this.isActive = true;
  }

  stop(): void {
    this.isActive = false;
  }

  async executeAction(action: BrowserAction): Promise<void> {
    if (!this.isActive) return;

    this.currentAction = action;

    switch (action.type) {
      case 'navigate':
        await this.navigate(action.data.url);
        break;
      case 'scroll':
        await this.scroll(action.data.amount);
        break;
      case 'read':
        await this.simulateReading(action.data.duration);
        break;
      case 'click':
        await this.click(action.data.selector);
        break;
      case 'type':
        await this.typeText(action.data.selector, action.data.text);
        break;
      case 'wait':
        await this.wait(action.data.duration);
        break;
    }

    this.currentAction = null;
  }

  private async navigate(url: string): Promise<void> {
    const delay = this.randomDelay(2000, 10000);
    await this.wait(delay);
    window.location.href = url;
  }

  private async scroll(amount: number = 300): Promise<void> {
    const duration = this.randomDelay(500, 2000);
    const start = window.scrollY;
    const startTime = Date.now();

    return new Promise((resolve) => {
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeProgress = this.quadraticEaseInOut(progress);

        const currentScroll = start + (amount * easeProgress);
        window.scrollTo(0, currentScroll);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  private quadraticEaseInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  async simulateReading(duration?: number): Promise<void> {
    const readTime = duration || this.randomDelay(10000, 60000);
    const scrolls = Math.floor(readTime / 3000);

    for (let i = 0; i < scrolls; i++) {
      if (!this.isActive) break;

      const scrollAmount = this.randomDelay(200, 500);
      await this.scroll(scrollAmount);

      await this.wait(this.randomDelay(2000, 5000));

      await this.simulateFocusMovement();
    }
  }

  private async simulateFocusMovement(): Promise<void> {
    const elements = document.querySelectorAll('a, button, input, h1, h2, h3, p, img');
    if (elements.length === 0) return;

    const randomElement = elements[Math.floor(Math.random() * elements.length)] as HTMLElement;

    if (randomElement && typeof randomElement.scrollIntoView === 'function') {
      randomElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }

    await this.wait(this.randomDelay(500, 1500));
  }

  private async click(selector: string): Promise<void> {
    const element = document.querySelector(selector) as HTMLElement;
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.wait(this.randomDelay(500, 1000));

    element.click();
  }

  private async typeText(selector: string, text: string): Promise<void> {
    const element = document.querySelector(selector) as HTMLInputElement;
    if (!element) return;

    element.focus();
    await this.wait(this.randomDelay(300, 800));

    for (const char of text) {
      element.value += char;
      element.dispatchEvent(new Event('input', { bubbles: true }));

      const typingDelay = this.randomDelay(50, 200);
      await this.wait(typingDelay);
    }

    await this.wait(this.randomDelay(200, 500));
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async loginToEmail(email: string, password: string): Promise<void> {
    console.log('Attempting email login...');

    await this.wait(3000);

    const emailInput = document.querySelector('input[type="email"], input[name="email"], input[id*="email"]');
    if (emailInput) {
      await this.typeText('input[type="email"], input[name="email"], input[id*="email"]', email);
      await this.wait(1000);
    }

    const passwordInput = document.querySelector('input[type="password"]');
    if (passwordInput) {
      await this.typeText('input[type="password"]', password);
      await this.wait(1000);
    }

    const loginButton = document.querySelector('button[type="submit"], button[id*="login"], button[class*="login"]');
    if (loginButton) {
      await this.click('button[type="submit"], button[id*="login"], button[class*="login"]');
    }
  }

  getRandomLink(): string | null {
    const links = Array.from(document.querySelectorAll('a[href]'))
      .map((a) => (a as HTMLAnchorElement).href)
      .filter((href) => {
        try {
          const url = new URL(href);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      });

    if (links.length === 0) return null;

    return links[Math.floor(Math.random() * links.length)];
  }

  async getDistractedAndOpenRelatedTab(): Promise<string | null> {
    if (Math.random() > 0.2) return null;

    const relatedUrls: Record<string, string[]> = {
      'reddit.com': ['https://www.youtube.com', 'https://twitter.com', 'https://imgur.com'],
      'youtube.com': ['https://www.reddit.com', 'https://twitter.com', 'https://twitch.tv'],
      'twitter.com': ['https://www.reddit.com', 'https://www.youtube.com', 'https://news.ycombinator.com'],
      'github.com': ['https://stackoverflow.com', 'https://dev.to', 'https://news.ycombinator.com'],
      'stackoverflow.com': ['https://github.com', 'https://dev.to', 'https://reddit.com/r/programming'],
    };

    const currentDomain = window.location.hostname;

    for (const [domain, urls] of Object.entries(relatedUrls)) {
      if (currentDomain.includes(domain)) {
        const randomUrl = urls[Math.floor(Math.random() * urls.length)];
        return randomUrl;
      }
    }

    return this.getRandomLink();
  }
}
