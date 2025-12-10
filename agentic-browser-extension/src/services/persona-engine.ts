// ============================================
// Persona Engine for Young US Citizen Simulation
// ============================================

import {
  PersonaProfile,
  PersonalityTraits,
  BrowsingHabits,
  DailySchedule,
  SocialMediaPresence,
  EmailConfig,
  YOUNG_US_INTERESTS,
  YOUNG_US_SEARCH_PATTERNS
} from '../shared/types';

// US Cities with timezone info
const US_LOCATIONS = [
  { city: 'New York', state: 'NY', timezone: 'America/New_York' },
  { city: 'Los Angeles', state: 'CA', timezone: 'America/Los_Angeles' },
  { city: 'Chicago', state: 'IL', timezone: 'America/Chicago' },
  { city: 'Houston', state: 'TX', timezone: 'America/Chicago' },
  { city: 'Phoenix', state: 'AZ', timezone: 'America/Phoenix' },
  { city: 'Philadelphia', state: 'PA', timezone: 'America/New_York' },
  { city: 'San Antonio', state: 'TX', timezone: 'America/Chicago' },
  { city: 'San Diego', state: 'CA', timezone: 'America/Los_Angeles' },
  { city: 'Dallas', state: 'TX', timezone: 'America/Chicago' },
  { city: 'Austin', state: 'TX', timezone: 'America/Chicago' },
  { city: 'Seattle', state: 'WA', timezone: 'America/Los_Angeles' },
  { city: 'Denver', state: 'CO', timezone: 'America/Denver' },
  { city: 'Boston', state: 'MA', timezone: 'America/New_York' },
  { city: 'Nashville', state: 'TN', timezone: 'America/Chicago' },
  { city: 'Portland', state: 'OR', timezone: 'America/Los_Angeles' },
  { city: 'Miami', state: 'FL', timezone: 'America/New_York' },
  { city: 'Atlanta', state: 'GA', timezone: 'America/New_York' },
  { city: 'Minneapolis', state: 'MN', timezone: 'America/Chicago' },
  { city: 'Raleigh', state: 'NC', timezone: 'America/New_York' },
  { city: 'San Francisco', state: 'CA', timezone: 'America/Los_Angeles' }
];

// Common first names for young Americans
const FIRST_NAMES = {
  male: [
    'Liam', 'Noah', 'Oliver', 'James', 'Elijah', 'William', 'Henry', 'Lucas',
    'Benjamin', 'Theodore', 'Jack', 'Levi', 'Alexander', 'Mason', 'Ethan',
    'Jacob', 'Michael', 'Daniel', 'Logan', 'Jackson', 'Sebastian', 'Aiden',
    'Owen', 'Samuel', 'Ryan', 'Nathan', 'Tyler', 'Dylan', 'Caleb', 'Hunter'
  ],
  female: [
    'Olivia', 'Emma', 'Charlotte', 'Amelia', 'Sophia', 'Mia', 'Isabella',
    'Ava', 'Evelyn', 'Luna', 'Harper', 'Camila', 'Sofia', 'Scarlett', 'Emily',
    'Aria', 'Penelope', 'Chloe', 'Layla', 'Mila', 'Nora', 'Hazel', 'Madison',
    'Eleanor', 'Grace', 'Zoey', 'Riley', 'Victoria', 'Brooklyn', 'Savannah'
  ],
  neutral: [
    'Riley', 'Jordan', 'Morgan', 'Taylor', 'Cameron', 'Quinn', 'Avery',
    'Parker', 'Sage', 'River', 'Dakota', 'Finley', 'Emery', 'Peyton', 'Reese'
  ]
};

// Common last names
const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter'
];

// Occupations for young adults
const OCCUPATIONS = [
  'college student', 'software developer', 'marketing associate', 'barista',
  'freelancer', 'content creator', 'retail associate', 'server/waiter',
  'graphic designer', 'nurse', 'teacher', 'sales representative',
  'customer service rep', 'administrative assistant', 'accountant',
  'project manager', 'data analyst', 'social media manager', 'recruiter',
  'consultant', 'startup founder', 'grad student', 'gig worker'
];

// Education levels
const EDUCATION = [
  'high school diploma', 'some college', 'associate degree',
  'bachelor\'s degree', 'currently in college', 'currently in grad school',
  'master\'s degree', 'trade school certification'
];

// Social media platforms with usage patterns
const SOCIAL_PLATFORMS = [
  { name: 'Instagram', weight: 0.9 },
  { name: 'TikTok', weight: 0.85 },
  { name: 'Twitter/X', weight: 0.6 },
  { name: 'Snapchat', weight: 0.7 },
  { name: 'Reddit', weight: 0.5 },
  { name: 'Discord', weight: 0.6 },
  { name: 'LinkedIn', weight: 0.4 },
  { name: 'YouTube', weight: 0.95 },
  { name: 'Facebook', weight: 0.3 },
  { name: 'BeReal', weight: 0.3 },
  { name: 'Threads', weight: 0.2 }
];

// Seeded random number generator for reproducibility
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  pickMultiple<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => this.next() - 0.5);
    return shuffled.slice(0, count);
  }

  boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

export class PersonaEngine {
  private persona: PersonaProfile | null = null;
  private random: SeededRandom;
  private currentEnergy: number = 1.0;
  private lastActivityTime: number = Date.now();

  // Sleep and break tracking
  private sleepStartTime: number = 0;
  private sleepDurationMs: number = 0;
  private dailyBreaks: Array<{ start: number; duration: number }> = [];
  private lastBreakScheduleDay: number = -1;

  constructor(seed?: number) {
    this.random = new SeededRandom(seed || Date.now());
    this.scheduleDailyBreaks();
  }

  // Schedule random daily breaks (30-90 minutes total, split into 1-3 breaks)
  private scheduleDailyBreaks(): void {
    const today = new Date().getDate();
    if (this.lastBreakScheduleDay === today) return;

    this.lastBreakScheduleDay = today;
    this.dailyBreaks = [];

    // Total break time: 30-90 minutes
    const totalBreakMinutes = this.random.nextInt(30, 90);
    const numBreaks = this.random.nextInt(1, 3);
    const breakDuration = Math.floor(totalBreakMinutes / numBreaks);

    // Schedule breaks during waking hours (avoid peak times)
    const now = new Date();
    const baseHour = now.getHours();

    for (let i = 0; i < numBreaks; i++) {
      // Schedule breaks at random times during the day
      const breakHour = this.random.nextInt(10, 20); // Between 10 AM and 8 PM
      const breakMinute = this.random.nextInt(0, 59);

      const breakStart = new Date();
      breakStart.setHours(breakHour, breakMinute, 0, 0);

      // Only schedule if it's in the future today
      if (breakStart.getTime() > Date.now()) {
        this.dailyBreaks.push({
          start: breakStart.getTime(),
          duration: breakDuration * 60 * 1000 // Convert to ms
        });
      }
    }

    console.log(`Scheduled ${this.dailyBreaks.length} breaks for today, total ${totalBreakMinutes} minutes`);
  }

  // Check if currently on a scheduled break
  isOnBreak(): boolean {
    const now = Date.now();

    for (const brk of this.dailyBreaks) {
      if (now >= brk.start && now < brk.start + brk.duration) {
        return true;
      }
    }

    return false;
  }

  // Get remaining break time in ms
  getBreakTimeRemaining(): number {
    const now = Date.now();

    for (const brk of this.dailyBreaks) {
      if (now >= brk.start && now < brk.start + brk.duration) {
        return brk.start + brk.duration - now;
      }
    }

    return 0;
  }

  // Start sleep period (6-9 hours random)
  startSleep(): void {
    const sleepHours = this.random.nextInt(6, 9);
    this.sleepDurationMs = sleepHours * 60 * 60 * 1000;
    this.sleepStartTime = Date.now();
    console.log(`Persona going to sleep for ${sleepHours} hours`);
  }

  // Check if currently sleeping (called when checking isAwake)
  isSleeping(): boolean {
    if (this.sleepStartTime === 0) return false;

    const elapsed = Date.now() - this.sleepStartTime;
    if (elapsed >= this.sleepDurationMs) {
      // Wake up
      this.sleepStartTime = 0;
      this.sleepDurationMs = 0;
      this.scheduleDailyBreaks(); // Schedule new breaks for new day
      console.log('Persona woke up from sleep');
      return false;
    }

    return true;
  }

  // Get sleep time remaining in ms
  getSleepTimeRemaining(): number {
    if (this.sleepStartTime === 0) return 0;
    const elapsed = Date.now() - this.sleepStartTime;
    return Math.max(0, this.sleepDurationMs - elapsed);
  }

  // Check if persona can be active (not sleeping, not on break)
  canBeActive(): boolean {
    // Reschedule breaks if it's a new day
    this.scheduleDailyBreaks();

    return this.isAwake() && !this.isSleeping() && !this.isOnBreak();
  }

  // Get next available activity time
  getNextAvailableTime(): number {
    const now = Date.now();

    // If sleeping, return wake time
    if (this.isSleeping()) {
      return this.sleepStartTime + this.sleepDurationMs;
    }

    // If on break, return break end
    const breakRemaining = this.getBreakTimeRemaining();
    if (breakRemaining > 0) {
      return now + breakRemaining;
    }

    // If it's sleep time based on schedule, return next wake time
    if (!this.isAwake() && this.persona) {
      const [wakeHour, wakeMin] = this.persona.schedule.wakeTime.split(':').map(Number);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(wakeHour, wakeMin, 0, 0);
      return tomorrow.getTime();
    }

    return now; // Can be active now
  }

  // Generate a complete persona
  generatePersona(overrides: Partial<PersonaProfile> = {}): PersonaProfile {
    const gender = overrides.gender || this.random.pick(['male', 'female', 'non-binary']);
    const nameList = gender === 'non-binary' ? FIRST_NAMES.neutral :
                     gender === 'male' ? FIRST_NAMES.male : FIRST_NAMES.female;

    const age = overrides.age || this.random.nextInt(18, 32);
    const location = this.random.pick(US_LOCATIONS);

    // Generate personality traits
    const personality: PersonalityTraits = {
      openness: this.random.next() * 0.4 + 0.4, // 0.4-0.8
      conscientiousness: this.random.next() * 0.5 + 0.3,
      extraversion: this.random.next() * 0.6 + 0.2,
      agreeableness: this.random.next() * 0.4 + 0.4,
      neuroticism: this.random.next() * 0.5 + 0.2,
      techSavviness: this.random.next() * 0.3 + 0.6, // Young people are tech-savvy
      attentionSpan: this.random.next() * 0.4 + 0.3, // Shorter attention spans
      typingSpeed: this.random.nextInt(40, 80), // WPM
      typoRate: this.random.next() * 0.03 + 0.01 // 1-4%
    };

    // Generate interests based on personality
    const interestCategories = Object.keys(YOUNG_US_INTERESTS);
    const numCategories = this.random.nextInt(3, 6);
    const selectedCategories = this.random.pickMultiple(interestCategories, numCategories);

    const interests: string[] = [];
    for (const category of selectedCategories) {
      const categoryInterests = YOUNG_US_INTERESTS[category as keyof typeof YOUNG_US_INTERESTS];
      const numInterests = this.random.nextInt(2, 4);
      interests.push(...this.random.pickMultiple([...categoryInterests], numInterests));
    }

    // Generate browsing habits
    const browsingHabits: BrowsingHabits = {
      favoriteCategories: selectedCategories,
      favoriteSites: this.generateFavoriteSites(interests),
      searchPatterns: this.random.pickMultiple([...YOUNG_US_SEARCH_PATTERNS], 5),
      avgSessionLength: this.random.nextInt(15, 60),
      tabBehavior: this.random.pick(['single', 'few', 'many']),
      scrollSpeed: this.random.pick(['slow', 'medium', 'fast']),
      readingDepth: this.random.pick(['skim', 'moderate', 'deep'])
    };

    // Generate schedule based on occupation
    const occupation = overrides.occupation || this.random.pick(OCCUPATIONS);
    const schedule = this.generateSchedule(occupation, age);

    // Generate social media presence
    const socialMedia = this.generateSocialMediaPresence(personality);

    // Create persona
    this.persona = {
      id: `persona_${Date.now()}_${this.random.nextInt(1000, 9999)}`,
      name: `${this.random.pick(nameList)} ${this.random.pick(LAST_NAMES)}`,
      age,
      gender,
      location: {
        city: location.city,
        state: location.state,
        timezone: location.timezone
      },
      occupation,
      education: this.getEducationForAge(age),
      interests,
      personality,
      browsingHabits,
      schedule,
      socialMedia,
      email: {
        provider: 'gmail',
        email: '',
        password: '',
        checkFrequency: this.random.nextInt(30, 120),
        autoCheck: true
      },
      ...overrides
    };

    return this.persona;
  }

  // Generate favorite sites based on interests
  private generateFavoriteSites(interests: string[]): string[] {
    const siteMap: Record<string, string[]> = {
      'Netflix': ['netflix.com'],
      'YouTube': ['youtube.com'],
      'TikTok': ['tiktok.com'],
      'Spotify': ['spotify.com', 'open.spotify.com'],
      'Twitch': ['twitch.tv'],
      'Instagram': ['instagram.com'],
      'Twitter/X': ['x.com', 'twitter.com'],
      'Reddit': ['reddit.com'],
      'Discord': ['discord.com'],
      'Amazon': ['amazon.com'],
      'gaming': ['store.steampowered.com', 'twitch.tv', 'ign.com'],
      'coding': ['github.com', 'stackoverflow.com', 'dev.to'],
      'news': ['cnn.com', 'nytimes.com', 'bbc.com'],
      'shopping': ['amazon.com', 'ebay.com', 'target.com'],
      'food': ['doordash.com', 'ubereats.com', 'yelp.com']
    };

    const sites = new Set<string>();
    for (const interest of interests) {
      const relatedSites = siteMap[interest] || [];
      relatedSites.forEach(site => sites.add(site));
    }

    // Add common sites
    sites.add('google.com');
    sites.add('youtube.com');

    return Array.from(sites).slice(0, 15);
  }

  // Generate schedule based on occupation
  private generateSchedule(occupation: string, age: number): DailySchedule {
    const isStudent = occupation.includes('student');
    const isFullTime = ['developer', 'manager', 'analyst', 'accountant', 'nurse'].some(
      job => occupation.includes(job)
    );

    let wakeTime: string;
    let sleepTime: string;

    if (isStudent) {
      wakeTime = `${this.random.nextInt(8, 11)}:${this.random.pick(['00', '30'])}`;
      sleepTime = `${this.random.nextInt(23, 25) % 24}:${this.random.pick(['00', '30'])}`;
    } else if (isFullTime) {
      wakeTime = `${this.random.nextInt(6, 8)}:${this.random.pick(['00', '30'])}`;
      sleepTime = `${this.random.nextInt(22, 24)}:${this.random.pick(['00', '30'])}`;
    } else {
      wakeTime = `${this.random.nextInt(7, 10)}:${this.random.pick(['00', '30'])}`;
      sleepTime = `${this.random.nextInt(23, 25) % 24}:${this.random.pick(['00', '30'])}`;
    }

    // Peak browsing hours (evening typically)
    const peakHours: number[] = [];
    for (let i = 0; i < 4; i++) {
      peakHours.push(this.random.nextInt(18, 23));
    }

    return {
      wakeTime,
      sleepTime,
      workStart: isFullTime ? '09:00' : undefined,
      workEnd: isFullTime ? '17:00' : undefined,
      lunchTime: this.random.pick(['12:00', '12:30', '13:00']),
      peakBrowsingHours: [...new Set(peakHours)].sort((a, b) => a - b),
      weekendDifferent: this.random.boolean(0.8)
    };
  }

  // Generate social media presence
  private generateSocialMediaPresence(personality: PersonalityTraits): SocialMediaPresence {
    const platforms = SOCIAL_PLATFORMS.filter(p =>
      this.random.boolean(p.weight * (personality.extraversion + 0.3))
    ).map(p => ({
      name: p.name,
      usage: this.random.pick(['primary', 'secondary', 'occasional']) as 'primary' | 'secondary' | 'occasional'
    }));

    // Ensure at least one platform
    if (platforms.length === 0) {
      platforms.push({ name: 'Instagram', usage: 'occasional' });
    }

    // Set one as primary
    if (!platforms.some(p => p.usage === 'primary') && platforms.length > 0) {
      platforms[0].usage = 'primary';
    }

    const engagementStyles: Array<'lurker' | 'reactor' | 'commenter' | 'creator'> =
      ['lurker', 'reactor', 'commenter', 'creator'];
    const engagementIndex = Math.min(
      3,
      Math.floor(personality.extraversion * 4)
    );

    return {
      platforms,
      postingFrequency: this.random.pick(['rarely', 'sometimes', 'often', 'very_often']),
      engagementStyle: engagementStyles[engagementIndex]
    };
  }

  // Get appropriate education for age
  private getEducationForAge(age: number): string {
    if (age < 20) {
      return this.random.pick(['high school diploma', 'some college', 'currently in college']);
    } else if (age < 23) {
      return this.random.pick(['some college', 'currently in college', 'associate degree']);
    } else if (age < 26) {
      return this.random.pick(['bachelor\'s degree', 'currently in grad school', 'some college']);
    } else {
      return this.random.pick(['bachelor\'s degree', 'master\'s degree', 'trade school certification']);
    }
  }

  // Get current persona
  getPersona(): PersonaProfile | null {
    return this.persona;
  }

  // Set persona from saved data
  setPersona(persona: PersonaProfile): void {
    this.persona = persona;
  }

  // Check if currently awake based on schedule
  isAwake(): boolean {
    if (!this.persona) return true;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [wakeHour, wakeMin] = this.persona.schedule.wakeTime.split(':').map(Number);
    const [sleepHour, sleepMin] = this.persona.schedule.sleepTime.split(':').map(Number);

    const wakeTime = wakeHour * 60 + wakeMin;
    const sleepTime = sleepHour * 60 + sleepMin;

    if (sleepTime > wakeTime) {
      return currentTime >= wakeTime && currentTime < sleepTime;
    } else {
      return currentTime >= wakeTime || currentTime < sleepTime;
    }
  }

  // Check if it's peak browsing time
  isPeakBrowsingTime(): boolean {
    if (!this.persona) return true;

    const hour = new Date().getHours();
    return this.persona.schedule.peakBrowsingHours.includes(hour);
  }

  // Get current energy level (decreases over time, resets on "wake")
  getEnergyLevel(): number {
    if (!this.persona) return 1.0;

    const now = new Date();
    const [wakeHour] = this.persona.schedule.wakeTime.split(':').map(Number);
    const hoursSinceWake = (now.getHours() - wakeHour + 24) % 24;

    // Energy decreases throughout the day
    const baseEnergy = Math.max(0.3, 1 - hoursSinceWake * 0.05);

    // Adjust for personality
    const adjustedEnergy = baseEnergy * (0.7 + this.persona.personality.conscientiousness * 0.3);

    return Math.min(1, Math.max(0.2, adjustedEnergy));
  }

  // Generate a contextual search query
  generateSearchQuery(): string {
    if (!this.persona) return 'trending news today';

    const interest = this.random.pick(this.persona.interests);
    const pattern = this.random.pick([...this.persona.browsingHabits.searchPatterns]);

    // Replace placeholders
    let query = pattern
      .replace('{category}', interest.toLowerCase())
      .replace('{product}', interest.toLowerCase())
      .replace('{action}', `use ${interest.toLowerCase()}`)
      .replace('{celebrity}', 'celebrity')
      .replace('{show/movie}', 'popular show')
      .replace('{item}', interest.toLowerCase())
      .replace('{topic}', interest.toLowerCase())
      .replace('{thing}', interest.toLowerCase())
      .replace('{brand}', interest.toLowerCase())
      .replace('{trending topic}', 'trending');

    return query;
  }

  // Generate next browsing action based on persona
  generateNextAction(): {
    type: 'search' | 'visit' | 'social' | 'email' | 'break' | 'idle';
    target?: string;
    duration?: number;
  } {
    if (!this.persona) {
      return { type: 'search', target: 'google.com' };
    }

    const energy = this.getEnergyLevel();
    const isPeak = this.isPeakBrowsingTime();

    // Low energy = more likely to take breaks
    if (energy < 0.4 && this.random.boolean(0.3)) {
      return {
        type: 'break',
        duration: this.random.nextInt(5, 15) * 60 * 1000
      };
    }

    // Determine action based on personality and time
    const weights = {
      search: 0.2,
      visit: 0.35,
      social: isPeak ? 0.35 : 0.2,
      email: 0.1
    };

    const roll = this.random.next();
    let cumulative = 0;

    for (const [action, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll < cumulative) {
        switch (action) {
          case 'search':
            return {
              type: 'search',
              target: this.generateSearchQuery()
            };
          case 'visit':
            return {
              type: 'visit',
              target: this.random.pick(this.persona.browsingHabits.favoriteSites)
            };
          case 'social':
            const platform = this.persona.socialMedia.platforms.find(p => p.usage === 'primary') ||
                            this.random.pick(this.persona.socialMedia.platforms);
            return {
              type: 'social',
              target: platform?.name.toLowerCase().replace(/\/.*/, '') || 'instagram'
            };
          case 'email':
            return { type: 'email' };
        }
      }
    }

    return { type: 'idle' };
  }

  // Get typing characteristics
  getTypingConfig(): { speed: number; typoRate: number } {
    if (!this.persona) {
      return { speed: 60, typoRate: 0.02 };
    }

    return {
      speed: this.persona.personality.typingSpeed,
      typoRate: this.persona.personality.typoRate
    };
  }

  // Get scroll behavior
  getScrollBehavior(): 'slow' | 'medium' | 'fast' {
    if (!this.persona) return 'medium';

    const attentionModifier = this.persona.personality.attentionSpan;
    if (attentionModifier > 0.6) return 'slow';
    if (attentionModifier < 0.4) return 'fast';
    return this.persona.browsingHabits.scrollSpeed;
  }

  // Generate think time (time before taking action)
  getThinkTime(): number {
    if (!this.persona) return 1000;

    const base = 500;
    const conscientiousnessBonus = this.persona.personality.conscientiousness * 1500;
    const attentionBonus = this.persona.personality.attentionSpan * 1000;

    return base + conscientiousnessBonus + attentionBonus + this.random.nextInt(0, 500);
  }

  // Export persona to JSON
  exportPersona(): string {
    return JSON.stringify(this.persona, null, 2);
  }

  // Import persona from JSON
  importPersona(json: string): PersonaProfile {
    this.persona = JSON.parse(json);
    return this.persona!;
  }
}

// Singleton instance
let personaEngineInstance: PersonaEngine | null = null;

export function getPersonaEngine(seed?: number): PersonaEngine {
  if (!personaEngineInstance) {
    personaEngineInstance = new PersonaEngine(seed);
  }
  return personaEngineInstance;
}
