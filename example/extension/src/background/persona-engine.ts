export interface PersonaDemographics {
  age: number;
  gender: string;
  location: string;
}

export interface PersonaSchedule {
  wake_time: string;
  sleep_time: string;
  work_hours?: string;
  meals: string[];
  bathroom_breaks: number;
}

export interface PersonaBrowsingHabits {
  favorite_sites: string[];
  session_length_minutes: number;
  search_patterns: string[];
}

export interface PersonaTechSetup {
  laptop_model: string;
  os: string;
}

export interface PersonaData {
  demographics: PersonaDemographics;
  email: string;
  schedule: PersonaSchedule;
  interests: string[];
  browsing_habits: PersonaBrowsingHabits;
  personality_traits: string[];
  tech_setup: PersonaTechSetup;
  credentials?: {
    email_password?: string;
  };
}

export interface ScheduleEvent {
  time: string;
  activity: string;
  duration: number;
  sites?: string[];
}

export interface SiteWeight {
  url: string;
  weight: number;
}

export interface PersonaBrain {
  schedule: ScheduleEvent[];
  habits: {
    sites: SiteWeight[];
    searchPatterns: string[];
  };
  email: {
    address: string;
    credentials: {
      user: string;
      pass: string;
    };
  };
  state: {
    currentTime: Date;
    energyLevel: number;
    timezone: string;
  };
  personality: string[];
  interests: string[];
}

export class PersonaEngine {
  private brain: PersonaBrain | null = null;
  private persona: PersonaData | null = null;

  constructor() {}

  loadPersona(persona: PersonaData): PersonaBrain {
    this.persona = persona;
    this.brain = this.initializeBrain(persona);
    return this.brain;
  }

  private initializeBrain(persona: PersonaData): PersonaBrain {
    const schedule = this.parseSchedule(persona.schedule, persona.interests, persona.browsing_habits);
    const habits = this.parseHabits(persona.browsing_habits);

    return {
      schedule,
      habits,
      email: {
        address: persona.email,
        credentials: {
          user: persona.email,
          pass: persona.credentials?.email_password || "",
        },
      },
      state: {
        currentTime: new Date(),
        energyLevel: 100,
        timezone: this.inferTimezone(persona.demographics.location),
      },
      personality: persona.personality_traits,
      interests: persona.interests,
    };
  }

  private parseSchedule(
    schedule: PersonaSchedule,
    interests: string[],
    habits: PersonaBrowsingHabits
  ): ScheduleEvent[] {
    const events: ScheduleEvent[] = [];

    events.push({
      time: schedule.wake_time,
      activity: "wake up & check news",
      duration: 30,
      sites: ["news.google.com", "reddit.com"],
    });

    if (schedule.work_hours) {
      const [start, end] = schedule.work_hours.split("-").map((t) => t.trim());
      events.push({
        time: start,
        activity: "work",
        duration: this.calculateDuration(start, end),
        sites: this.getWorkSites(habits.favorite_sites),
      });
    }

    schedule.meals.forEach((mealTime, index) => {
      events.push({
        time: mealTime,
        activity: `meal break ${index + 1}`,
        duration: 30,
        sites: [],
      });
    });

    events.push({
      time: this.subtractHours(schedule.sleep_time, 2),
      activity: "leisure browsing",
      duration: 120,
      sites: this.getLeisureSites(habits.favorite_sites, interests),
    });

    events.push({
      time: schedule.sleep_time,
      activity: "sleep",
      duration: this.calculateDuration(schedule.sleep_time, schedule.wake_time),
      sites: [],
    });

    return events.sort((a, b) => this.timeToMinutes(a.time) - this.timeToMinutes(b.time));
  }

  private parseHabits(browsing: PersonaBrowsingHabits): { sites: SiteWeight[]; searchPatterns: string[] } {
    const sites: SiteWeight[] = browsing.favorite_sites.map((site, index) => ({
      url: this.normalizeUrl(site),
      weight: 1 - index * 0.1,
    }));

    return {
      sites,
      searchPatterns: browsing.search_patterns,
    };
  }

  private normalizeUrl(url: string): string {
    if (!url.startsWith("http")) {
      return `https://${url}`;
    }
    return url;
  }

  private inferTimezone(location: string): string {
    const timezones: Record<string, string> = {
      "US": "America/New_York",
      "UK": "Europe/London",
      "Japan": "Asia/Tokyo",
      "Australia": "Australia/Sydney",
    };

    for (const [key, zone] of Object.entries(timezones)) {
      if (location.includes(key)) {
        return zone;
      }
    }

    return "America/New_York";
  }

  private getWorkSites(favoriteSites: string[]): string[] {
    const workKeywords = ["github", "stackoverflow", "docs", "slack", "email", "gmail"];
    return favoriteSites.filter((site) =>
      workKeywords.some((keyword) => site.toLowerCase().includes(keyword))
    );
  }

  private getLeisureSites(favoriteSites: string[], interests: string[]): string[] {
    const leisureKeywords = ["youtube", "reddit", "twitter", "instagram", "gaming", "twitch"];
    return favoriteSites.filter((site) =>
      leisureKeywords.some((keyword) => site.toLowerCase().includes(keyword))
    );
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.replace(/[AP]M/i, "").trim().split(":").map(Number);
    const isPM = time.toUpperCase().includes("PM");
    const hour24 = isPM && hours !== 12 ? hours + 12 : hours === 12 && !isPM ? 0 : hours;
    return hour24 * 60 + (minutes || 0);
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime);
    let end = this.timeToMinutes(endTime);

    if (end < start) {
      end += 24 * 60;
    }

    return end - start;
  }

  private subtractHours(time: string, hours: number): string {
    const minutes = this.timeToMinutes(time);
    const newMinutes = minutes - hours * 60;
    const hour24 = Math.floor(newMinutes / 60);
    const min = newMinutes % 60;

    const hour12 = hour24 % 12 || 12;
    const period = hour24 >= 12 ? "PM" : "AM";

    return `${hour12}:${min.toString().padStart(2, "0")} ${period}`;
  }

  getCurrentActivity(): ScheduleEvent | null {
    if (!this.brain) return null;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (let i = 0; i < this.brain.schedule.length; i++) {
      const event = this.brain.schedule[i];
      const eventStart = this.timeToMinutes(event.time);
      const eventEnd = eventStart + event.duration;

      if (currentMinutes >= eventStart && currentMinutes < eventEnd) {
        return event;
      }
    }

    return this.brain.schedule[0];
  }

  getRandomSite(): string {
    if (!this.brain) return "https://www.google.com";

    const activity = this.getCurrentActivity();

    if (activity && activity.sites && activity.sites.length > 0) {
      return activity.sites[Math.floor(Math.random() * activity.sites.length)];
    }

    const totalWeight = this.brain.habits.sites.reduce((sum, site) => sum + site.weight, 0);
    let random = Math.random() * totalWeight;

    for (const site of this.brain.habits.sites) {
      random -= site.weight;
      if (random <= 0) {
        return site.url;
      }
    }

    return this.brain.habits.sites[0]?.url || "https://www.google.com";
  }

  updateEnergyLevel(): void {
    if (!this.brain) return;

    const activity = this.getCurrentActivity();

    if (activity?.activity === "sleep") {
      this.brain.state.energyLevel = Math.min(100, this.brain.state.energyLevel + 5);
    } else if (activity?.activity.includes("meal")) {
      this.brain.state.energyLevel = Math.min(100, this.brain.state.energyLevel + 2);
    } else {
      this.brain.state.energyLevel = Math.max(0, this.brain.state.energyLevel - 0.5);
    }
  }

  shouldTakeBreak(): boolean {
    if (!this.brain) return false;
    return this.brain.state.energyLevel < 30 && Math.random() < 0.3;
  }

  getBrain(): PersonaBrain | null {
    return this.brain;
  }

  getPersona(): PersonaData | null {
    return this.persona;
  }
}
