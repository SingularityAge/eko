import "./index.css";
import { createRoot } from "react-dom/client";
import { message as AntdMessage } from "antd";
import React, { useState, useRef, useEffect } from "react";

// SVG Icons as React components - all sized consistently
const LogoIcon = () => (
  <svg viewBox="0 0 100 85" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Browser window */}
    <rect x="8" y="8" width="84" height="68" rx="8" stroke="#DA7756" strokeWidth="5" fill="none"/>
    {/* Browser dots */}
    <circle cx="20" cy="18" r="3" fill="#DA7756"/>
    <circle cx="30" cy="18" r="3" fill="#DA7756"/>
    {/* Address bar */}
    <rect x="42" y="14" width="42" height="8" rx="4" fill="#DA7756"/>
    {/* Bird body */}
    <path d="M62 42c0 8-6 14-14 14s-14-6-14-14c0-6 4-11 9-13l-8-12c12 4 22 12 27 25z" fill="#DA7756"/>
    {/* Bird head */}
    <circle cx="65" cy="35" r="8" fill="#DA7756"/>
    {/* Bird eye */}
    <circle cx="67" cy="33" r="2" fill="white"/>
    {/* Bird beak */}
    <path d="M73 35l6-2-6 4z" fill="#DA7756"/>
    {/* Wing upper */}
    <path d="M20 28c15-8 25-5 32 2-10-2-20 0-28 8l-4-10z" fill="#DA7756"/>
    {/* Wing middle */}
    <path d="M16 38c12-6 22-4 30 4-8-2-18 0-26 6l-4-10z" fill="#DA7756"/>
    {/* Wing lower */}
    <path d="M14 50c10-4 18-2 24 4-6-1-14 1-20 4l-4-8z" fill="#DA7756"/>
    {/* Tail */}
    <path d="M38 56c-4 8-10 18-18 24 2-8 6-16 12-22l6-2z" fill="#DA7756"/>
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
  </svg>
);

// Reset icon - circular arrow like computer reset button
const ResetIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
  </svg>
);

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"/>
    <path d="M19 15L20 18L23 19L20 20L19 23L18 20L15 19L18 18L19 15Z"/>
  </svg>
);

interface Message {
  role: "user" | "assistant";
  content: string;
}

type AgentState = "idle" | "running" | "paused";

const Browseless = () => {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Listen for agent status updates
    const handleMessage = (message: any) => {
      if (message.type === "agent_status") {
        setAgentState(message.data.status);
      } else if (message.type === "agent_response") {
        setMessages(prev => [...prev, { role: "assistant", content: message.data.content }]);
      } else if (message.type === "log") {
        const level = message.data.level;
        const msg = message.data.message;
        const showMessage =
          level === "error"
            ? AntdMessage.error
            : level === "success"
            ? AntdMessage.success
            : AntdMessage.info;
        showMessage(msg, 3);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handlePlay = async () => {
    if (!query.trim() && agentState === "idle") {
      AntdMessage.warning("Please enter a task for the agents");
      return;
    }

    if (agentState === "paused") {
      // Resume
      chrome.runtime.sendMessage({
        requestId: Date.now().toString(),
        type: "resumeAgent",
        data: {},
      });
      setAgentState("running");
      return;
    }

    // Start new task
    const userMessage = query.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setQuery("");

    try {
      chrome.runtime.sendMessage({
        requestId: Date.now().toString(),
        type: "startAgent",
        data: { query: userMessage },
      });
      setAgentState("running");
    } catch (error) {
      AntdMessage.error("Failed to start agent");
    }
  };

  const handlePause = () => {
    chrome.runtime.sendMessage({
      requestId: Date.now().toString(),
      type: "pauseAgent",
      data: {},
    });
    setAgentState("paused");
  };

  const handleReset = () => {
    chrome.runtime.sendMessage({
      requestId: Date.now().toString(),
      type: "resetAgent",
      data: {},
    });
    setMessages([]);
    setQuery("");
    setAgentState("idle");
    AntdMessage.info("Chat reset");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (agentState === "idle" || agentState === "paused") {
        handlePlay();
      }
    }
  };

  const openSettings = () => {
    chrome.runtime.openOptionsPage();
  };

  return (
    <div className="browseless-container">
      {/* Header */}
      <header className="browseless-header">
        <div className="browseless-logo">
          <div className="browseless-logo-icon">
            <LogoIcon />
          </div>
          <span className="browseless-logo-text">Browseless</span>
        </div>
        <div className="browseless-header-actions">
          <button className="header-btn" onClick={openSettings} title="Settings">
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="browseless-content">
        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <SparklesIcon />
              </div>
              <h2 className="empty-state-title">Browse less. Live more.</h2>
              <p className="empty-state-description">
                Let our swarm of agents handle your busywork. Reclaim your time for what really matters.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div key={index} className={`message message-${message.role}`}>
                  <div className="message-content">{message.content}</div>
                </div>
              ))}
              {agentState === "running" && (
                <div className="message message-assistant">
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="prompt-textarea"
              placeholder="How can I help you today?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={agentState === "running"}
            />
            <div className="input-controls">
              {/* Reset button */}
              <button
                className="control-btn reset"
                onClick={handleReset}
                title="Reset Chat"
              >
                <ResetIcon />
              </button>

              {/* Pause button - only when running */}
              {agentState === "running" && (
                <button
                  className="control-btn pause"
                  onClick={handlePause}
                  title="Pause Agent"
                >
                  <PauseIcon />
                </button>
              )}

              {/* Play button */}
              <button
                className="control-btn play"
                onClick={handlePlay}
                disabled={agentState === "running" || (!query.trim() && agentState === "idle")}
                title={agentState === "paused" ? "Resume Agent" : "Send"}
              >
                <PlayIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <Browseless />
  </React.StrictMode>
);
