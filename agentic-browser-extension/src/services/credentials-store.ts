// ============================================
// Credentials Storage Service
// Stores login credentials for signed-up websites
// ============================================

import { StoredCredential, STORAGE_KEYS } from '../shared/types';

class CredentialsStore {
  private credentials: Map<string, StoredCredential> = new Map();
  private initialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CREDENTIALS);
      const stored = result[STORAGE_KEYS.CREDENTIALS] as StoredCredential[] || [];

      for (const cred of stored) {
        this.credentials.set(cred.id, cred);
      }

      this.initialized = true;
      console.log(`Credentials store initialized with ${this.credentials.size} entries`);
    } catch (error) {
      console.error('Failed to initialize credentials store:', error);
      this.initialized = true; // Mark as initialized anyway to prevent retries
    }
  }

  private async save(): Promise<void> {
    try {
      const credArray = Array.from(this.credentials.values());
      await chrome.storage.local.set({
        [STORAGE_KEYS.CREDENTIALS]: credArray
      });
    } catch (error) {
      console.error('Failed to save credentials:', error);
    }
  }

  // Extract domain from URL
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  // Extract site name from URL
  private extractSiteName(url: string): string {
    const domain = this.extractDomain(url);
    // Get the main part of the domain (e.g., "reddit" from "reddit.com")
    const parts = domain.split('.');
    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }
    return domain;
  }

  // Generate a unique ID
  private generateId(): string {
    return `cred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Store new credentials
  async store(params: {
    url: string;
    email: string;
    password: string;
    username?: string;
    loginUrl?: string;
    notes?: string;
  }): Promise<StoredCredential> {
    await this.initialize();

    const domain = this.extractDomain(params.url);

    // Check if we already have credentials for this domain
    const existing = this.getByDomain(domain);
    if (existing) {
      // Update existing credentials
      existing.email = params.email;
      existing.password = params.password;
      existing.username = params.username;
      existing.loginUrl = params.loginUrl || existing.loginUrl;
      existing.notes = params.notes || existing.notes;
      existing.lastLoginAt = Date.now();

      this.credentials.set(existing.id, existing);
      await this.save();
      return existing;
    }

    // Create new credential entry
    const credential: StoredCredential = {
      id: this.generateId(),
      url: params.url,
      domain,
      siteName: this.extractSiteName(params.url),
      email: params.email,
      password: params.password,
      username: params.username,
      loginUrl: params.loginUrl,
      notes: params.notes,
      createdAt: Date.now()
    };

    this.credentials.set(credential.id, credential);
    await this.save();

    console.log(`Stored credentials for ${domain}`);
    return credential;
  }

  // Get credentials by domain
  getByDomain(domain: string): StoredCredential | undefined {
    const normalizedDomain = domain.replace(/^www\./, '').toLowerCase();

    for (const cred of this.credentials.values()) {
      if (cred.domain.toLowerCase() === normalizedDomain) {
        return cred;
      }
    }
    return undefined;
  }

  // Get credentials by URL
  getByUrl(url: string): StoredCredential | undefined {
    const domain = this.extractDomain(url);
    return this.getByDomain(domain);
  }

  // Check if we have credentials for a domain
  hasCredentials(urlOrDomain: string): boolean {
    const domain = urlOrDomain.includes('://')
      ? this.extractDomain(urlOrDomain)
      : urlOrDomain.replace(/^www\./, '');

    return this.getByDomain(domain) !== undefined;
  }

  // Get all stored credentials
  getAll(): StoredCredential[] {
    return Array.from(this.credentials.values());
  }

  // Get all domains we have accounts for
  getAllDomains(): string[] {
    return Array.from(this.credentials.values()).map(c => c.domain);
  }

  // Get all URLs we have accounts for (for browsing)
  getAllUrls(): string[] {
    return Array.from(this.credentials.values()).map(c => c.url);
  }

  // Update last login time
  async updateLastLogin(urlOrDomain: string): Promise<void> {
    await this.initialize();

    const cred = urlOrDomain.includes('://')
      ? this.getByUrl(urlOrDomain)
      : this.getByDomain(urlOrDomain);

    if (cred) {
      cred.lastLoginAt = Date.now();
      this.credentials.set(cred.id, cred);
      await this.save();
    }
  }

  // Delete credentials
  async delete(id: string): Promise<boolean> {
    await this.initialize();

    const deleted = this.credentials.delete(id);
    if (deleted) {
      await this.save();
    }
    return deleted;
  }

  // Delete by domain
  async deleteByDomain(domain: string): Promise<boolean> {
    await this.initialize();

    const cred = this.getByDomain(domain);
    if (cred) {
      return this.delete(cred.id);
    }
    return false;
  }

  // Get credentials sorted by last activity (for prioritizing in browsing)
  getSortedByActivity(): StoredCredential[] {
    const creds = this.getAll();
    return creds.sort((a, b) => {
      const aTime = a.lastLoginAt || a.createdAt;
      const bTime = b.lastLoginAt || b.createdAt;
      return bTime - aTime; // Most recent first
    });
  }

  // Get credentials we haven't visited in a while
  getStaleCredentials(daysOld: number = 7): StoredCredential[] {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    return this.getAll().filter(cred => {
      const lastActivity = cred.lastLoginAt || cred.createdAt;
      return lastActivity < cutoff;
    });
  }
}

// Singleton instance
let credentialsStoreInstance: CredentialsStore | null = null;

export function getCredentialsStore(): CredentialsStore {
  if (!credentialsStoreInstance) {
    credentialsStoreInstance = new CredentialsStore();
  }
  return credentialsStoreInstance;
}

export { CredentialsStore };
