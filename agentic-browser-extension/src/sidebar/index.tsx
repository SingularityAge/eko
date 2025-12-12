// ============================================
// Sidebar UI - Control Panel
// ============================================

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserState, Activity } from '../shared/types';

const styles = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #fff;
    color: #1a1a1a;
  }

  .container {
    padding: 16px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .header {
    text-align: center;
    padding-bottom: 16px;
    border-bottom: 1px solid #eee;
    margin-bottom: 16px;
  }

  .header h1 {
    font-size: 20px;
    font-weight: 600;
    color: #DA7756;
  }

  .header .status {
    font-size: 12px;
    color: #666;
    margin-top: 4px;
  }

  .status.ready { color: #4CAF50; }
  .status.running { color: #2196F3; }
  .status.paused { color: #FF9800; }
  .status.error { color: #f44336; }

  .controls {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-bottom: 16px;
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

  .btn-primary:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #f5f5f5;
    color: #333;
    border: 1px solid #ddd;
  }

  .btn-secondary:hover {
    background: #eee;
  }

  .btn-danger {
    background: #f44336;
    color: white;
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  }

  .stat {
    background: #f9f9f9;
    padding: 12px;
    border-radius: 8px;
    text-align: center;
  }

  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: #DA7756;
  }

  .stat-label {
    font-size: 11px;
    color: #888;
    text-transform: uppercase;
  }

  .current-action {
    background: #f0f7ff;
    border: 1px solid #cce5ff;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
  }

  .current-action-label {
    font-size: 11px;
    color: #666;
    text-transform: uppercase;
    margin-bottom: 4px;
  }

  .current-action-text {
    font-size: 13px;
    color: #333;
    word-break: break-word;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .activities {
    flex: 1;
    overflow-y: auto;
  }

  .activity {
    padding: 8px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 12px;
  }

  .activity:last-child {
    border-bottom: none;
  }

  .activity-type {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    margin-right: 8px;
  }

  .activity-type.navigation { background: #e3f2fd; color: #1976d2; }
  .activity-type.click { background: #f3e5f5; color: #7b1fa2; }
  .activity-type.type { background: #e8f5e9; color: #388e3c; }
  .activity-type.scroll { background: #fff3e0; color: #f57c00; }
  .activity-type.search { background: #fce4ec; color: #c2185b; }
  .activity-type.error { background: #ffebee; color: #d32f2f; }

  .activity-time {
    color: #999;
    font-size: 10px;
    float: right;
  }

  .warning {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
    font-size: 13px;
    color: #856404;
  }

  .settings-link {
    text-align: center;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #eee;
  }

  .settings-link a {
    color: #DA7756;
    text-decoration: none;
    font-size: 13px;
  }

  .settings-link a:hover {
    text-decoration: underline;
  }
`;

function Sidebar() {
  const [state, setState] = useState<BrowserState>({
    status: 'idle',
    currentUrl: '',
    currentAction: 'Ready',
    totalActions: 0,
    errors: 0
  });
  const [hasApiKey, setHasApiKey] = useState(false);
  const [hasPersona, setHasPersona] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Load state
  const loadState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
      if (response) {
        setState(response.state);
        setHasApiKey(response.hasApiKey);
        setHasPersona(response.hasPersona);
      }
    } catch (e) {
      console.error('Failed to load state:', e);
    }
  };

  // Load activities
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

  useEffect(() => {
    loadState();
    loadActivities();

    // Listen for updates
    const listener = (message: any) => {
      if (message.type === 'STATE_UPDATE') {
        setState(message.payload);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    // Poll for updates
    const interval = setInterval(() => {
      loadState();
      loadActivities();
    }, 2000);

    return () => {
      chrome.runtime.onMessage.removeListener(listener);
      clearInterval(interval);
    };
  }, []);

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

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const canStart = hasApiKey && state.status === 'idle';

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        <div className="header">
          <h1>AutoBrowser</h1>
          <div className={`status ${state.status}`}>
            {state.status === 'idle' && 'Ready to browse'}
            {state.status === 'running' && 'Browsing autonomously'}
            {state.status === 'paused' && 'Paused'}
          </div>
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
              <button className="btn btn-secondary" onClick={handlePause}>
                Pause
              </button>
              <button className="btn btn-danger" onClick={handleStop}>
                Stop
              </button>
            </>
          )}
          {state.status === 'paused' && (
            <>
              <button className="btn btn-primary" onClick={handleResume}>
                Resume
              </button>
              <button className="btn btn-danger" onClick={handleStop}>
                Stop
              </button>
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
          <div className="current-action" style={{ background: '#f5f5f5', border: '1px solid #ddd' }}>
            <div className="current-action-label">Current URL</div>
            <div className="current-action-text">{state.currentUrl}</div>
          </div>
        )}

        <div className="section-title">Recent Activity</div>
        <div className="activities">
          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
              No activity yet. Press Start to begin browsing!
            </div>
          ) : (
            activities.map(activity => (
              <div className="activity" key={activity.id}>
                <span className={`activity-type ${activity.type}`}>{activity.type}</span>
                <span className="activity-time">{formatTime(activity.timestamp)}</span>
                <div style={{ marginTop: '4px', color: '#666' }}>
                  {activity.details.slice(0, 100)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="settings-link">
          <a href="#" onClick={(e) => { e.preventDefault(); openSettings(); }}>
            Open Settings
          </a>
        </div>
      </div>
    </>
  );
}

// Mount
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Sidebar />);
}
