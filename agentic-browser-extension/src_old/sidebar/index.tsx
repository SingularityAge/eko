// ============================================
// Sidebar UI Component
// Unified autonomous browsing control panel
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ExtensionSettings,
  PersonaProfile,
  Activity
} from '../shared/types';

interface AppState {
  settings: ExtensionSettings | null;
  persona: PersonaProfile | null;
  isInitialized: boolean;
  autonomousStatus: 'idle' | 'running' | 'paused';
  currentAction: string;
}

// Styles - Light Mode with Anthropic Claude styling
const styles = `
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #FFFFFF;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    padding: 16px;
    background: #FAFAFA;
    border-bottom: 1px solid #E5E5E5;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .header-left h1 {
    font-size: 18px;
    margin: 0 0 4px 0;
    color: #1a1a1a;
  }

  .header-left p {
    font-size: 12px;
    color: #666;
    margin: 0;
  }

  .settings-btn {
    width: 36px;
    height: 36px;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    background: #FFFFFF;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .settings-btn:hover {
    background: #F0F0F0;
    border-color: #DA7756;
  }

  .main-controls {
    padding: 20px;
    background: #FAFAFA;
    border-bottom: 1px solid #E5E5E5;
    text-align: center;
  }

  .play-btn {
    width: 80px;
    height: 80px;
    border: none;
    border-radius: 50%;
    background: #DA7756;
    color: white;
    cursor: pointer;
    font-size: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(218, 119, 86, 0.3);
  }

  .play-btn:hover {
    background: #C96A4A;
    transform: scale(1.05);
  }

  .play-btn:disabled {
    background: #CCC;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .play-btn.running {
    background: #4CAF50;
  }

  .play-btn.paused {
    background: #FF9800;
  }

  .control-buttons {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
  }

  .control-btn {
    padding: 8px 20px;
    border: 1px solid #E5E5E5;
    border-radius: 6px;
    background: #FFFFFF;
    color: #1a1a1a;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .control-btn:hover {
    background: #F0F0F0;
    border-color: #DA7756;
  }

  .control-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-btn.reset {
    color: #E53935;
    border-color: #E53935;
  }

  .control-btn.reset:hover {
    background: rgba(229, 57, 53, 0.1);
  }

  .status-display {
    margin-top: 16px;
    padding: 12px;
    background: #FFFFFF;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    font-size: 13px;
    color: #666;
  }

  .status-display .label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .status-display .action {
    color: #1a1a1a;
    font-weight: 500;
  }

  .tabs {
    display: flex;
    background: #FAFAFA;
    border-bottom: 1px solid #E5E5E5;
  }

  .tab {
    flex: 1;
    padding: 12px;
    border: none;
    background: transparent;
    color: #666;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  }

  .tab:hover {
    color: #1a1a1a;
    background: #F0F0F0;
  }

  .tab.active {
    color: #DA7756;
    border-bottom: 2px solid #DA7756;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: #FFFFFF;
  }

  .section {
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .log-container {
    background: #F5F5F5;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    max-height: 300px;
    overflow-y: auto;
  }

  .log-entry {
    padding: 8px 12px;
    border-bottom: 1px solid #E5E5E5;
    font-size: 12px;
    color: #1a1a1a;
  }

  .log-entry:last-child {
    border-bottom: none;
  }

  .log-time {
    color: #888;
    margin-right: 8px;
  }

  .log-type {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    margin-right: 8px;
  }

  .log-type.tool_call { background: rgba(33, 150, 243, 0.15); color: #1976D2; }
  .log-type.tool_result { background: rgba(218, 119, 86, 0.15); color: #DA7756; }
  .log-type.message { background: rgba(255, 193, 7, 0.15); color: #F57C00; }
  .log-type.error { background: rgba(229, 57, 53, 0.15); color: #E53935; }
  .log-type.navigation { background: rgba(76, 175, 80, 0.15); color: #388E3C; }
  .log-type.email { background: rgba(156, 39, 176, 0.15); color: #7B1FA2; }
  .log-type.social { background: rgba(233, 30, 99, 0.15); color: #C2185B; }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    border-radius: 6px;
    margin-bottom: 8px;
    transition: all 0.15s;
  }

  .activity-item.clickable:hover {
    background: #F0F0F0;
    border-color: #DA7756;
    cursor: pointer;
  }

  .activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F0F0F0;
    font-size: 14px;
  }

  .activity-info {
    flex: 1;
  }

  .activity-info h4 {
    font-size: 13px;
    margin: 0 0 2px 0;
    color: #1a1a1a;
  }

  .activity-info p {
    font-size: 11px;
    color: #888;
    margin: 0;
  }

  .activity-time {
    font-size: 10px;
    color: #888;
  }

  .persona-card {
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    padding: 16px;
  }

  .persona-header {
    display: flex;
    gap: 12px;
    margin-bottom: 12px;
  }

  .persona-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #DA7756;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
    color: white;
  }

  .persona-details h3 {
    font-size: 16px;
    margin: 0 0 4px 0;
    color: #1a1a1a;
  }

  .persona-details p {
    font-size: 12px;
    color: #666;
    margin: 0;
  }

  .persona-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }

  .persona-stat {
    background: #F5F5F5;
    padding: 8px;
    border-radius: 6px;
    font-size: 11px;
    color: #1a1a1a;
  }

  .persona-stat span {
    color: #888;
  }

  .interest-tag {
    display: inline-block;
    padding: 4px 8px;
    background: #F0F0F0;
    border-radius: 12px;
    font-size: 11px;
    color: #1a1a1a;
    margin: 2px;
  }

  .interest-tag.primary {
    background: rgba(218, 119, 86, 0.15);
    color: #DA7756;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #888;
  }

  .empty-state .icon {
    font-size: 48px;
    margin-bottom: 12px;
  }

  .setup-btn {
    margin-top: 12px;
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    background: #DA7756;
    color: #fff;
    cursor: pointer;
    font-size: 13px;
  }

  .setup-btn:hover {
    background: #C96A4A;
  }

  .warning-box {
    background: rgba(255, 152, 0, 0.1);
    border: 1px solid #FF9800;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    font-size: 12px;
    color: #E65100;
  }
`;

function Sidebar() {
  const [state, setState] = useState<AppState>({
    settings: null,
    persona: null,
    isInitialized: false,
    autonomousStatus: 'idle',
    currentAction: ''
  });
  const [activeTab, setActiveTab] = useState<'activity' | 'persona'>('activity');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadState();
    loadActivities();

    // Listen for updates
    const messageListener = (message: any) => {
      if (message.type === 'AGENT_UPDATE') {
        handleAgentUpdate(message.payload);
      }
      if (message.type === 'ACTIVITY_LOG') {
        setActivities(prev => [message.payload, ...prev].slice(0, 100));
      }
      if (message.type === 'AUTONOMOUS_STATUS') {
        setState(prev => ({
          ...prev,
          autonomousStatus: message.payload.status,
          currentAction: message.payload.action || ''
        }));
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Poll for state updates
    const interval = setInterval(loadState, 3000);
    return () => {
      clearInterval(interval);
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const loadState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      setState(prev => ({
        ...prev,
        settings: response.settings,
        persona: response.persona,
        isInitialized: response.isInitialized,
        autonomousStatus: response.autonomousStatus || prev.autonomousStatus,
        currentAction: response.currentAction || prev.currentAction
      }));
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_ACTIVITIES',
        payload: { limit: 50 }
      });
      setActivities(response || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
    }
  };

  const handleAgentUpdate = (update: any) => {
    setLogs(prev => [...prev, { ...update, timestamp: Date.now() }].slice(-100));

    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }

    if (update.type === 'complete' || update.type === 'error') {
      loadState();
    }
  };

  const handlePlay = async () => {
    try {
      if (state.autonomousStatus === 'idle') {
        await chrome.runtime.sendMessage({ type: 'AUTONOMOUS_START' });
      } else if (state.autonomousStatus === 'paused') {
        await chrome.runtime.sendMessage({ type: 'AUTONOMOUS_RESUME' });
      }
      setState(prev => ({ ...prev, autonomousStatus: 'running' }));
    } catch (error) {
      console.error('Failed to start:', error);
    }
  };

  const handlePause = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'AUTONOMOUS_PAUSE' });
      setState(prev => ({ ...prev, autonomousStatus: 'paused' }));
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const handleReset = async () => {
    try {
      await chrome.runtime.sendMessage({ type: 'AUTONOMOUS_RESET' });
      setState(prev => ({ ...prev, autonomousStatus: 'idle', currentAction: '' }));
      setLogs([]);
    } catch (error) {
      console.error('Failed to reset:', error);
    }
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      page_visit: '🌐',
      search: '🔍',
      click: '👆',
      scroll: '📜',
      type: '⌨️',
      email_check: '📧',
      email_read: '📖',
      email_verify: '✅',
      social_browse: '📱',
      social_react: '❤️',
      video_watch: '📺',
      article_read: '📰',
      shopping: '🛒',
      break: '☕',
      idle: '😴',
      discovering: '🔎'
    };
    return icons[type] || '📌';
  };

  const getPlayIcon = () => {
    switch (state.autonomousStatus) {
      case 'running': return '⏸️';
      case 'paused': return '▶️';
      default: return '▶️';
    }
  };

  const getStatusText = () => {
    switch (state.autonomousStatus) {
      case 'running': return state.currentAction || 'Browsing autonomously...';
      case 'paused': return 'Paused';
      default: return 'Ready to start';
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="sidebar">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <h1>Agentic Browser</h1>
            <p>
              {state.isInitialized ? (
                <span style={{ color: '#4CAF50' }}>● Ready</span>
              ) : (
                <span style={{ color: '#E53935' }}>● Setup required</span>
              )}
            </p>
          </div>
          <button className="settings-btn" onClick={openSettings} title="Settings">
            ⚙️
          </button>
        </div>

        {/* Main Controls */}
        <div className="main-controls">
          {!state.isInitialized && (
            <div className="warning-box">
              Please configure your API key and persona in Settings to start.
            </div>
          )}

          <button
            className={`play-btn ${state.autonomousStatus}`}
            onClick={state.autonomousStatus === 'running' ? handlePause : handlePlay}
            disabled={!state.isInitialized}
            title={state.autonomousStatus === 'running' ? 'Pause' : 'Start'}
          >
            {getPlayIcon()}
          </button>

          <div className="control-buttons">
            <button
              className="control-btn reset"
              onClick={handleReset}
              disabled={state.autonomousStatus === 'idle'}
            >
              Reset
            </button>
          </div>

          <div className="status-display">
            <div className="label">Current Status</div>
            <div className="action">{getStatusText()}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            📊 Activity
          </button>
          <button
            className={`tab ${activeTab === 'persona' ? 'active' : ''}`}
            onClick={() => setActiveTab('persona')}
          >
            👤 Persona
          </button>
        </div>

        {/* Content */}
        <div className="content">
          {activeTab === 'activity' && (
            <>
              {/* Execution Log */}
              {logs.length > 0 && (
                <div className="section">
                  <div className="section-title">Execution Log</div>
                  <div className="log-container" ref={logContainerRef}>
                    {logs.slice(-30).map((log, i) => (
                      <div className="log-entry" key={i}>
                        <span className="log-time">{formatTime(log.timestamp)}</span>
                        <span className={`log-type ${log.type}`}>{log.type}</span>
                        <span>
                          {log.type === 'tool_call' && `${log.data?.name}()`}
                          {log.type === 'tool_result' && (log.data?.result?.slice(0, 60) || '')}
                          {log.type === 'message' && (log.data?.content?.slice(0, 60) || '')}
                          {log.type === 'error' && log.data?.error}
                          {log.type === 'navigation' && log.data?.url}
                          {log.type === 'email' && log.data?.action}
                          {log.type === 'social' && log.data?.action}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="section">
                <div className="section-title">Recent Activity</div>
                {activities.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">📭</div>
                    <p>No activity yet. Press play to start!</p>
                  </div>
                ) : (
                  activities.slice(0, 20).map(activity => (
                    <div
                      className={`activity-item ${activity.url ? 'clickable' : ''}`}
                      key={activity.id}
                      onClick={() => {
                        if (activity.url) {
                          chrome.tabs.create({ url: activity.url });
                        }
                      }}
                    >
                      <div className="activity-icon">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="activity-info">
                        <h4>{activity.type.replace(/_/g, ' ')}</h4>
                        <p title={activity.url || activity.details?.query || ''}>
                          {activity.url
                            ? new URL(activity.url).hostname.replace('www.', '')
                            : activity.details?.query || '-'}
                        </p>
                      </div>
                      <div className="activity-time">
                        {formatTime(activity.timestamp)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === 'persona' && (
            <>
              {state.persona ? (
                <div className="persona-card">
                  <div className="persona-header">
                    <div className="persona-avatar">
                      {state.persona.name.charAt(0)}
                    </div>
                    <div className="persona-details">
                      <h3>{state.persona.name}</h3>
                      <p>
                        {state.persona.age}yo {state.persona.gender} •{' '}
                        {state.persona.location.city}, {state.persona.location.state}
                      </p>
                    </div>
                  </div>

                  <div className="persona-stats">
                    <div className="persona-stat">
                      <span>Occupation</span><br />
                      {state.persona.occupation}
                    </div>
                    <div className="persona-stat">
                      <span>Education</span><br />
                      {state.persona.education}
                    </div>
                    <div className="persona-stat">
                      <span>Schedule</span><br />
                      {state.persona.schedule.wakeTime} - {state.persona.schedule.sleepTime}
                    </div>
                    <div className="persona-stat">
                      <span>Typing</span><br />
                      {state.persona.personality.typingSpeed} WPM
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div className="section-title">Interests</div>
                    <div>
                      {state.persona.interests.map((interest, i) => (
                        <span key={interest} className={`interest-tag ${i < 3 ? 'primary' : ''}`}>
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div className="section-title">Social Media</div>
                    <div>
                      {state.persona.socialMedia.platforms.map(p => (
                        <span
                          key={p.name}
                          className={`interest-tag ${p.usage === 'primary' ? 'primary' : ''}`}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="icon">👤</div>
                  <p>No persona configured</p>
                  <button className="setup-btn" onClick={openSettings}>
                    Configure Persona
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// Mount app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Sidebar />);
}
