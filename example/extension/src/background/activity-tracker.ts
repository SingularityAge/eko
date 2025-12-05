export interface ActivityEvent {
  id: string;
  timestamp: number;
  type: 'page_visit' | 'search' | 'email_check' | 'distraction' | 'signup' | 'verification' | 'idle';
  url?: string;
  title?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ActivityStats {
  totalEvents: number;
  pageVisits: number;
  searches: number;
  emailChecks: number;
  distractions: number;
  signups: number;
  verifications: number;
  totalActiveTime: number;
  sessionStart: number;
}

export class ActivityTracker {
  private activities: ActivityEvent[] = [];
  private sessionStart: number = Date.now();
  private currentActivity: ActivityEvent | null = null;

  constructor() {
    this.loadFromStorage();
  }

  async trackActivity(
    type: ActivityEvent['type'],
    url?: string,
    title?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    if (this.currentActivity && this.currentActivity.type === type) {
      this.currentActivity.duration = Date.now() - this.currentActivity.timestamp;
      return;
    }

    const event: ActivityEvent = {
      id: this.generateId(),
      timestamp: Date.now(),
      type,
      url,
      title,
      duration: 0,
      metadata,
    };

    this.activities.push(event);
    this.currentActivity = event;

    await this.saveToStorage();

    chrome.runtime.sendMessage({
      type: 'activity_update',
      data: { event, stats: this.getStats() },
    });
  }

  async endCurrentActivity(): Promise<void> {
    if (this.currentActivity) {
      this.currentActivity.duration = Date.now() - this.currentActivity.timestamp;
      this.currentActivity = null;
      await this.saveToStorage();
    }
  }

  getActivities(limit?: number): ActivityEvent[] {
    if (limit) {
      return this.activities.slice(-limit);
    }
    return [...this.activities];
  }

  getActivitiesByTimeRange(startTime: number, endTime: number): ActivityEvent[] {
    return this.activities.filter(
      (activity) => activity.timestamp >= startTime && activity.timestamp <= endTime
    );
  }

  getActivitiesToday(): ActivityEvent[] {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.getActivitiesByTimeRange(startOfDay.getTime(), Date.now());
  }

  getStats(): ActivityStats {
    const activities = this.activities;

    return {
      totalEvents: activities.length,
      pageVisits: activities.filter((a) => a.type === 'page_visit').length,
      searches: activities.filter((a) => a.type === 'search').length,
      emailChecks: activities.filter((a) => a.type === 'email_check').length,
      distractions: activities.filter((a) => a.type === 'distraction').length,
      signups: activities.filter((a) => a.type === 'signup').length,
      verifications: activities.filter((a) => a.type === 'verification').length,
      totalActiveTime: activities.reduce((sum, a) => sum + (a.duration || 0), 0),
      sessionStart: this.sessionStart,
    };
  }

  getTimeline(intervalMinutes: number = 30): Array<{ time: string; count: number; types: Record<string, number> }> {
    const timeline: Array<{ time: string; count: number; types: Record<string, number> }> = [];
    const intervalMs = intervalMinutes * 60 * 1000;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startTime = startOfDay.getTime();
    const endTime = Date.now();

    for (let time = startTime; time <= endTime; time += intervalMs) {
      const intervalActivities = this.getActivitiesByTimeRange(time, time + intervalMs);

      const types: Record<string, number> = {};
      intervalActivities.forEach((activity) => {
        types[activity.type] = (types[activity.type] || 0) + 1;
      });

      const date = new Date(time);
      const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

      timeline.push({
        time: timeStr,
        count: intervalActivities.length,
        types,
      });
    }

    return timeline;
  }

  async clearActivities(): Promise<void> {
    this.activities = [];
    this.currentActivity = null;
    this.sessionStart = Date.now();
    await this.saveToStorage();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({
        activities: this.activities,
        sessionStart: this.sessionStart,
      });
    } catch (error) {
      console.error('Error saving activities:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get(['activities', 'sessionStart']);
      if (result.activities) {
        this.activities = result.activities;
      }
      if (result.sessionStart) {
        this.sessionStart = result.sessionStart;
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  }
}
