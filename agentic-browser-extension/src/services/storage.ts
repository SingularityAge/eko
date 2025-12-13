// ============================================
// Storage Service - Settings & Credentials
// ============================================

import { Settings, Credential, STORAGE_KEYS, DEFAULT_SETTINGS } from '../shared/types';

// Settings Management
export async function getSettings(): Promise<Settings> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
  } catch (error) {
    console.error('[STORAGE] Failed to get settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    console.log('[STORAGE] Settings saved');
  } catch (error) {
    console.error('[STORAGE] Failed to save settings:', error);
  }
}

// Credentials Management
export async function getCredentials(): Promise<Credential[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CREDENTIALS);
    return result[STORAGE_KEYS.CREDENTIALS] || [];
  } catch (error) {
    console.error('[STORAGE] Failed to get credentials:', error);
    return [];
  }
}

export async function saveCredential(credential: Omit<Credential, 'id' | 'createdAt'>): Promise<Credential> {
  const credentials = await getCredentials();

  // Check if already exists for this domain
  const existingIndex = credentials.findIndex(c => c.domain === credential.domain);

  const newCred: Credential = {
    id: `cred_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    ...credential
  };

  if (existingIndex >= 0) {
    // Update existing
    newCred.id = credentials[existingIndex].id;
    newCred.createdAt = credentials[existingIndex].createdAt;
    credentials[existingIndex] = newCred;
  } else {
    credentials.push(newCred);
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.CREDENTIALS]: credentials });
  console.log('[STORAGE] Credential saved for:', credential.domain);
  return newCred;
}

export async function getCredentialByDomain(domain: string): Promise<Credential | null> {
  const credentials = await getCredentials();
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  return credentials.find(c => c.domain.replace(/^www\./, '').toLowerCase() === normalized) || null;
}

export async function updateCredentialUsage(domain: string): Promise<void> {
  const credentials = await getCredentials();
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  const index = credentials.findIndex(c => c.domain.replace(/^www\./, '').toLowerCase() === normalized);

  if (index >= 0) {
    credentials[index].lastUsed = Date.now();
    await chrome.storage.local.set({ [STORAGE_KEYS.CREDENTIALS]: credentials });
  }
}

// Extract domain from URL
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
