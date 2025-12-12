// ============================================
// Settings/Options Page
// ============================================

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings, Persona, Credential, DEFAULT_SETTINGS } from '../shared/types';

const styles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f5f5f5;
    color: #1a1a1a;
    min-width: 500px;
  }

  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
  }

  .header {
    text-align: center;
    margin-bottom: 24px;
  }

  .header h1 {
    font-size: 24px;
    color: #DA7756;
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: #333;
  }

  .form-group {
    margin-bottom: 16px;
  }

  .form-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
    color: #555;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #DA7756;
  }

  .form-group textarea {
    resize: vertical;
    min-height: 80px;
  }

  .form-group .hint {
    font-size: 11px;
    color: #888;
    margin-top: 4px;
  }

  .btn {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #DA7756;
    color: white;
  }

  .btn-primary:hover {
    background: #c4684a;
  }

  .btn-secondary {
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-secondary:hover {
    background: #eee;
  }

  .btn-group {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .success {
    background: #d4edda;
    color: #155724;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .error {
    background: #f8d7da;
    color: #721c24;
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
  }

  .credentials-list {
    border: 1px solid #eee;
    border-radius: 6px;
    max-height: 200px;
    overflow-y: auto;
  }

  .credential-item {
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .credential-item:last-child {
    border-bottom: none;
  }

  .credential-domain {
    font-weight: 500;
  }

  .credential-email {
    font-size: 12px;
    color: #666;
  }

  .empty-state {
    text-align: center;
    padding: 20px;
    color: #888;
  }
`;

function OptionsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Persona form state
  const [personaName, setPersonaName] = useState('');
  const [personaAge, setPersonaAge] = useState('30');
  const [personaLocation, setPersonaLocation] = useState('');
  const [personaOccupation, setPersonaOccupation] = useState('');
  const [personaInterests, setPersonaInterests] = useState('');
  const [personaEmail, setPersonaEmail] = useState('');
  const [personaEmailPassword, setPersonaEmailPassword] = useState('');
  const [personaEmailProvider, setPersonaEmailProvider] = useState<'gmail' | 'outlook' | 'yahoo' | 'protonmail'>('gmail');
  const [personaFavoriteSites, setPersonaFavoriteSites] = useState('');

  useEffect(() => {
    loadSettings();
    loadCredentials();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response && !response.error) {
        setSettings(response);

        // Populate persona form if exists
        if (response.persona) {
          const p = response.persona;
          setPersonaName(p.name || '');
          setPersonaAge(String(p.age || 30));
          setPersonaLocation(p.location || '');
          setPersonaOccupation(p.occupation || '');
          setPersonaInterests(p.interests?.join(', ') || '');
          setPersonaFavoriteSites(p.favoriteSites?.join('\n') || '');
          if (p.email) {
            setPersonaEmail(p.email.address || '');
            setPersonaEmailPassword(p.email.password || '');
            setPersonaEmailProvider(p.email.provider || 'gmail');
          }
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const loadCredentials = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_CREDENTIALS' });
      if (Array.isArray(response)) {
        setCredentials(response);
      }
    } catch (e) {
      console.error('Failed to load credentials:', e);
    }
  };

  const handleSave = async () => {
    setError('');
    setSaved(false);

    // Build persona object
    const persona: Persona | null = personaName ? {
      name: personaName,
      age: parseInt(personaAge) || 30,
      location: personaLocation,
      occupation: personaOccupation,
      interests: personaInterests.split(',').map(s => s.trim()).filter(Boolean),
      email: personaEmail ? {
        address: personaEmail,
        password: personaEmailPassword,
        provider: personaEmailProvider
      } : null,
      favoriteSites: personaFavoriteSites.split('\n').map(s => s.trim()).filter(Boolean)
    } : null;

    const newSettings: Settings = {
      ...settings,
      persona
    };

    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: newSettings });
      setSettings(newSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError('Failed to save settings');
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <div className="header">
          <h1>AutoBrowser Settings</h1>
        </div>

        {saved && <div className="success">Settings saved successfully!</div>}
        {error && <div className="error">{error}</div>}

        {/* API Settings */}
        <div className="section">
          <div className="section-title">API Configuration</div>

          <div className="form-group">
            <label>OpenRouter API Key</label>
            <input
              type="password"
              value={settings.openRouterApiKey}
              onChange={e => setSettings({ ...settings, openRouterApiKey: e.target.value })}
              placeholder="sk-or-..."
            />
            <div className="hint">Get your API key from openrouter.ai</div>
          </div>

          <div className="form-group">
            <label>Model</label>
            <select
              value={settings.model}
              onChange={e => setSettings({ ...settings, model: e.target.value })}
            >
              <option value="anthropic/claude-sonnet-4">Claude Sonnet 4 (Recommended)</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
              <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
            </select>
          </div>
        </div>

        {/* Persona Settings */}
        <div className="section">
          <div className="section-title">Browsing Persona</div>

          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={personaName}
              onChange={e => setPersonaName(e.target.value)}
              placeholder="John Smith"
            />
          </div>

          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={personaAge}
              onChange={e => setPersonaAge(e.target.value)}
              min="18"
              max="99"
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <input
              type="text"
              value={personaLocation}
              onChange={e => setPersonaLocation(e.target.value)}
              placeholder="New York, USA"
            />
          </div>

          <div className="form-group">
            <label>Occupation</label>
            <input
              type="text"
              value={personaOccupation}
              onChange={e => setPersonaOccupation(e.target.value)}
              placeholder="Software Engineer"
            />
          </div>

          <div className="form-group">
            <label>Interests (comma-separated)</label>
            <input
              type="text"
              value={personaInterests}
              onChange={e => setPersonaInterests(e.target.value)}
              placeholder="technology, gaming, cooking"
            />
          </div>

          <div className="form-group">
            <label>Favorite Sites (one per line)</label>
            <textarea
              value={personaFavoriteSites}
              onChange={e => setPersonaFavoriteSites(e.target.value)}
              placeholder="reddit.com&#10;youtube.com&#10;news.ycombinator.com"
            />
          </div>
        </div>

        {/* Email Settings */}
        <div className="section">
          <div className="section-title">Email Account (for verification)</div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={personaEmail}
              onChange={e => setPersonaEmail(e.target.value)}
              placeholder="your@email.com"
            />
          </div>

          <div className="form-group">
            <label>Email Password</label>
            <input
              type="password"
              value={personaEmailPassword}
              onChange={e => setPersonaEmailPassword(e.target.value)}
              placeholder="Password"
            />
          </div>

          <div className="form-group">
            <label>Email Provider</label>
            <select
              value={personaEmailProvider}
              onChange={e => setPersonaEmailProvider(e.target.value as any)}
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="yahoo">Yahoo</option>
              <option value="protonmail">ProtonMail</option>
            </select>
          </div>
        </div>

        {/* Saved Credentials */}
        <div className="section">
          <div className="section-title">Saved Credentials</div>
          {credentials.length === 0 ? (
            <div className="empty-state">
              No saved credentials yet. The agent will save login details as you browse.
            </div>
          ) : (
            <div className="credentials-list">
              {credentials.map(cred => (
                <div className="credential-item" key={cred.id}>
                  <div>
                    <div className="credential-domain">{cred.domain}</div>
                    <div className="credential-email">{cred.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
}

// Mount
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<OptionsPage />);
}
