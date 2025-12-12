// ============================================
// Sidebar UI - Control Panel
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserState, Activity } from '../shared/types';

// Country list (alphabetically sorted)
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic",
  "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus",
  "Czech Republic", "Denmark", "Djibouti", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
  "Estonia", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana",
  "Greece", "Guatemala", "Guinea", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Mauritania", "Mauritius", "Mexico", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco",
  "Mozambique", "Myanmar", "Namibia", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger",
  "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Panama", "Papua New Guinea",
  "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda",
  "Saudi Arabia", "Senegal", "Serbia", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Somalia",
  "South Africa", "South Korea", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Trinidad and Tobago", "Tunisia",
  "Turkey", "Turkmenistan", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States",
  "Uruguay", "Uzbekistan", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

// Icons
const GearIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const SparklesIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"></path>
    <path d="M19 13l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"></path>
    <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z"></path>
  </svg>
);

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="17 8 12 3 7 8"></polyline>
    <line x1="12" y1="3" x2="12" y2="15"></line>
  </svg>
);

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #1a1a1a; }
  .container { padding: 12px; min-height: 100vh; display: flex; flex-direction: column; }

  .header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid #eee; margin-bottom: 12px; }
  .header-left h1 { font-size: 18px; font-weight: 600; color: #DA7756; }
  .header-left .status { font-size: 11px; color: #666; margin-top: 2px; }
  .status.ready { color: #4CAF50; }
  .status.running { color: #2196F3; }
  .status.paused { color: #FF9800; }

  .controls { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; }
  .btn { padding: 10px 20px; border: none; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
  .btn-primary { background: #DA7756; color: white; }
  .btn-primary:hover { background: #c4684a; }
  .btn-primary:disabled { background: #ccc; cursor: not-allowed; }
  .btn-secondary { background: #f5f5f5; color: #333; border: 1px solid #ddd; }
  .btn-secondary:hover { background: #eee; }
  .btn-danger { background: #f44336; color: white; }

  .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; }
  .stat { background: #f9f9f9; padding: 10px; border-radius: 6px; text-align: center; }
  .stat-value { font-size: 20px; font-weight: 600; color: #DA7756; }
  .stat-label { font-size: 10px; color: #888; text-transform: uppercase; }

  .current-action { background: #f0f7ff; border: 1px solid #cce5ff; border-radius: 6px; padding: 10px; margin-bottom: 12px; }
  .current-action-label { font-size: 10px; color: #666; text-transform: uppercase; margin-bottom: 2px; }
  .current-action-text { font-size: 12px; color: #333; word-break: break-word; }

  .url-box { background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 10px; margin-bottom: 12px; }

  .section-title { font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; margin-bottom: 6px; }

  /* Persona Box */
  .persona-box { background: #f0f7ff; border: 1px solid #cce5ff; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
  .persona-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .persona-title { font-size: 10px; color: #666; text-transform: uppercase; }
  .persona-icons { display: flex; gap: 8px; }
  .persona-icons button { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; }
  .persona-icons button:hover { background: rgba(0,0,0,0.05); }

  .placeholder-bar { background: #ddd; border-radius: 3px; height: 14px; margin-bottom: 6px; }
  .placeholder-bar.short { width: 60%; }
  .placeholder-bar.medium { width: 80%; }
  .placeholder-bar.long { width: 100%; }

  .location-row { display: flex; gap: 8px; margin-bottom: 8px; }
  .location-row select, .location-row input { flex: 1; padding: 6px 8px; border: 1px solid #ccc; border-radius: 4px; font-size: 12px; }
  .location-row select:disabled, .location-row input:disabled { background: #eee; cursor: not-allowed; }

  .city-wrapper { position: relative; flex: 1; display: flex; align-items: center; }
  .city-wrapper input { width: 100%; padding-right: 28px; }
  .city-check { position: absolute; right: 8px; opacity: 0; transition: opacity 0.3s; }
  .city-check.visible { opacity: 1; }
  .city-check.fade-out { animation: fadeOut 2s forwards; }
  @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

  .city-suggestions { position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #ddd; border-radius: 4px; max-height: 150px; overflow-y: auto; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .city-suggestion { padding: 6px 10px; cursor: pointer; font-size: 12px; }
  .city-suggestion:hover { background: #f0f7ff; }

  .generate-btn { display: flex; align-items: center; gap: 6px; color: #555; font-size: 12px; cursor: pointer; padding: 6px 0; opacity: 0; animation: fadeIn 1s forwards; margin-top: 4px; }
  .generate-btn:hover { color: #333; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .persona-data { animation: fadeIn 0.5s forwards; }
  .persona-name { font-size: 13px; font-weight: 500; margin-bottom: 2px; }
  .persona-details { font-size: 11px; color: #666; margin-bottom: 4px; }
  .persona-interests { font-size: 10px; color: #888; }

  /* Settings Box */
  .settings-box { background: #f9f9f9; border-radius: 6px; padding: 12px; margin-bottom: 12px; }
  .form-group { margin-bottom: 10px; }
  .form-group:last-child { margin-bottom: 0; }
  .form-group label { display: block; font-size: 11px; font-weight: 500; margin-bottom: 4px; color: #555; }
  .form-group input, .form-group select { width: 100%; padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 12px; }
  .form-group input:focus, .form-group select:focus { outline: none; border-color: #DA7756; }
  .form-group .hint { font-size: 10px; color: #888; margin-top: 2px; }
  .model-confirm { display: flex; align-items: center; gap: 6px; margin-top: 6px; padding: 6px 10px; background: #e8f5e9; border-radius: 4px; font-size: 11px; color: #2e7d32; }

  .warning { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 10px; margin-bottom: 12px; font-size: 12px; color: #856404; }

  /* Activities */
  .activities { flex: 1; overflow-y: auto; max-height: 200px; }
  .activity { padding: 6px; border-bottom: 1px solid #f0f0f0; font-size: 11px; }
  .activity:last-child { border-bottom: none; }
  .activity-type { display: inline-block; padding: 1px 4px; border-radius: 3px; font-size: 9px; font-weight: 500; margin-right: 6px; }
  .activity-type.navigation { background: #e3f2fd; color: #1976d2; }
  .activity-type.click { background: #f3e5f5; color: #7b1fa2; }
  .activity-type.type { background: #e8f5e9; color: #388e3c; }
  .activity-type.scroll { background: #fff3e0; color: #f57c00; }
  .activity-type.search { background: #fce4ec; color: #c2185b; }
  .activity-type.error { background: #ffebee; color: #d32f2f; }
  .activity-time { color: #999; font-size: 9px; float: right; }
  .activity-details { margin-top: 2px; color: #666; font-size: 10px; }

  .empty-state { text-align: center; padding: 16px; color: #888; font-size: 12px; }
`;

interface OpenRouterModel {
  id: string;
  name: string;
}

interface Persona {
  firstName: string;
  lastName: string;
  age: number;
  country: string;
  city: string;
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

  // Persona state
  const [persona, setPersona] = useState<Persona | null>(null);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [cityConfirmed, setCityConfirmed] = useState(false);
  const [cityCheckFading, setCityCheckFading] = useState(false);
  const [generatingPersona, setGeneratingPersona] = useState(false);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const response = await chrome.runtime.sendMessage({ type: 'GET_ACTIVITIES', payload: { limit: 20 } });
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
          setCountry(response.persona.country || '');
          setCity(response.persona.city || '');
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

  useEffect(() => {
    if (apiKey) {
      fetchModels();
    }
  }, [apiKey]);

  // City autocomplete
  const handleCityInput = async (value: string) => {
    setCity(value);
    setCityConfirmed(false);

    if (value.length >= 2 && country) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'AUTOCOMPLETE_CITY',
          payload: { country, query: value }
        });
        if (response?.cities && response.cities.length > 0) {
          setCitySuggestions(response.cities);
          setShowCitySuggestions(true);
        } else {
          setCitySuggestions([]);
          setShowCitySuggestions(false);
        }
      } catch (e) {
        setCitySuggestions([]);
      }
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  };

  const selectCity = (selectedCity: string) => {
    setCity(selectedCity);
    setShowCitySuggestions(false);
    setCityConfirmed(true);
    setCityCheckFading(false);
    setTimeout(() => setCityCheckFading(true), 100);
    setTimeout(() => setCityConfirmed(false), 2100);
  };

  const confirmCity = () => {
    if (city) {
      const formatted = city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
      setCity(formatted);
      setShowCitySuggestions(false);
      setCityConfirmed(true);
      setCityCheckFading(false);
      setTimeout(() => setCityCheckFading(true), 100);
      setTimeout(() => setCityConfirmed(false), 2100);
    }
  };

  // Generate persona
  const generatePersona = async () => {
    if (!country || !city || !apiKey) return;

    setGeneratingPersona(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_PERSONA',
        payload: { country, city }
      });

      if (response?.persona) {
        setPersona(response.persona);
        // Save to settings
        await chrome.runtime.sendMessage({
          type: 'SAVE_SETTINGS',
          payload: { persona: response.persona }
        });
      }
    } catch (e) {
      console.error('Failed to generate persona:', e);
    }
    setGeneratingPersona(false);
  };

  // Download persona
  const downloadPersona = () => {
    if (!persona) return;
    const filename = `Persona_${persona.firstName}_${persona.country}_${persona.city}.json`;
    const data = JSON.stringify(persona, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Upload persona
  const uploadPersona = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.firstName && data.country && data.city) {
          setPersona(data);
          setCountry(data.country);
          setCity(data.city);
          await chrome.runtime.sendMessage({
            type: 'SAVE_SETTINGS',
            payload: { persona: data }
          });
        }
      } catch (e) {
        console.error('Failed to parse persona file:', e);
      }
    };
    reader.readAsText(file);
  };

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
    const modelName = models.find(m => m.id === newModel)?.name || newModel;
    setModelConfirm(modelName);
    setTimeout(() => setModelConfirm(''), 3000);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canStart = hasApiKey && state.status === 'idle' && persona;
  const locationSet = country && city;

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
        </div>

        {!hasApiKey && (
          <div className="warning">
            Configure your OpenRouter API key below to start browsing.
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

        {/* Persona Box */}
        <div className="persona-box">
          <div className="persona-header">
            <div className="persona-title">Browsing Persona</div>
            {persona && (
              <div className="persona-icons">
                <button onClick={downloadPersona} title="Download persona">
                  <DownloadIcon />
                </button>
                <button onClick={() => fileInputRef.current?.click()} title="Upload persona">
                  <UploadIcon />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".json"
                  onChange={uploadPersona}
                />
              </div>
            )}
          </div>

          {!persona ? (
            <>
              {/* Placeholder bars */}
              <div className="placeholder-bar short" style={{ marginBottom: '8px' }}></div>
              <div className="placeholder-bar medium" style={{ marginBottom: '8px' }}></div>
              <div className="placeholder-bar long" style={{ marginBottom: '12px' }}></div>

              {/* Location selectors */}
              <div className="location-row">
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setCity(''); setCityConfirmed(false); }}
                >
                  <option value="">Select country...</option>
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="location-row">
                <div className="city-wrapper">
                  <input
                    ref={cityInputRef}
                    type="text"
                    placeholder="Enter city..."
                    value={city}
                    disabled={!country}
                    onChange={(e) => handleCityInput(e.target.value)}
                    onBlur={() => { setTimeout(() => setShowCitySuggestions(false), 200); confirmCity(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmCity(); }}
                  />
                  <span className={`city-check ${cityConfirmed ? 'visible' : ''} ${cityCheckFading ? 'fade-out' : ''}`}>
                    <CheckIcon />
                  </span>
                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <div className="city-suggestions">
                      {citySuggestions.map((s, i) => (
                        <div key={i} className="city-suggestion" onClick={() => selectCity(s)}>{s}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Generate button */}
              {locationSet && !generatingPersona && (
                <div className="generate-btn" onClick={generatePersona}>
                  <span>Generate browsing persona</span>
                  <SparklesIcon />
                </div>
              )}
              {generatingPersona && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>Generating persona...</div>
              )}
            </>
          ) : (
            <div className="persona-data">
              <div className="persona-name">{persona.firstName} {persona.lastName}, {persona.age}</div>
              <div className="persona-details">{persona.occupation}</div>
              <div className="persona-details">{persona.city}, {persona.country}</div>
              <div className="persona-interests">Interests: {persona.interests.join(', ')}</div>
            </div>
          )}
        </div>

        {/* Settings Box */}
        <div className="settings-box">
          <div className="form-group">
            <label>OpenRouter API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-or-..."
            />
            <div className="hint">Get your key from openrouter.ai</div>
          </div>

          <div className="form-group">
            <label>Model</label>
            {!apiKey ? (
              <select disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
                <option>Enter API key first...</option>
              </select>
            ) : loadingModels ? (
              <div style={{ padding: '8px', color: '#666', fontSize: '12px' }}>Loading models...</div>
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
                <option>No models loaded</option>
              </select>
            )}
            {modelConfirm && (
              <div className="model-confirm">
                <CheckIcon />
                <span>{modelConfirm} activated</span>
              </div>
            )}
          </div>

          <button className="btn btn-primary" onClick={handleSaveSettings} style={{ width: '100%' }}>
            Save Settings
          </button>
        </div>

        {/* Recent Activity */}
        <div className="section-title">Recent Activity</div>
        <div className="activities">
          {activities.length === 0 ? (
            <div className="empty-state">No activity yet</div>
          ) : (
            activities.map(activity => (
              <div className="activity" key={activity.id}>
                <span className={`activity-type ${activity.type}`}>{activity.type}</span>
                <span className="activity-time">{formatTime(activity.timestamp)}</span>
                <div className="activity-details">{activity.details.slice(0, 60)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Sidebar />);
}
