// ============================================
// Options Page Component
// Full settings configuration - Claude-like UX
// ============================================

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ExtensionSettings,
  PersonaProfile,
  DEFAULT_MODELS,
  EMAIL_PROVIDERS
} from '../shared/types';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

function Options() {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [availableModels, setAvailableModels] = useState<OpenRouterModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelSearch, setModelSearch] = useState('');
  const [activeSection, setActiveSection] = useState('api');

  useEffect(() => {
    loadSettings();
    fetchOpenRouterModels();
  }, []);

  const fetchOpenRouterModels = async () => {
    try {
      setModelsLoading(true);
      const response = await fetch('https://openrouter.ai/api/v1/models');
      if (response.ok) {
        const data = await response.json();
        // Sort models: Anthropic first, then OpenAI, then Perplexity, then rest
        const sorted = (data.data || []).sort((a: OpenRouterModel, b: OpenRouterModel) => {
          const order = ['anthropic', 'openai', 'perplexity', 'google', 'meta-llama', 'mistral'];
          const aPrefix = a.id.split('/')[0];
          const bPrefix = b.id.split('/')[0];
          const aIndex = order.indexOf(aPrefix);
          const bIndex = order.indexOf(bPrefix);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.id.localeCompare(b.id);
        });
        setAvailableModels(sorted);
      }
    } catch (error) {
      console.error('Failed to fetch models:', error);
    }
    setModelsLoading(false);
  };

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
      showToast('Settings saved');
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
      const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: {
          'Authorization': `Bearer ${settings.openRouterApiKey}`
        }
      });

      if (response.ok) {
        showToast('API key verified');
      } else {
        showToast('Invalid API key');
      }
    } catch (error) {
      showToast('Failed to validate');
    }
  };

  const filteredModels = availableModels.filter(m =>
    m.id.toLowerCase().includes(modelSearch.toLowerCase()) ||
    m.name?.toLowerCase().includes(modelSearch.toLowerCase())
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
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
    { key: 'browsing', name: 'Browsing', description: 'General web navigation', icon: '🌐' },
    { key: 'search', name: 'Search', description: 'Research & real-time search', icon: '🔍' },
    { key: 'social', name: 'Social', description: 'Social media interactions', icon: '📱' },
    { key: 'email', name: 'Email', description: 'Email checking & reading', icon: '📧' },
    { key: 'persona', name: 'Persona', description: 'Behavior planning', icon: '🎭' }
  ];

  const sections = [
    { id: 'api', name: 'API', icon: '🔑' },
    { id: 'models', name: 'Models', icon: '🤖' },
    { id: 'email', name: 'Email', icon: '📧' },
    { id: 'persona', name: 'Persona', icon: '👤' },
    { id: 'behavior', name: 'Behavior', icon: '🎭' },
    { id: 'advanced', name: 'Advanced', icon: '⚙️' }
  ];

  return (
    <div className="settings-layout">
      {/* Sidebar Navigation */}
      <nav className="settings-nav">
        <div className="nav-header">
          <div className="nav-logo">A</div>
          <div>
            <h1>Agentic Browser</h1>
            <p>Settings</p>
          </div>
        </div>
        <div className="nav-items">
          {sections.map(section => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              {section.name}
            </button>
          ))}
        </div>
        <div className="nav-footer">
          <button
            className="save-btn"
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="settings-content">
        {/* API Configuration */}
        {activeSection === 'api' && (
          <section className="section">
            <div className="section-header">
              <h2>API Configuration</h2>
              <p>Connect to OpenRouter to power your browsing agents</p>
            </div>

            <div className="card">
              <div className="form-group">
                <label>OpenRouter API Key</label>
                <div className="input-row">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={settings.openRouterApiKey}
                    onChange={(e) => updateSettings('openRouterApiKey', e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="input-main"
                  />
                  <button
                    className="btn-icon"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide' : 'Show'}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                  <button className="btn-secondary" onClick={validateApiKey}>
                    Verify
                  </button>
                </div>
                <p className="help-text">
                  Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener">openrouter.ai/keys</a>
                </p>
              </div>

              <div className="info-box">
                <strong>OpenRouter provides access to 100+ models</strong>
                <p>Including Claude, GPT-4, Perplexity (real-time search), Llama, Gemini, and more.</p>
              </div>
            </div>
          </section>
        )}

        {/* Agent Models */}
        {activeSection === 'models' && (
          <section className="section">
            <div className="section-header">
              <h2>Agent Models</h2>
              <p>Each agent can use a different LLM optimized for its task</p>
            </div>

            <div className="model-search">
              <input
                type="text"
                placeholder="Search models..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
              />
              {modelsLoading && <span className="loading-text">Loading models...</span>}
              {!modelsLoading && <span className="model-count">{availableModels.length} models available</span>}
            </div>

            <div className="agents-grid">
              {agentModels.map(agent => (
                <div className="agent-card" key={agent.key}>
                  <div className="agent-card-header">
                    <span className="agent-icon">{agent.icon}</span>
                    <div>
                      <h3>{agent.name}</h3>
                      <p>{agent.description}</p>
                    </div>
                  </div>
                  <select
                    value={settings.models[agent.key as keyof typeof settings.models]}
                    onChange={(e) => updateSettings(`models.${agent.key}`, e.target.value)}
                    className="model-select"
                  >
                    {filteredModels.length === 0 && !modelsLoading && (
                      <option value="">No models found</option>
                    )}
                    {filteredModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.id}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <button
              className="btn-secondary"
              onClick={() => updateSettings('models', { ...DEFAULT_MODELS })}
              style={{ marginTop: '16px' }}
            >
              Reset to Defaults
            </button>
          </section>
        )}

        {/* Email Credentials */}
        {activeSection === 'email' && (
          <section className="section">
            <div className="section-header">
              <h2>Email Credentials</h2>
              <p>Your agent will use these credentials to log in via the web</p>
            </div>

            <div className="card">
              <div className="form-row">
                <div className="form-group">
                  <label>Provider</label>
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
                  <label>Check Every (min)</label>
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
                  placeholder="you@example.com"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-row">
                  <input
                    type={showEmailPassword ? 'text' : 'password'}
                    value={settings.persona?.email?.password || ''}
                    onChange={(e) => updateSettings('persona.email.password', e.target.value)}
                    placeholder="••••••••"
                    className="input-main"
                  />
                  <button
                    className="btn-icon"
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                  >
                    {showEmailPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <p className="help-text">Stored locally only</p>
              </div>

              <div className="checkbox-row">
                <input
                  type="checkbox"
                  checked={settings.persona?.email?.autoCheck || false}
                  onChange={(e) => updateSettings('persona.email.autoCheck', e.target.checked)}
                  id="autoCheck"
                />
                <label htmlFor="autoCheck">Auto-check email periodically</label>
              </div>
            </div>
          </section>
        )}

        {/* Persona */}
        {activeSection === 'persona' && (
          <section className="section">
            <div className="section-header">
              <h2>Persona Profile</h2>
              <p>Configure the simulated browsing identity</p>
            </div>

            <div className="card">
              <div className="form-row">
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
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Occupation</label>
                  <input
                    type="text"
                    value={settings.persona?.occupation || ''}
                    onChange={(e) => updateSettings('persona.occupation', e.target.value)}
                    placeholder="Software Developer"
                  />
                </div>
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
                <label>Interests</label>
                <textarea
                  value={settings.persona?.interests?.join(', ') || ''}
                  onChange={(e) => updateSettings('persona.interests', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  rows={2}
                  placeholder="technology, gaming, music, fitness"
                />
                <p className="help-text">Comma-separated list</p>
              </div>
            </div>

            {settings.persona?.name && (
              <div className="persona-preview">
                <div className="persona-avatar">{settings.persona.name.charAt(0)}</div>
                <div>
                  <strong>{settings.persona.name}</strong>
                  <p>
                    {settings.persona.age}yo {settings.persona.gender} • {settings.persona.location?.city}, {settings.persona.location?.state}
                  </p>
                  {settings.persona.interests && settings.persona.interests.length > 0 && (
                    <div className="tags">
                      {settings.persona.interests.slice(0, 5).map(i => (
                        <span className="tag" key={i}>{i}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Behavior */}
        {activeSection === 'behavior' && (
          <section className="section">
            <div className="section-header">
              <h2>Human Behavior Simulation</h2>
              <p>Make browsing more authentic and human-like</p>
            </div>

            <div className="card">
              <div className="toggle-row">
                <div>
                  <strong>Enable Simulation</strong>
                  <p>Master toggle for all human-like behaviors</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.humanization?.enabled ?? true}
                    onChange={(e) => updateSettings('humanization.enabled', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-row">
                <div>
                  <strong>Thinking Pauses</strong>
                  <p>Add natural delays between actions</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.humanization?.thinkingPauses ?? true}
                    onChange={(e) => updateSettings('humanization.thinkingPauses', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-row">
                <div>
                  <strong>Natural Scrolling</strong>
                  <p>Scroll with varying speeds and pauses</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.humanization?.naturalScrolling ?? true}
                    onChange={(e) => updateSettings('humanization.naturalScrolling', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-row">
                <div>
                  <strong>Mouse Movement</strong>
                  <p>Bezier curve movements with slight jitter</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.humanization?.mouseJitter ?? true}
                    onChange={(e) => updateSettings('humanization.mouseJitter', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="form-row" style={{ marginTop: '16px' }}>
                <div className="form-group">
                  <label>Typo Rate</label>
                  <input
                    type="number"
                    value={settings.humanization?.typoRate || 0.02}
                    onChange={(e) => updateSettings('humanization.typoRate', parseFloat(e.target.value))}
                    min={0}
                    max={0.1}
                    step={0.01}
                  />
                  <p className="help-text">0 = none, 0.1 = frequent</p>
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
                  <p className="help-text">Words per minute</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Advanced */}
        {activeSection === 'advanced' && (
          <section className="section">
            <div className="section-header">
              <h2>Advanced Settings</h2>
              <p>Additional configuration options</p>
            </div>

            <div className="card">
              <div className="toggle-row">
                <div>
                  <strong>Auto-start Browsing</strong>
                  <p>Begin autonomous browsing when extension loads</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.autoStart ?? false}
                    onChange={(e) => updateSettings('autoStart', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="toggle-row">
                <div>
                  <strong>Debug Mode</strong>
                  <p>Enable verbose logging for troubleshooting</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={settings.debugMode ?? false}
                    onChange={(e) => updateSettings('debugMode', e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="form-group" style={{ marginTop: '16px' }}>
                <label>Max Concurrent Agents</label>
                <input
                  type="number"
                  value={settings.maxConcurrentAgents || 2}
                  onChange={(e) => updateSettings('maxConcurrentAgents', parseInt(e.target.value))}
                  min={1}
                  max={4}
                  style={{ width: '100px' }}
                />
                <p className="help-text">How many agents can run at once</p>
              </div>
            </div>
          </section>
        )}
      </main>

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
