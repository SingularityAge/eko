// ============================================
// Settings/Options Page - Simplified
// ============================================

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Settings, Credential, DEFAULT_SETTINGS } from '../shared/types';

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #1a1a1a; min-width: 400px; }
  .container { max-width: 500px; margin: 0 auto; padding: 20px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header h1 { font-size: 20px; color: #DA7756; }
  .header p { font-size: 12px; color: #666; margin-top: 4px; }
  .section { background: white; border-radius: 10px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .section-title { font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #333; }
  .form-group { margin-bottom: 12px; }
  .form-group label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px; color: #555; }
  .form-group input, .form-group select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; }
  .form-group input:focus, .form-group select:focus { outline: none; border-color: #DA7756; }
  .form-group .hint { font-size: 10px; color: #888; margin-top: 2px; }
  .btn { padding: 10px 20px; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; }
  .btn-primary { background: #DA7756; color: white; width: 100%; }
  .btn-primary:hover { background: #c4684a; }
  .success { background: #d4edda; color: #155724; padding: 10px; border-radius: 6px; margin-bottom: 12px; font-size: 12px; }
  .credentials-list { border: 1px solid #eee; border-radius: 6px; max-height: 150px; overflow-y: auto; }
  .credential-item { padding: 8px 10px; border-bottom: 1px solid #eee; }
  .credential-item:last-child { border-bottom: none; }
  .credential-domain { font-size: 12px; font-weight: 500; }
  .credential-email { font-size: 11px; color: #666; }
  .empty-state { text-align: center; padding: 16px; color: #888; font-size: 12px; }
  .info-box { background: #f0f7ff; border: 1px solid #cce5ff; border-radius: 6px; padding: 10px; font-size: 11px; color: #555; }
`;

function OptionsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCredentials();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response && !response.error) {
        setSettings(response);
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
    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', payload: settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <div className="header">
          <h1>AutoBrowser Settings</h1>
          <p>Configure your browsing agent</p>
        </div>

        {saved && <div className="success">Settings saved!</div>}

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
              <option value="anthropic/claude-sonnet-4">Claude Sonnet 4</option>
              <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="openai/gpt-4o">GPT-4o</option>
              <option value="google/gemini-pro-1.5">Gemini Pro 1.5</option>
            </select>
          </div>
        </div>

        <div className="section">
          <div className="info-box">
            Create your browsing persona in the sidebar panel. Click the extension icon to open it.
          </div>
        </div>

        <div className="section">
          <div className="section-title">Saved Credentials</div>
          {credentials.length === 0 ? (
            <div className="empty-state">No saved credentials yet.</div>
          ) : (
            <div className="credentials-list">
              {credentials.map(cred => (
                <div className="credential-item" key={cred.id}>
                  <div className="credential-domain">{cred.domain}</div>
                  <div className="credential-email">{cred.email}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<OptionsPage />);
}
