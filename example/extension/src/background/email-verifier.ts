export interface EmailMessage {
  from: string;
  subject: string;
  content: string;
  timestamp: Date;
}

export interface VerificationResult {
  type: 'code' | 'link';
  value: string;
  domain: string;
}

export class EmailVerifier {
  private pollingInterval: number = 10000;
  private activePolling: boolean = false;
  private pollingTimer: number | null = null;

  constructor() {}

  async startPolling(domain: string, callback: (result: VerificationResult) => void): Promise<void> {
    if (this.activePolling) {
      console.log('Email polling already active');
      return;
    }

    this.activePolling = true;
    console.log(`Starting email polling for domain: ${domain}`);

    this.pollingTimer = setInterval(async () => {
      try {
        const result = await this.checkInbox(domain);
        if (result) {
          this.stopPolling();
          callback(result);
        }
      } catch (error) {
        console.error('Error polling inbox:', error);
      }
    }, this.pollingInterval);
  }

  stopPolling(): void {
    if (this.pollingTimer !== null) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.activePolling = false;
    console.log('Email polling stopped');
  }

  private async checkInbox(domain: string): Promise<VerificationResult | null> {
    const tabs = await chrome.tabs.query({});
    const emailTabs = tabs.filter(tab =>
      tab.url?.includes('protonmail.com') ||
      tab.url?.includes('mail.proton.me')
    );

    if (emailTabs.length === 0) {
      console.log('No ProtonMail tabs found');
      return null;
    }

    const emailTab = emailTabs[0];
    if (!emailTab.id) return null;

    try {
      const result = await chrome.tabs.sendMessage(emailTab.id, {
        type: 'scanInbox',
        data: { domain },
      }) as unknown as VerificationResult | null;

      return result;
    } catch (error) {
      console.log('Could not scan inbox:', error);
      return null;
    }
  }

  extractVerificationCode(text: string, pattern?: RegExp | string): string | null {
    const defaultPattern = /\b\d{6}\b/;
    const regex = pattern instanceof RegExp ? pattern : defaultPattern;

    const match = text.match(regex);
    return match ? match[0] : null;
  }

  extractVerificationLink(text: string, pattern?: RegExp | string): string | null {
    const defaultPattern = /(https?:\/\/[^\s]+(?:verify|confirm)[^\s]*)/i;
    const regex = pattern instanceof RegExp ? pattern : defaultPattern;

    const match = text.match(regex);
    return match ? match[1] : null;
  }

  async openEmailAndExtract(
    emailTab: chrome.tabs.Tab,
    emailSelector: string,
    domain: string,
    verificationType: 'code' | 'link',
    pattern?: RegExp | string
  ): Promise<VerificationResult | null> {
    if (!emailTab.id) return null;

    try {
      await chrome.tabs.sendMessage(emailTab.id, {
        type: 'openEmail',
        data: { selector: emailSelector },
      });

      await this.wait(2000);

      const content = await chrome.tabs.sendMessage(emailTab.id, {
        type: 'getEmailContent',
      }) as unknown as string;

      if (!content) return null;

      if (verificationType === 'code') {
        const code = this.extractVerificationCode(content, pattern);
        if (code) {
          return { type: 'code', value: code, domain };
        }
      } else {
        const link = this.extractVerificationLink(content, pattern);
        if (link) {
          return { type: 'link', value: link, domain };
        }
      }

      return null;
    } catch (error) {
      console.error('Error opening email:', error);
      return null;
    }
  }

  async fillVerificationCode(targetTab: chrome.tabs.Tab, code: string): Promise<void> {
    if (!targetTab.id) return;

    try {
      await chrome.tabs.sendMessage(targetTab.id, {
        type: 'fillVerificationCode',
        data: { code },
      });
    } catch (error) {
      console.error('Error filling verification code:', error);
    }
  }

  async clickVerificationLink(targetTab: chrome.tabs.Tab, link: string): Promise<void> {
    if (!targetTab.id) return;

    try {
      await chrome.tabs.update(targetTab.id, { url: link });
    } catch (error) {
      console.error('Error clicking verification link:', error);
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
