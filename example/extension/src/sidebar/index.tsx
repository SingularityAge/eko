import { createRoot } from "react-dom/client";
import React, { useEffect, useRef, useState } from "react";
import { config } from "@eko-ai/eko";

import "./index.css";

interface LogMessage {
  time: string;
  log: string;
  level?: "info" | "error" | "success";
}

const LogoGlyph = () => (
  <svg
    className="sidebar-logo-glyph"
    viewBox="0 0 32 32"
    role="presentation"
    aria-hidden="true"
  >
    <path d="M15.6 2.5c-7 0-12.8 5.8-12.8 12.8s5.8 12.8 12.8 12.8c3 0 5.8-1.1 8-2.9.6-.4.7-1.2.3-1.8-.4-.6-1.2-.7-1.8-.3-1.8 1.4-4 2.3-6.5 2.3-5.8 0-10.6-4.8-10.6-10.6S9.8 4.7 15.6 4.7c3.9 0 7.3 2.1 9.1 5.3h-3.4c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3h6c.7 0 1.3-.6 1.3-1.3V6c0-.7-.6-1.3-1.3-1.3s-1.3.6-1.3 1.3v1.5C24.2 4.5 20.2 2.5 15.6 2.5z" />
    <path d="M12.4 11.4c-.7 0-1.3.6-1.3 1.3 0 1.9 1.6 3.5 3.5 3.5h3.4c1.7 0 3.1 1.4 3.1 3.1s-1.4 3.1-3.1 3.1h-6.2c-.7 0-1.3.6-1.3 1.3s.6 1.3 1.3 1.3h6.2c3.1 0 5.7-2.5 5.7-5.7s-2.5-5.7-5.7-5.7h-3.4c-.4 0-.8-.3-.8-.8 0-.7-.6-1.3-1.4-1.3z" />
  </svg>
);

const SparkleIcon = () => (
  <svg
    className="sidebar-icon"
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
  >
    <path d="M12 3.2l1.2 3.7c.2.6.7 1.1 1.4 1.3l3.8 1.1-3.8 1.1c-.6.2-1.2.7-1.4 1.3L12 15.4l-1.2-3.7c-.2-.6-.7-1.1-1.4-1.3L5.6 9.3l3.8-1.1c.6-.2 1.1-.7 1.4-1.3L12 3.2z" />
    <path d="M6.3 17.4l.7 2.1c.1.3.4.6.7.7l2.2.6-2.2.7c-.3.1-.6.4-.7.7l-.7 2.1-.7-2.1c-.1-.3-.4-.6-.7-.7l-2.2-.7 2.2-.6c.3-.1.6-.4.7-.7l.7-2.1zM19.6 14l.6 1.7c.1.3.4.5.7.6l1.8.5-1.8.5c-.3.1-.5.3-.6.6l-.6 1.7-.6-1.7c-.1-.3-.3-.5-.6-.6l-1.8-.5 1.8-.5c.3-.1.5-.3.6-.6l.5-1.7z" />
  </svg>
);

const CompassIcon = () => (
  <svg
    className="sidebar-icon"
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
  >
    <path d="M12 2.5a9.5 9.5 0 100 19 9.5 9.5 0 000-19zm0 2c4.1 0 7.5 3.4 7.5 7.5S16.1 19.5 12 19.5 4.5 16.1 4.5 12 7.9 4.5 12 4.5z" />
    <path d="M15.8 8.2l-4.8 1.9-1.9 4.8 4.8-1.9 1.9-4.8z" />
  </svg>
);

const LogbookIcon = () => (
  <svg
    className="sidebar-icon"
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
  >
    <path
      d="M6.2 4h9.8c.9 0 1.6.7 1.6 1.6v13c0 .9-.7 1.6-1.6 1.6H6.2c-.6 0-1-.4-1-1V5c0-.6.4-1 1-1z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.6 5.2h.6c.5 0 .8.4.8.8v11c0 .4-.3.8-.8.8h-.6M9 7.7h5M9 10.5h4M9 13.3h3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LaunchIcon = () => (
  <svg
    className="sidebar-run-icon"
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
  >
    <path
      d="M11.3 12.7l3.7-3.7c1.8-1.8 2.9-3.9 3.4-6 .1-.6-.4-1.1-1-.9-2.1.5-4.1 1.6-5.9 3.4L7.8 9.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 13.7c-1 .6-1.3 1.9-.6 2.8l.1.1-1.4 3.2 3.2-1.4.1.1c.9.7 2.2.4 2.8-.6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 12.8l2.2 2.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const StopIcon = () => (
  <svg
    className="sidebar-run-icon"
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
  >
    <circle
      cx="12"
      cy="12"
      r="8.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    />
    <rect x="9" y="9" width="6" height="6" rx="1.2" fill="currentColor" />
  </svg>
);

const StatusPulse = ({ active }: { active: boolean }) => (
  <svg
    className={`sidebar-status-pulse${active ? " is-active" : ""}`}
    viewBox="0 0 24 24"
    role="presentation"
    aria-hidden="true"
  >
    <circle className="sidebar-status-pulse-ring" cx="12" cy="12" r="9" />
    <circle className="sidebar-status-pulse-dot" cx="12" cy="12" r="4" />
  </svg>
);

const AppRun = () => {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [streamLog, setStreamLog] = useState<LogMessage | null>(null);
  const [mode, setMode] = useState<"fast" | "normal" | "expert">(config.mode);
  const [markImageMode, setMarkImageMode] = useState<"dom" | "draw">(
    config.markImageMode
  );
  const [prompt, setPrompt] = useState(
    'Open Twitter, search for "Fellou AI" and follow'
  );
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chrome.storage.local.get(["running", "prompt"], (result) => {
      if (result.running !== undefined) {
        setRunning(result.running);
      }
      if (result.prompt !== undefined) {
        setPrompt(result.prompt);
      }
    });
    const messageListener = (message: any) => {
      if (!message) {
        return;
      }
      if (message.type === "stop") {
        setRunning(false);
        chrome.storage.local.set({ running: false });
      } else if (message.type === "log") {
        const time = new Date().toLocaleTimeString();
        const logMessage: LogMessage = {
          time,
          log: message.log,
          level: message.level || "info",
        };
        if (message.stream) {
          setStreamLog(logMessage);
        } else {
          setStreamLog(null);
          setLogs((prev) => [...prev, logMessage]);
        }
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight + 16,
        behavior: "smooth",
      });
    }
  }, [logs, streamLog]);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "update_mode", mode, markImageMode });
  }, [mode, markImageMode]);

  const handleClick = () => {
    if (running) {
      setRunning(false);
      chrome.storage.local.set({ running: false, prompt });
      chrome.runtime.sendMessage({ type: "stop" });
      return;
    }
    if (!prompt.trim()) {
      return;
    }
    setLogs([]);
    setStreamLog(null);
    setRunning(true);
    chrome.storage.local.set({ running: true, prompt });
    chrome.runtime.sendMessage({ type: "run", prompt: prompt.trim() });
  };

  const getLogClass = (level: string) => {
    switch (level) {
      case "error":
        return "sidebar-log-entry sidebar-log-entry--error";
      case "success":
        return "sidebar-log-entry sidebar-log-entry--success";
      default:
        return "sidebar-log-entry sidebar-log-entry--info";
    }
  };

  const renderLogEntry = (entry: LogMessage, key: string | number) => (
    <pre key={key} className={getLogClass(entry.level || "info")}>
      <span className="sidebar-log-time">[{entry.time}] </span>
      <span>{entry.log}</span>
    </pre>
  );

  return (
    <div className="sidebar-root">
      <div className="sidebar-shell">
        <header className="sidebar-header">
          <div className="sidebar-brand">
            <span className="sidebar-logo">
              <LogoGlyph />
            </span>
            <div className="sidebar-brand-text">
              <h1>Assistant</h1>
              <p>Direct autonomous browsing flows with clarity and calm.</p>
            </div>
          </div>
          <div
            className={`sidebar-status${running ? " sidebar-status--active" : ""}`}
          >
            <StatusPulse active={running} />
            <span>{running ? "Running" : "Idle"}</span>
          </div>
        </header>

        <section className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-icon">
              <SparkleIcon />
            </span>
            <div>
              <h2>Workflow prompt</h2>
              <p>Describe the journey you want Eko to execute end-to-end.</p>
            </div>
          </div>
          <textarea
            rows={4}
            value={prompt}
            disabled={running}
            placeholder="Describe the workflow for Eko"
            onChange={(e) => setPrompt(e.target.value)}
            className="sidebar-textarea"
            aria-label="Workflow prompt"
          />
        </section>

        <section className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-icon">
              <CompassIcon />
            </span>
            <div>
              <h2>Execution controls</h2>
              <p>Fine-tune how Eko explores and annotates pages while running.</p>
            </div>
          </div>
          <div className="sidebar-control-grid">
            <label className="sidebar-control">
              <span className="sidebar-control-label">Run mode</span>
              <span className="sidebar-control-caption">
                Balance speed and reasoning depth for the task at hand.
              </span>
              <select
                title="Mode"
                value={mode}
                onChange={(e) =>
                  setMode(e.target.value as "fast" | "normal" | "expert")
                }
                className="sidebar-select"
              >
                <option value="fast">Fast</option>
                <option value="normal">Normal</option>
                <option value="expert">Expert</option>
              </select>
            </label>
            <label className="sidebar-control">
              <span className="sidebar-control-label">Mark image mode</span>
              <span className="sidebar-control-caption">
                Choose how Eko highlights screen regions during playback.
              </span>
              <select
                title="Mark Image Mode"
                value={markImageMode}
                onChange={(e) =>
                  setMarkImageMode(e.target.value as "dom" | "draw")
                }
                className="sidebar-select"
              >
                <option value="dom">DOM overlay</option>
                <option value="draw">Freehand drawing</option>
              </select>
            </label>
          </div>
        </section>

        <section className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-icon">
              <LogbookIcon />
            </span>
            <div>
              <h2>Activity feed</h2>
              <p>Stay informed as each action and insight streams in real time.</p>
            </div>
          </div>
          <div className="sidebar-log-container" ref={logContainerRef}>
            {logs.length === 0 && !streamLog ? (
              <div className="sidebar-log-empty">
                <p>Activity updates will appear here once a run begins.</p>
              </div>
            ) : (
              <>
                {logs.map((log, index) => renderLogEntry(log, index))}
                {streamLog && renderLogEntry(streamLog, "stream")}
              </>
            )}
          </div>
        </section>

        <footer className="sidebar-footer">
          <button
            type="button"
            onClick={handleClick}
            className="sidebar-run-button"
            data-running={running}
            aria-pressed={running}
          >
            <span className="sidebar-run-button-icon">
              {running ? <StopIcon /> : <LaunchIcon />}
            </span>
            <span className="sidebar-run-button-text">
              {running ? "Stop run" : "Launch run"}
            </span>
          </button>
        </footer>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <AppRun />
  </React.StrictMode>
);
