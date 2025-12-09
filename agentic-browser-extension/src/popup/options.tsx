// ============================================
// Options Page Component
// Full settings configuration
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
import { PersonaEngine } from '../services/persona-engine';

function Options() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

    const newSettings = { ...settings };
    const keys = path.split('.');
    let current: any = newSettings;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setSettings(newSettings);
  };

  const generateNewPersona = () => {
    const engine = new PersonaEngine();
    const newPersona = engine.generatePersona();
    updateSettings('persona', newPersona);
    showToast('New persona generated!');
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
        <div>Loading...</div>
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

  return (
    <div className="container">
      <h1>Agentic Browser Settings</h1>
      <p className="subtitle">Configure your AI browsing agents and persona</p>

      {/* API Configuration */}
      <div className="section">
        <h2 className="section-title">🔑 API Configuration</h2>

        <div className="form-group">
          <label>OpenRouter API Key</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={settings.openRouterApiKey}
              onChange={(e) => updateSettings('openRouterApiKey', e.target.value)}
              placeholder="sk-or-..."
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={validateApiKey}
            >
              Validate
            </button>
          </div>
          <p className="help-text">
            Get your API key from <a href="https://openrouter.ai/keys" target="_blank" style={{ color: '#4CAF50' }}>openrouter.ai/keys</a>
          </p>
        </div>
      </div>

      {/* Model Configuration */}
      <div className="section">
        <h2 className="section-title">🤖 Model Configuration</h2>

        <div className="model-grid">
          {Object.entries(settings.models).map(([agent, model]) => (
            <div className="form-group" key={agent}>
              <label>{agent.charAt(0).toUpperCase() + agent.slice(1)} Agent Model</label>
              <select
                value={model}
                onChange={(e) => updateSettings(`models.${agent}`, e.target.value)}
              >
                {AVAILABLE_MODELS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <p className="help-text">
                {agent === 'search' && 'Perplexity models recommended for real-time search'}
                {agent === 'email' && 'Fast models like Haiku recommended for quick tasks'}
              </p>
            </div>
          ))}
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => updateSettings('models', { ...DEFAULT_MODELS })}
        >
          Reset to Defaults
        </button>
      </div>

      {/* Persona Configuration */}
      <div className="section">
        <h2 className="section-title">👤 Persona Configuration</h2>

        <div className="row">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={settings.persona?.name || ''}
              onChange={(e) => updateSettings('persona.name', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              value={settings.persona?.age || 22}
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
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={settings.persona?.location?.state || ''}
              onChange={(e) => updateSettings('persona.location.state', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label>Interests (comma-separated)</label>
          <textarea
            value={settings.persona?.interests?.join(', ') || ''}
            onChange={(e) => updateSettings('persona.interests', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            rows={3}
          />
        </div>

        {settings.persona && (
          <div className="persona-preview">
            <strong>Preview:</strong>
            <p style={{ marginTop: '8px', color: '#aaa' }}>
              {settings.persona.name}, {settings.persona.age}-year-old {settings.persona.gender} from{' '}
              {settings.persona.location?.city}, {settings.persona.location?.state}.{' '}
              Works as {settings.persona.occupation}.
            </p>
            <div style={{ marginTop: '8px' }}>
              {settings.persona.interests?.slice(0, 8).map(interest => (
                <span className="tag" key={interest}>{interest}</span>
              ))}
            </div>
          </div>
        )}

        <button
          className="btn btn-secondary"
          onClick={generateNewPersona}
          style={{ marginTop: '12px' }}
        >
          🎲 Generate Random Persona
        </button>
      </div>

      {/* Email Configuration */}
      <div className="section">
        <h2 className="section-title">📧 Email Configuration</h2>

        <div className="row">
          <div className="form-group">
            <label>Email Provider</label>
            <select
              value={settings.persona?.email?.provider || 'gmail'}
              onChange={(e) => updateSettings('persona.email.provider', e.target.value)}
            >
              {Object.keys(EMAIL_PROVIDERS).map(provider => (
                <option key={provider} value={provider}>
                  {EMAIL_PROVIDERS[provider as keyof typeof EMAIL_PROVIDERS].name}
                </option>
              ))}
              <option value="other">Other (custom URL)</option>
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
            placeholder="your@email.com"
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={settings.persona?.email?.password || ''}
            onChange={(e) => updateSettings('persona.email.password', e.target.value)}
            placeholder="Email password"
          />
          <p className="help-text">
            Stored locally and encrypted. Used for webpage-based login.
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

      {/* Human Simulation */}
      <div className="section">
        <h2 className="section-title">🎭 Human Simulation</h2>

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
            <label>Typo Rate (0-1)</label>
            <input
              type="number"
              value={settings.humanization?.typoRate || 0.02}
              onChange={(e) => updateSettings('humanization.typoRate', parseFloat(e.target.value))}
              min={0}
              max={0.1}
              step={0.01}
            />
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
            Mouse movement jitter
          </label>
        </div>
      </div>

      {/* Advanced */}
      <div className="section">
        <h2 className="section-title">⚙️ Advanced</h2>

        <div className="checkbox-group form-group">
          <input
            type="checkbox"
            checked={settings.autoStart ?? false}
            onChange={(e) => updateSettings('autoStart', e.target.checked)}
            id="autoStart"
          />
          <label htmlFor="autoStart" style={{ marginBottom: 0 }}>
            Auto-start browsing on extension load
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
          Reset Changes
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
