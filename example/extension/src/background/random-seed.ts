export class SeededRandom {
  private seed: number;
  private state: number;

  constructor(seed?: number) {
    this.seed = seed !== undefined ? seed : Date.now();
    this.state = this.seed;
  }

  next(): number {
    const x = Math.sin(this.state++) * 10000;
    return x - Math.floor(x);
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }

  getSeed(): number {
    return this.seed;
  }

  reset(): void {
    this.state = this.seed;
  }
}

export class PersonaRandomness {
  private random: SeededRandom;
  private personaSeed: number;

  constructor(personaName: string, seed?: number) {
    this.personaSeed = seed !== undefined ? seed : this.hashString(personaName);
    this.random = new SeededRandom(this.personaSeed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  getTypingSpeed(): number {
    return this.random.nextInt(180, 320);
  }

  getErrorRate(): number {
    return this.random.nextFloat(0.01, 0.05);
  }

  getMouseSpeed(): number {
    return this.random.nextFloat(0.8, 1.5);
  }

  getScrollSpeed(): number {
    return this.random.nextInt(300, 800);
  }

  getReadingTime(wordCount: number): number {
    const wpm = this.random.nextInt(200, 300);
    return (wordCount / wpm) * 60 * 1000;
  }

  getThinkingDelay(): number {
    return this.random.nextInt(800, 2500);
  }

  getDistractionProbability(): number {
    return this.random.nextFloat(0.1, 0.3);
  }

  shouldGetDistracted(): boolean {
    return this.random.boolean(this.getDistractionProbability());
  }

  getActivityDuration(activityType: string): number {
    const baseDurations: Record<string, [number, number]> = {
      'browse': [120000, 600000],
      'search': [30000, 120000],
      'email': [60000, 300000],
      'social': [180000, 900000],
      'read': [300000, 1800000],
    };

    const [min, max] = baseDurations[activityType] || [60000, 300000];
    return this.random.nextInt(min, max);
  }

  getSeed(): number {
    return this.personaSeed;
  }

  reset(): void {
    this.random.reset();
  }
}
