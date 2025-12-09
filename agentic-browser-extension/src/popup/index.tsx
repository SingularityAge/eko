// ============================================
// Popup UI Component
// Quick access to agents and settings
// ============================================

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { ExtensionSettings, AgentState, PersonaProfile, STORAGE_KEYS } from '../shared/types';

interface AppState {
  settings: ExtensionSettings | null;
  agents: {
    browsing: AgentState | null;
    search: AgentState | null;
    social: AgentState | null;
    email: AgentState | null;
  };
  persona: PersonaProfile | null;
  isInitialized: boolean;
}

function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      setState(response);
    } catch (error) {
      console.error('Failed to load state:', error);
    }
    setLoading(false);
  };

  const startAgent = async (agentType: string) => {
    await chrome.runtime.sendMessage({
      type: 'START_AGENT',
      payload: { agentType }
    });
    loadState();
  };

  const openSidebar = () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const quickBrowse = async () => {
    await chrome.runtime.sendMessage({
      type: 'EXECUTE_TASK',
      payload: { task: 'Browse the web naturally based on my interests' }
    });
  };

  if (loading) {
    return (
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <div style={{ color: '#888' }}>Loading...</div>
      </div>
    );
  }

  const isActive = state?.isInitialized && Object.values(state.agents || {}).some(a => a?.status === 'running');

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="logo">A</div>
        <div className="title">
          <h1>Agentic Browser</h1>
          <p>AI-powered authentic browsing</p>
        </div>
        <span className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? 'Active' : 'Idle'}
        </span>
      </div>

      {/* API Key Warning */}
      {!state?.settings?.openRouterApiKey && (
        <div style={{
          background: 'rgba(255, 152, 0, 0.2)',
          border: '1px solid #ff9800',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
          fontSize: '12px'
        }}>
          <strong>Setup Required</strong>
          <p style={{ marginTop: '4px', color: '#ffb74d' }}>
            Please configure your OpenRouter API key in settings to enable agents.
          </p>
          <button
            onClick={openOptions}
            style={{
              marginTop: '8px',
              padding: '6px 12px',
              background: '#ff9800',
              border: 'none',
              borderRadius: '4px',
              color: '#000',
              cursor: 'pointer',
              fontSize: '11px'
            }}
          >
            Open Settings
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <button className="action-btn" onClick={quickBrowse} disabled={!state?.isInitialized}>
          <span className="icon">🌐</span>
          <span>Auto Browse</span>
        </button>
        <button className="action-btn" onClick={() => startAgent('search')} disabled={!state?.isInitialized}>
          <span className="icon">🔍</span>
          <span>Search</span>
        </button>
        <button className="action-btn" onClick={() => startAgent('email')} disabled={!state?.isInitialized}>
          <span className="icon">📧</span>
          <span>Check Email</span>
        </button>
        <button className="action-btn" onClick={() => startAgent('social')} disabled={!state?.isInitialized}>
          <span className="icon">📱</span>
          <span>Social</span>
        </button>
      </div>

      {/* Persona */}
      {state?.persona && (
        <div className="section">
          <div className="section-title">Current Persona</div>
          <div className="persona-card">
            <div className="persona-header">
              <div className="persona-avatar">
                {state.persona.name.charAt(0)}
              </div>
              <div className="persona-info">
                <h3>{state.persona.name}</h3>
                <p>{state.persona.age}yo • {state.persona.location.city}, {state.persona.location.state}</p>
              </div>
            </div>
            <div className="persona-stats">
              <span>📚 {state.persona.occupation}</span>
              <span>🎯 {state.persona.interests.slice(0, 2).join(', ')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Agents */}
      <div className="section">
        <div className="section-title">Agents</div>
        <div className="agent-list">
          {[
            { type: 'browsing', icon: '🌐', name: 'Browsing Agent' },
            { type: 'search', icon: '🔍', name: 'Search Agent' },
            { type: 'social', icon: '📱', name: 'Social Agent' },
            { type: 'email', icon: '📧', name: 'Email Agent' }
          ].map(agent => {
            const agentState = state?.agents?.[agent.type as keyof typeof state.agents];
            return (
              <div className="agent-item" key={agent.type}>
                <div className={`agent-icon ${agent.type}`}>{agent.icon}</div>
                <div className="agent-info">
                  <h4>{agent.name}</h4>
                  <p>{agentState?.currentTask || agentState?.status || 'Idle'}</p>
                </div>
                <div className={`agent-status ${agentState?.status === 'running' ? 'running' : ''}`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <button className="footer-btn" onClick={openOptions}>
          ⚙️ Settings
        </button>
        <button className="footer-btn primary" onClick={openSidebar}>
          📊 Open Panel
        </button>
      </div>
    </div>
  );
}

// Mount app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
