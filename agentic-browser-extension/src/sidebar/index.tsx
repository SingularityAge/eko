// ============================================
// Sidebar UI Component
// Main control panel for agent monitoring
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ExtensionSettings,
  AgentState,
  PersonaProfile,
  Activity,
  AgentType
} from '../shared/types';

interface AppState {
  settings: ExtensionSettings | null;
  agents: Record<AgentType, AgentState | null>;
  persona: PersonaProfile | null;
  isInitialized: boolean;
}

// Styles - Light Mode with Anthropic Claude styling
const styles = `
  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #FFFFFF;
  }

  .header {
    padding: 16px;
    background: #FAFAFA;
    border-bottom: 1px solid #E5E5E5;
  }

  .header h1 {
    font-size: 18px;
    margin-bottom: 4px;
    color: #1a1a1a;
  }

  .header p {
    font-size: 12px;
    color: #666;
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

  .task-input {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .task-input input {
    flex: 1;
    padding: 12px;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    background: #FFFFFF;
    color: #1a1a1a;
    font-size: 14px;
  }

  .task-input input:focus {
    outline: none;
    border-color: #DA7756;
  }

  .task-input input::placeholder {
    color: #999;
  }

  .task-input button {
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    background: #DA7756;
    color: white;
    cursor: pointer;
    font-weight: 500;
  }

  .task-input button:hover {
    background: #C96A4A;
  }

  .task-input button:disabled {
    background: #E5E5E5;
    color: #999;
    cursor: not-allowed;
  }

  .agent-card {
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
  }

  .agent-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .agent-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
  }

  .agent-icon.browsing { background: rgba(33, 150, 243, 0.15); }
  .agent-icon.search { background: rgba(255, 152, 0, 0.15); }
  .agent-icon.social { background: rgba(233, 30, 99, 0.15); }
  .agent-icon.email { background: rgba(156, 39, 176, 0.15); }

  .agent-info {
    flex: 1;
  }

  .agent-info h3 {
    font-size: 14px;
    margin-bottom: 2px;
    color: #1a1a1a;
  }

  .agent-status {
    font-size: 11px;
    color: #888;
  }

  .agent-status.running {
    color: #DA7756;
  }

  .agent-status.error {
    color: #E53935;
  }

  .agent-controls {
    display: flex;
    gap: 8px;
  }

  .agent-btn {
    padding: 6px 12px;
    border: 1px solid #E5E5E5;
    border-radius: 4px;
    background: #FFFFFF;
    color: #1a1a1a;
    cursor: pointer;
    font-size: 12px;
  }

  .agent-btn:hover {
    background: #F5F5F5;
    border-color: #DA7756;
  }

  .agent-btn.stop {
    background: #E53935;
    border-color: #E53935;
    color: white;
  }

  .agent-btn.stop:hover {
    background: #C62828;
  }

  .agent-task {
    font-size: 12px;
    color: #666;
    margin-top: 8px;
    padding: 8px;
    background: #F5F5F5;
    border-radius: 4px;
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

  .activity-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px;
    background: #FAFAFA;
    border: 1px solid #E5E5E5;
    border-radius: 6px;
    margin-bottom: 8px;
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
    margin-bottom: 2px;
    color: #1a1a1a;
  }

  .activity-info p {
    font-size: 11px;
    color: #888;
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
    margin-bottom: 4px;
    color: #1a1a1a;
  }

  .persona-details p {
    font-size: 12px;
    color: #666;
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

  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .quick-btn {
    padding: 16px;
    border: 1px solid #E5E5E5;
    border-radius: 8px;
    background: #FAFAFA;
    color: #1a1a1a;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
  }

  .quick-btn:hover {
    background: #F0F0F0;
    border-color: #DA7756;
    transform: translateY(-1px);
  }

  .quick-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .quick-btn .icon {
    font-size: 24px;
    display: block;
    margin-bottom: 8px;
  }

  .quick-btn span {
    font-size: 12px;
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
`;

function Sidebar() {
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<'agents' | 'activity' | 'persona'>('agents');
  const [taskInput, setTaskInput] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadState();
    loadActivities();

    // Listen for updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'AGENT_UPDATE') {
        handleAgentUpdate(message.payload);
      }
      if (message.type === 'ACTIVITY_LOG') {
        setActivities(prev => [message.payload, ...prev].slice(0, 100));
      }
    });

    // Poll for state updates
    const interval = setInterval(loadState, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      setState(response);
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
    // Add to logs
    setLogs(prev => [...prev, { ...update, timestamp: Date.now() }].slice(-100));

    // Auto-scroll
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }

    // Refresh state on completion
    if (update.type === 'complete' || update.type === 'error') {
      loadState();
    }
  };

  const executeTask = async () => {
    if (!taskInput.trim()) return;

    try {
      await chrome.runtime.sendMessage({
        type: 'EXECUTE_TASK',
        payload: { task: taskInput }
      });
      setTaskInput('');
    } catch (error) {
      console.error('Failed to execute task:', error);
    }
  };

  const startAgent = async (agentType: AgentType, task?: string) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'START_AGENT',
        payload: { agentType, task }
      });
      loadState();
    } catch (error) {
      console.error('Failed to start agent:', error);
    }
  };

  const stopAgent = async (agentType: AgentType) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'STOP_AGENT',
        payload: { agentType }
      });
      loadState();
    } catch (error) {
      console.error('Failed to stop agent:', error);
    }
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
      social_browse: '📱',
      social_react: '❤️',
      video_watch: '📺',
      article_read: '📰',
      shopping: '🛒',
      break: '☕',
      idle: '😴'
    };
    return icons[type] || '📌';
  };

  return (
    <>
      <style>{styles}</style>
      <div className="sidebar">
        {/* Header */}
        <div className="header">
          <h1>Agentic Browser</h1>
          <p>
            {state?.isInitialized ? (
              <span style={{ color: '#DA7756' }}>● Connected</span>
            ) : (
              <span style={{ color: '#E53935' }}>● Not configured</span>
            )}
          </p>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            🤖 Agents
          </button>
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
          {activeTab === 'agents' && (
            <>
              {/* Task Input */}
              <div className="task-input">
                <input
                  type="text"
                  placeholder="Enter a task (e.g., 'Search for latest tech news')"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && executeTask()}
                  disabled={!state?.isInitialized}
                />
                <button
                  onClick={executeTask}
                  disabled={!state?.isInitialized || !taskInput.trim()}
                >
                  Run
                </button>
              </div>

              {/* Quick Actions */}
              <div className="section">
                <div className="section-title">Quick Actions</div>
                <div className="quick-actions">
                  <button
                    className="quick-btn"
                    onClick={() => startAgent('browsing', 'Browse naturally based on my interests')}
                    disabled={!state?.isInitialized}
                  >
                    <span className="icon">🌐</span>
                    <span>Auto Browse</span>
                  </button>
                  <button
                    className="quick-btn"
                    onClick={() => startAgent('email', 'Check inbox for new emails')}
                    disabled={!state?.isInitialized}
                  >
                    <span className="icon">📧</span>
                    <span>Check Email</span>
                  </button>
                  <button
                    className="quick-btn"
                    onClick={() => startAgent('social', 'Browse Instagram feed')}
                    disabled={!state?.isInitialized}
                  >
                    <span className="icon">📱</span>
                    <span>Social Media</span>
                  </button>
                  <button
                    className="quick-btn"
                    onClick={() => setTaskInput('Research ')}
                    disabled={!state?.isInitialized}
                  >
                    <span className="icon">🔍</span>
                    <span>Research</span>
                  </button>
                </div>
              </div>

              {/* Agents */}
              <div className="section">
                <div className="section-title">Agents</div>
                {(['browsing', 'search', 'social', 'email'] as AgentType[]).map(agentType => {
                  const agent = state?.agents?.[agentType];
                  const icons: Record<AgentType, string> = {
                    browsing: '🌐',
                    search: '🔍',
                    social: '📱',
                    email: '📧',
                    persona: '👤'
                  };
                  const names: Record<AgentType, string> = {
                    browsing: 'Browsing Agent',
                    search: 'Search Agent',
                    social: 'Social Agent',
                    email: 'Email Agent',
                    persona: 'Persona Agent'
                  };

                  return (
                    <div className="agent-card" key={agentType}>
                      <div className="agent-header">
                        <div className={`agent-icon ${agentType}`}>{icons[agentType]}</div>
                        <div className="agent-info">
                          <h3>{names[agentType]}</h3>
                          <div className={`agent-status ${agent?.status || 'idle'}`}>
                            {agent?.status || 'Idle'}
                          </div>
                        </div>
                        <div className="agent-controls">
                          {agent?.status === 'running' ? (
                            <button
                              className="agent-btn stop"
                              onClick={() => stopAgent(agentType)}
                            >
                              Stop
                            </button>
                          ) : (
                            <button
                              className="agent-btn"
                              onClick={() => startAgent(agentType)}
                              disabled={!state?.isInitialized}
                            >
                              Start
                            </button>
                          )}
                        </div>
                      </div>
                      {agent?.currentTask && (
                        <div className="agent-task">
                          {agent.currentTask}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Execution Log */}
              {logs.length > 0 && (
                <div className="section">
                  <div className="section-title">Execution Log</div>
                  <div className="log-container" ref={logContainerRef}>
                    {logs.slice(-20).map((log, i) => (
                      <div className="log-entry" key={i}>
                        <span className="log-time">{formatTime(log.timestamp)}</span>
                        <span className={`log-type ${log.type}`}>{log.type}</span>
                        <span>
                          {log.type === 'tool_call' && `${log.data?.name}()`}
                          {log.type === 'tool_result' && log.data?.result?.slice(0, 50)}
                          {log.type === 'message' && log.data?.content?.slice(0, 50)}
                          {log.type === 'error' && log.data?.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'activity' && (
            <div className="section">
              <div className="section-title">Recent Activity</div>
              {activities.length === 0 ? (
                <div className="empty-state">
                  <div className="icon">📭</div>
                  <p>No activity yet</p>
                </div>
              ) : (
                activities.map(activity => (
                  <div className="activity-item" key={activity.id}>
                    <div className="activity-icon">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="activity-info">
                      <h4>{activity.type.replace('_', ' ')}</h4>
                      <p>{activity.url || activity.details?.query || '-'}</p>
                    </div>
                    <div className="activity-time">
                      {formatTime(activity.timestamp)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'persona' && (
            <>
              {state?.persona ? (
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
                      <span>Typing Speed</span><br />
                      {state.persona.personality.typingSpeed} WPM
                    </div>
                    <div className="persona-stat">
                      <span>Schedule</span><br />
                      {state.persona.schedule.wakeTime} - {state.persona.schedule.sleepTime}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div className="section-title">Interests</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {state.persona.interests.map(interest => (
                        <span
                          key={interest}
                          style={{
                            padding: '4px 8px',
                            background: '#F0F0F0',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: '#1a1a1a'
                          }}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <div className="section-title">Social Media</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {state.persona.socialMedia.platforms.map(p => (
                        <span
                          key={p.name}
                          style={{
                            padding: '4px 8px',
                            background: p.usage === 'primary' ? 'rgba(218, 119, 86, 0.15)' : '#F0F0F0',
                            borderRadius: '12px',
                            fontSize: '11px',
                            color: p.usage === 'primary' ? '#DA7756' : '#1a1a1a'
                          }}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    style={{
                      width: '100%',
                      marginTop: '16px',
                      padding: '10px',
                      border: '1px solid #E5E5E5',
                      borderRadius: '6px',
                      background: '#FAFAFA',
                      color: '#1a1a1a',
                      cursor: 'pointer'
                    }}
                    onClick={() => chrome.runtime.openOptionsPage()}
                  >
                    Edit Persona
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="icon">👤</div>
                  <p>No persona configured</p>
                  <button
                    style={{
                      marginTop: '12px',
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#DA7756',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                    onClick={() => chrome.runtime.openOptionsPage()}
                  >
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
