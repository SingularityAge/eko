export interface TabRecoveryState {
  tabId: number;
  url: string;
  timestamp: number;
  retryCount: number;
}

export class ErrorRecovery {
  private crashedTabs: Map<number, TabRecoveryState> = new Map();
  private maxRetries: number = 3;
  private baseDelay: number = 2000;
  private jitterRange: number = 3000;

  constructor() {
    this.setupListeners();
  }

  private setupListeners(): void {
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'complete') {
        this.crashedTabs.delete(tabId);
      }
    });
  }

  private handleTabRemoved(tabId: number): void {
    const state = this.crashedTabs.get(tabId);
    if (state) {
      console.log(`Tab ${tabId} was removed, may need recovery`);
    }
  }

  async recordTabCrash(tabId: number, url: string): Promise<void> {
    const existing = this.crashedTabs.get(tabId);
    const retryCount = existing ? existing.retryCount + 1 : 0;

    if (retryCount >= this.maxRetries) {
      console.log(`Tab ${tabId} exceeded max retries, giving up`);
      this.crashedTabs.delete(tabId);
      return;
    }

    this.crashedTabs.set(tabId, {
      tabId,
      url,
      timestamp: Date.now(),
      retryCount,
    });

    const delay = this.calculateRecoveryDelay(retryCount);
    console.log(`Scheduling tab recovery in ${delay}ms (retry ${retryCount + 1}/${this.maxRetries})`);

    setTimeout(() => {
      this.attemptRecovery(tabId, url, retryCount);
    }, delay);
  }

  private calculateRecoveryDelay(retryCount: number): number {
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * this.jitterRange;
    return exponentialDelay + jitter;
  }

  private async attemptRecovery(tabId: number, url: string, retryCount: number): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId).catch(() => null);

      if (!tab) {
        console.log(`Tab ${tabId} no longer exists, creating new tab`);
        const newTab = await chrome.tabs.create({ url, active: false });
        console.log(`Created recovery tab ${newTab.id} for ${url}`);

        this.crashedTabs.delete(tabId);
        return;
      }

      if (tab.status === 'complete') {
        console.log(`Tab ${tabId} recovered successfully`);
        this.crashedTabs.delete(tabId);
        return;
      }

      console.log(`Tab ${tabId} still having issues, will retry if needed`);
    } catch (error) {
      console.error(`Error recovering tab ${tabId}:`, error);
    }
  }

  async handleTabError(tabId: number): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.url) {
        await this.recordTabCrash(tabId, tab.url);
      }
    } catch (error) {
      console.error(`Error handling tab error for ${tabId}:`, error);
    }
  }

  clearRecoveryState(): void {
    this.crashedTabs.clear();
  }

  getRecoveryStats(): { totalCrashes: number; recoveredTabs: number } {
    return {
      totalCrashes: this.crashedTabs.size,
      recoveredTabs: 0,
    };
  }
}
