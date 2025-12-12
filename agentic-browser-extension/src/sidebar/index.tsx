// ============================================
// Sidebar UI - Control Panel
// ============================================

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserState, Activity, Settings } from '../shared/types';

// Gear icon SVG
const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

// Check icon SVG
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a1a1a; }
  .container { padding: 16px; min-height: 100vh; display: flex; flex-direction: column; }

  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #eee; margin-bottom: 16px; }
  .header-left h1 { font-size: 20px; font-weight: 600; color: #DA7756; }
  .header-left .status { font-size: 12px; color: #666; margin-top: 4px; }
  .status.ready { color: #4CAF50; }
  .status.running { color: #2196F3; }
  .status.paused { color: #FF9800; }

  .gear-btn { background: none; border: none; cursor: pointer; padding: 8px; border-radius: 6px; transition: background 0.2s; }
  .gear-btn:hover { background: #f5f5f5; }

  .controls { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
  .btn { padding: 12px 24px; border: none; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-primary { background: #DA7756; color: white; }
  .btn-primary:hover { background: #c4684a; }
  .btn-primary:disabled { background: #ccc; cursor: not-allowed; }
  .btn-secondary { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
  .btn-secondary:hover { background: #eee; }
  .btn-danger { background: #f44336; color: white; }

  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px; }
  .stat { background: #f9f9f9; padding: 12px; border-radius: 8px; text-align: center; }
  .stat-value { font-size: 24px; font-weight: 600; color: #DA7756; }
  .stat-label { font-size: 11px; color: #888; text-transform: uppercase; }

  .current-action { background: #f0f7ff; border: 1px solid #cce5ff; border-radius: 8px; padding: 12px; margin-bottom: 16px; }
  .current-action-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
  .current-action-text { font-size: 13px; color: #333; word-break: break-word; }

  .url-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 16px; }

  .section-title { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; margin-bottom: 8px; }

  .activities { flex: 1; overflow-y: auto; }
  .activity { padding: 8px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
  .activity:last-child { border-bottom: none; }
  .activity-type { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 500; margin-right: 8px; }
  .activity-type.navigation { background: #e3f2fd; color: #1976d2; }
  .activity-type.click { background: #f3e5f5; color: #7b1fa2; }
  .activity-type.type { background: #e8f5e9; color: #388e3c; }
  .activity-type.scroll { background: #fff3e0; color: #f57c00; }
  .activity-type.search { background: #fce4ec; color: #c2185b; }
  .activity-type.error { background: #ffebee; color: #d32f2f; }
  .activity-time { color: #999; font-size: 10px; float: right; }

  .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; color: #856404; }

  /* Settings Panel */
  .settings-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 400px; background: white; box-shadow: -2px 0 10px rgba(0,0,0,0.1); z-index: 100; overflow-y: auto; transform: translateX(100%); transition: transform 0.3s; }
  .settings-panel.open { transform: translateX(0); }
  .settings-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid #eee; }
  .settings-header h2 { font-size: 18px; }
  .close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; }
  .settings-content { padding: 16px; }
  .form-group { margin-bottom: 16px; }
  .form-group label { display: block; font-size: 13px; font-weight: 500; margin-bottom: 6px; color: #555; }
  .form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
  .form-group input:focus, .form-group select:focus { outline: none; border-color: #DA7756; }
  .form-group .hint { font-size: 11px; color: #888; margin-top: 4px; }

  .model-confirm { display: flex; align-items: center; gap: 8px; margin-top: 8px; padding: 8px 12px; background: #e8f5e9; border-radius: 6px; font-size: 13px; color: #2e7d32; }

  .empty-state { text-align: center; padding: 20px; color: #888; }
`;

interface OpenRouterModel {
  id: string;
  name: string;
}

interface Persona {
  name: string;
  age: number;
  location: string;
  occupation: string;
  interests: string[];
}

function Sidebar() {
  const [state, setState] = useState<BrowserState>({
    status: 'idle',
    currentUrl: '',
    currentAction: 'Ready',
    totalActions: 0,
    errors: 0
  });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [persona, setPersona] = useState<Persona | null>(null);

  // Settings state
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-sonnet-4');
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [modelConfirm, setModelConfirm] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);

  const loadState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (response) {
        setState(response.state);
        setHasApiKey(response.hasApiKey);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITIES', payload: { limit: 30 } });
      if (Array.isArray(response)) {
        setActivities(response);
      }
    } catch (e) {
      console.error('Failed to load activities:', e);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response) {
        setApiKey(response.openRouterApiKey || '');
        setSelectedModel(response.model || 'anthropic/claude-sonnet-4');
        if (response.persona) {
          setPersona(response.persona);
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const fetchModels = async () => {
    if (!apiKey) return;

    setLoadingModels(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'FETCH_MODELS',
        payload: { apiKey }
      });
      if (response?.models) {
        setModels(response.models.map((m: any) => ({ id: m.id, name: m.name || m.id })));
      }
    } catch (e) {
      console.error('Failed to fetch models:', e);
    }
    setLoadingModels(false);
  };

  useEffect(() => {
    loadState();
    loadActivities();
    loadSettings();

    const listener = (message: any) => {
      if (message.type === 'STATE_UPDATE') {
        setState(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    const interval = setInterval(() => {
      loadState();
      loadActivities();
    }, 2000);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      clearInterval(interval);
    };
  }, []);

  // Fetch models when API key changes
  useEffect(() => {
    if (apiKey && settingsOpen) {
      fetchModels();
    }
  }, [apiKey, settingsOpen]);

  const handleStart = async () => {
    await chrome.runtime.sendMessage({ type: 'START' });
  };

  const handleStop = async () => {
    await chrome.runtime.sendMessage({ type: 'STOP' });
  };

  const handlePause = async () => {
    await chrome.runtime.sendMessage({ type: 'PAUSE' });
  };

  const handleResume = async () => {
    await chrome.runtime.sendMessage({ type: 'RESUME' });
  };

  const handleSaveSettings = async () => {
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      payload: { openRouterApiKey: apiKey, model: selectedModel }
    });
    setHasApiKey(!!apiKey);
  };

  const handleModelChange = async (newModel: string) => {
    setSelectedModel(newModel);
    await chrome.runtime.sendMessage({
      type: 'SAVE_SETTINGS',
      payload: { model: newModel }
    });

    // Show confirmation
    const modelName = models.find(m => m.id === newModel)?.name || newModel;
    setModelConfirm(modelName);
    setTimeout(() => setModelConfirm(''), 3000);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canStart = hasApiKey && state.status === 'idle';

  // Group models by provider
  const groupedModels = models.reduce((acc, model) => {
    const provider = model.id.split('/')[0];
    if (!acc[provider]) acc[provider] = [];
    acc[provider].push(model);
    return acc;
  }, {} as Record<string, OpenRouterModel[]>);

  const sortedProviders = Object.keys(groupedModels).sort();

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <div className="header">
          <div className="header-left">
            <h1>AutoBrowser</h1>
            <div className={`status ${state.status}`}>
              {state.status === 'idle' && 'Ready to browse'}
              {state.status === 'running' && 'Browsing autonomously'}
              {state.status === 'paused' && 'Paused'}
            </div>
          </div>
          <button className="gear-btn" onClick={() => setSettingsOpen(true)} title="Settings">
            <GearIcon />
          </button>
        </div>

        {!hasApiKey && (
          <div className="warning">
            Please configure your OpenRouter API key in Settings to start browsing.
          </div>
        )}

        <div className="controls">
          {state.status === 'idle' && (
            <button className="btn btn-primary" onClick={handleStart} disabled={!canStart}>
              Start Browsing
            </button>
          )}
          {state.status === 'running' && (
            <>
              <button className="btn btn-secondary" onClick={handlePause}>Pause</button>
              <button className="btn btn-danger" onClick={handleStop}>Stop</button>
            </>
          )}
          {state.status === 'paused' && (
            <>
              <button className="btn btn-primary" onClick={handleResume}>Resume</button>
              <button className="btn btn-danger" onClick={handleStop}>Stop</button>
            </>
          )}
        </div>

        <div className="stats">
          <div className="stat">
            <div className="stat-value">{state.totalActions}</div>
            <div className="stat-label">Actions</div>
          </div>
          <div className="stat">
            <div className="stat-value">{state.errors}</div>
            <div className="stat-label">Errors</div>
          </div>
        </div>

        <div className="current-action">
          <div className="current-action-label">Current Action</div>
          <div className="current-action-text">{state.currentAction || 'Idle'}</div>
        </div>

        {state.currentUrl && (
          <div className="url-box">
            <div className="current-action-label">Current URL</div>
            <div className="current-action-text">{state.currentUrl}</div>
          </div>
        )}

        {persona && (
          <div className="url-box" style={{ background: '#f0f7ff', borderColor: '#cce5ff' }}>
            <div className="current-action-label">Browsing Persona</div>
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              <strong>{persona.name}</strong>, {persona.age} - {persona.occupation}
            </div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
              {persona.location}
            </div>
            <div style={{ fontSize: '11px', color: '#888' }}>
              Interests: {persona.interests.join(', ')}
            </div>
          </div>
        )}

        <div className="section-title">Recent Activity</div>
        <div className="activities">
          {activities.length === 0 ? (
            <div className="empty-state">No activity yet. Press Start to begin!</div>
          ) : (
            activities.map(activity => (
              <div className="activity" key={activity.id}>
                <span className={`activity-type ${activity.type}`}>{activity.type}</span>
                <span className="activity-time">{formatTime(activity.timestamp)}</span>
                <div style={{ marginTop: '4px', color: '#666' }}>{activity.details.slice(0, 100)}</div>
              </div>
            ))
          )}
        </div>

        {/* Settings Panel */}
        <div className={`settings-panel ${settingsOpen ? 'open' : ''}`}>
          <div className="settings-header">
            <h2>Settings</h2>
            <button className="close-btn" onClick={() => setSettingsOpen(false)}>&times;</button>
          </div>
          <div className="settings-content">
            <div className="form-group">
              <label>OpenRouter API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onBlur={handleSaveSettings}
                placeholder="sk-or-..."
              />
              <div className="hint">Get your key from openrouter.ai</div>
            </div>

            <div className="form-group">
              <label>Model (Multimodal Only)</label>
              {!apiKey ? (
                <select disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  <option>Enter API key first...</option>
                </select>
              ) : loadingModels ? (
                <div style={{ padding: '10px', color: '#666' }}>Loading models...</div>
              ) : models.length > 0 ? (
                <select value={selectedModel} onChange={e => handleModelChange(e.target.value)}>
                  {sortedProviders.map(provider => (
                    <optgroup key={provider} label={provider.charAt(0).toUpperCase() + provider.slice(1)}>
                      {groupedModels[provider].map(model => (
                        <option key={model.id} value={model.id}>{model.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              ) : (
                <select disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                  <option>No models loaded. Check API key.</option>
                </select>
              )}
              {modelConfirm && (
                <div className="model-confirm">
                  <CheckIcon />
                  <span>{modelConfirm} successfully activated</span>
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={() => { handleSaveSettings(); setSettingsOpen(false); }} style={{ width: '100%' }}>
              Save & Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Sidebar />);
}
