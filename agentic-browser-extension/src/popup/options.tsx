// ============================================
// Options Page Component
// Full settings configuration - Light Mode
// ============================================

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ExtensionSettings,
  PersonaProfile,
  AVAILABLE_MODELS,
  DEFAULT_MODELS,
  EMAIL_PROVIDERS
} from '../shared/types';

function Options() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      setSettings(response.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    setLoading(false);
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        payload: settings
      });
      showToast('Settings saved successfully!');
    } catch (error) {
      showToast('Failed to save settings');
    }
    setSaving(false);
  };

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const updateSettings = (path: string, value: any) => {
    if (!settings) return;

    const newSettings = JSON.parse(JSON.stringify(settings));
    const keys = path.split('.');
    let current: any = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setSettings(newSettings);
  };

  const validateApiKey = async () => {
    if (!settings?.openRouterApiKey) {
      showToast('Please enter an API key first');
      return;
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.openRouterApiKey}`
        }
      });

      if (response.ok) {
        showToast('API key is valid!');
      } else {
        showToast('Invalid API key');
      }
    } catch (error) {
      showToast('Failed to validate API key');
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container">
        <p>Failed to load settings. Please refresh the page.</p>
      </div>
    );
  }

  const agentModels = [
    { key: 'browsing', name: 'Browsing Agent', description: 'General web navigation', recommended: 'Claude 3.5 Sonnet' },
    { key: 'search', name: 'Search Agent', description: 'Research & web search', recommended: 'Perplexity Sonar (real-time)' },
    { key: 'social', name: 'Social Agent', description: 'Social media browsing', recommended: 'Claude 3.5 Sonnet' },
    { key: 'email', name: 'Email Agent', description: 'Email checking', recommended: 'Claude 3 Haiku (fast)' },
    { key: 'persona', name: 'Persona Agent', description: 'Behavior planning', recommended: 'GPT-4o' }
  ];

  return (
    <div className="container">
      <h1>Agentic Browser Settings</h1>
      <p className="subtitle">Configure your AI browsing agents and credentials</p>

      {/* API Configuration */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">🔑</span>
          API Configuration
        </h2>

        <div className="form-group">
          <label>OpenRouter API Key</label>
          <div className="input-group">
            <input
              type={showPassword ? 'text' : 'password'}
              value={settings.openRouterApiKey}
              onChange={(e) => updateSettings('openRouterApiKey', e.target.value)}
              placeholder="sk-or-v1-..."
            />
            <button
              className="btn btn-secondary"
              onClick={() => setShowPassword(!showPassword)}
              style={{ padding: '12px 16px' }}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
            <button className="btn btn-secondary" onClick={validateApiKey}>
              Validate
            </button>
          </div>
          <p className="help-text">
            Get your API key from <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a>
          </p>
        </div>
      </div>

      {/* Per-Agent Model Configuration */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">🤖</span>
          Agent Models
          <span className="model-badge">Each agent uses its own LLM</span>
        </h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          Configure a different model for each agent type. Different tasks benefit from different models.
        </p>

        {agentModels.map(agent => (
          <div className="form-group" key={agent.key}>
            <label>
              {agent.name}
              <span style={{ fontWeight: 400, color: '#888', marginLeft: '8px' }}>
                — {agent.description}
              </span>
            </label>
            <select
              value={settings.models[agent.key as keyof typeof settings.models]}
              onChange={(e) => updateSettings(`models.${agent.key}`, e.target.value)}
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <p className="help-text">Recommended: {agent.recommended}</p>
          </div>
        ))}

        <button
          className="btn btn-secondary"
          onClick={() => updateSettings('models', { ...DEFAULT_MODELS })}
        >
          Reset to Recommended Defaults
        </button>
      </div>

      {/* Email Credentials */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">📧</span>
          Email Credentials
        </h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          Enter your email credentials for the agent to log in via the web interface.
        </p>

        <div className="row">
          <div className="form-group">
            <label>Email Provider</label>
            <select
              value={settings.persona?.email?.provider || 'gmail'}
              onChange={(e) => updateSettings('persona.email.provider', e.target.value)}
            >
              {Object.entries(EMAIL_PROVIDERS).map(([key, provider]) => (
                <option key={key} value={key}>{provider.name}</option>
              ))}
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Check Frequency (minutes)</label>
            <input
              type="number"
              value={settings.persona?.email?.checkFrequency || 30}
              onChange={(e) => updateSettings('persona.email.checkFrequency', parseInt(e.target.value))}
              min={5}
              max={120}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            value={settings.persona?.email?.email || ''}
            onChange={(e) => updateSettings('persona.email.email', e.target.value)}
            placeholder="your.email@gmail.com"
          />
        </div>

        <div className="form-group">
          <label>Email Password</label>
          <div className="input-group">
            <input
              type={showEmailPassword ? 'text' : 'password'}
              value={settings.persona?.email?.password || ''}
              onChange={(e) => updateSettings('persona.email.password', e.target.value)}
              placeholder="Enter your email password"
            />
            <button
              className="btn btn-secondary"
              onClick={() => setShowEmailPassword(!showEmailPassword)}
              style={{ padding: '12px 16px' }}
            >
              {showEmailPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <p className="help-text">
            Stored locally. Used for webpage-based login only.
          </p>
        </div>

        <div className="checkbox-group">
          <input
            type="checkbox"
            checked={settings.persona?.email?.autoCheck || false}
            onChange={(e) => updateSettings('persona.email.autoCheck', e.target.checked)}
            id="autoCheck"
          />
          <label htmlFor="autoCheck" style={{ marginBottom: 0 }}>
            Auto-check email periodically
          </label>
        </div>
      </div>

      {/* Persona Configuration */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">👤</span>
          Persona Profile
        </h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
          Configure the simulated persona for authentic browsing behavior.
        </p>

        <div className="row">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={settings.persona?.name || ''}
              onChange={(e) => updateSettings('persona.name', e.target.value)}
              placeholder="Alex Smith"
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={settings.persona?.age || 25}
              onChange={(e) => updateSettings('persona.age', parseInt(e.target.value))}
              min={18}
              max={40}
            />
          </div>
        </div>

        <div className="row">
          <div className="form-group">
            <label>Gender</label>
            <select
              value={settings.persona?.gender || 'non-binary'}
              onChange={(e) => updateSettings('persona.gender', e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
            </select>
          </div>
          <div className="form-group">
            <label>Occupation</label>
            <input
              type="text"
              value={settings.persona?.occupation || ''}
              onChange={(e) => updateSettings('persona.occupation', e.target.value)}
              placeholder="Software Developer"
            />
          </div>
        </div>

        <div className="row">
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              value={settings.persona?.location?.city || ''}
              onChange={(e) => updateSettings('persona.location.city', e.target.value)}
              placeholder="San Francisco"
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={settings.persona?.location?.state || ''}
              onChange={(e) => updateSettings('persona.location.state', e.target.value)}
              placeholder="CA"
            />
          </div>
        </div>

        <div className="form-group">
          <label>Interests (comma-separated)</label>
          <textarea
            value={settings.persona?.interests?.join(', ') || ''}
            onChange={(e) => updateSettings('persona.interests', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            rows={2}
            placeholder="technology, gaming, music, fitness"
          />
        </div>

        {settings.persona && (
          <div className="persona-preview">
            <strong>Preview:</strong>
            <p style={{ marginTop: '8px', color: '#666' }}>
              {settings.persona.name || 'Anonymous'}, {settings.persona.age || '?'}-year-old {settings.persona.gender || '?'} from{' '}
              {settings.persona.location?.city || '?'}, {settings.persona.location?.state || '?'}.{' '}
              Works as {settings.persona.occupation || '?'}.
            </p>
            {settings.persona.interests && settings.persona.interests.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                {settings.persona.interests.slice(0, 8).map(interest => (
                  <span className="tag" key={interest}>{interest}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Human Simulation */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">🎭</span>
          Human Simulation
        </h2>

        <div className="checkbox-group form-group">
          <input
            type="checkbox"
            checked={settings.humanization?.enabled ?? true}
            onChange={(e) => updateSettings('humanization.enabled', e.target.checked)}
            id="humanEnabled"
          />
          <label htmlFor="humanEnabled" style={{ marginBottom: 0 }}>
            Enable human-like behavior simulation
          </label>
        </div>

        <div className="row">
          <div className="form-group">
            <label>Typo Rate (0-0.1)</label>
            <input
              type="number"
              value={settings.humanization?.typoRate || 0.02}
              onChange={(e) => updateSettings('humanization.typoRate', parseFloat(e.target.value))}
              min={0}
              max={0.1}
              step={0.01}
            />
            <p className="help-text">Probability of making typos when typing</p>
          </div>
          <div className="form-group">
            <label>Typing Speed (WPM)</label>
            <input
              type="number"
              value={settings.persona?.personality?.typingSpeed || 60}
              onChange={(e) => updateSettings('persona.personality.typingSpeed', parseInt(e.target.value))}
              min={20}
              max={120}
            />
            <p className="help-text">Words per minute when typing</p>
          </div>
        </div>

        <div className="checkbox-group form-group">
          <input
            type="checkbox"
            checked={settings.humanization?.thinkingPauses ?? true}
            onChange={(e) => updateSettings('humanization.thinkingPauses', e.target.checked)}
            id="thinkingPauses"
          />
          <label htmlFor="thinkingPauses" style={{ marginBottom: 0 }}>
            Add thinking pauses between actions
          </label>
        </div>

        <div className="checkbox-group form-group">
          <input
            type="checkbox"
            checked={settings.humanization?.naturalScrolling ?? true}
            onChange={(e) => updateSettings('humanization.naturalScrolling', e.target.checked)}
            id="naturalScrolling"
          />
          <label htmlFor="naturalScrolling" style={{ marginBottom: 0 }}>
            Natural scrolling behavior
          </label>
        </div>

        <div className="checkbox-group">
          <input
            type="checkbox"
            checked={settings.humanization?.mouseJitter ?? true}
            onChange={(e) => updateSettings('humanization.mouseJitter', e.target.checked)}
            id="mouseJitter"
          />
          <label htmlFor="mouseJitter" style={{ marginBottom: 0 }}>
            Mouse movement with slight jitter
          </label>
        </div>
      </div>

      {/* Advanced */}
      <div className="section">
        <h2 className="section-title">
          <span className="icon">⚙️</span>
          Advanced
        </h2>

        <div className="checkbox-group form-group">
          <input
            type="checkbox"
            checked={settings.autoStart ?? false}
            onChange={(e) => updateSettings('autoStart', e.target.checked)}
            id="autoStart"
          />
          <label htmlFor="autoStart" style={{ marginBottom: 0 }}>
            Auto-start browsing when extension loads
          </label>
        </div>

        <div className="form-group">
          <label>Max Concurrent Agents</label>
          <input
            type="number"
            value={settings.maxConcurrentAgents || 2}
            onChange={(e) => updateSettings('maxConcurrentAgents', parseInt(e.target.value))}
            min={1}
            max={4}
          />
          <p className="help-text">Maximum number of agents running simultaneously</p>
        </div>

        <div className="checkbox-group">
          <input
            type="checkbox"
            checked={settings.debugMode ?? false}
            onChange={(e) => updateSettings('debugMode', e.target.checked)}
            id="debugMode"
          />
          <label htmlFor="debugMode" style={{ marginBottom: 0 }}>
            Debug mode (verbose logging)
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button
          className="btn btn-primary"
          onClick={saveSettings}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={loadSettings}
        >
          Discard Changes
        </button>
      </div>

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// Mount app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Options />);
}
