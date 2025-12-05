import "./index.css";
import { createRoot } from "react-dom/client";
import { message as AntdMessage } from "antd";
import React, { useState, useRef, useEffect } from "react";

// SVG Icons as React components
const LogoIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="8" fill="url(#logoGradient)"/>
    <path d="M8 16C8 11.5817 11.5817 8 16 8C20.4183 8 24 11.5817 24 16" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M12 16C12 13.7909 13.7909 12 16 12C18.2091 12 20 13.7909 20 16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="16" cy="16" r="2" fill="white"/>
    <path d="M16 18V24" stroke="white" strokeWidth="2" strokeLinecap="round"/>
    <defs>
      <linearGradient id="logoGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#DA7756"/>
        <stop offset="1" stopColor="#C56747"/>
      </linearGradient>
    </defs>
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

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h12v12H6z"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
);

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z"/>
    <path d="M19 15L20 18L23 19L20 20L19 23L18 20L15 19L18 18L19 15Z"/>
  </svg>
);

interface Persona {
  demographics: {
    age: number;
    gender: string;
    location: string;
  };
  email: string;
  schedule: {
    wake_time: string;
    sleep_time: string;
    work_hours?: string;
    meals: string[];
    bathroom_breaks: number;
  };
  interests: string[];
  browsing_habits: {
    favorite_sites: string[];
    session_length_minutes: number;
    search_patterns: string[];
  };
  personality_traits: string[];
  tech_setup: {
    laptop_model: string;
    os: string;
  };
  credentials?: {
    email_password?: string;
  };
}

interface SimulationStatus {
  status: string;
  site: string;
  activity: string;
  energy: number;
}

type SimulationState = "idle" | "running" | "paused";

const Browseless = () => {
  const [personaDescription, setPersonaDescription] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [generating, setGenerating] = useState(false);
  const [simulationState, setSimulationState] = useState<SimulationState>("idle");
  const [emailPassword, setEmailPassword] = useState("");
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedPersona = localStorage.getItem("persona");
    if (savedPersona) {
      try {
        const personaData = JSON.parse(savedPersona);
        setPersona(personaData);
        setEmailPassword(personaData.credentials?.email_password || "");
      } catch (e) {
        console.error("Failed to load persona", e);
      }
    }

    chrome.storage.local.get(["isSimulationRunning"], (result) => {
      setSimulationState(result.isSimulationRunning ? "running" : "idle");
    });
  }, []);

  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "simulation_status") {
        setSimulationStatus(message.data);
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

  const generatePersona = async () => {
    if (!personaDescription.trim()) {
      AntdMessage.warning("Please describe the persona you want to create");
      return;
    }

    setGenerating(true);
    try {
      const config = await chrome.storage.sync.get(["llmConfig"]);
      const llmConfig = config.llmConfig;

      if (!llmConfig || !llmConfig.apiKey) {
        AntdMessage.error("Please configure your API key in settings");
        chrome.runtime.openOptionsPage();
        return;
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.plannerModel || llmConfig.chatModel || "anthropic/claude-sonnet-4.5",
          messages: [
            {
              role: "user",
              content: `Generate a detailed JSON persona from this description: "${personaDescription}".

Include these exact fields:
- demographics: {age (number), gender (string), location (string)}
- email: generate a unique protonmail.com address
- schedule: {wake_time (e.g. "7:00 AM"), sleep_time, work_hours (optional), meals (array of times), bathroom_breaks (number per day)}
- interests: array of hobbies/interests
- browsing_habits: {favorite_sites (array), session_length_minutes (number), search_patterns (array of typical searches)}
- personality_traits: array of traits (e.g. "curious", "impatient")
- tech_setup: {laptop_model (string), os (string)}

Output ONLY valid JSON, no markdown or explanation.`
            }
          ],
        }),
      });

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No response from API");
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const personaData = JSON.parse(jsonMatch ? jsonMatch[0] : content);

      setPersona(personaData);
      localStorage.setItem("persona", JSON.stringify(personaData));
      setPersonaDescription("");
      AntdMessage.success("Persona created successfully!");
    } catch (error) {
      console.error("Error generating persona:", error);
      AntdMessage.error("Failed to generate persona");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPersona = () => {
    if (!persona) return;
    const dataStr = JSON.stringify(persona, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `browseless_persona_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    AntdMessage.success("Persona downloaded");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const personaData = JSON.parse(e.target?.result as string);
        setPersona(personaData);
        localStorage.setItem("persona", JSON.stringify(personaData));
        AntdMessage.success("Persona uploaded successfully");
      } catch (error) {
        AntdMessage.error("Invalid persona file");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handlePlay = async () => {
    if (!persona) {
      AntdMessage.warning("Create or upload a persona first");
      return;
    }

    const personaWithCreds = {
      ...persona,
      credentials: {
        email_password: emailPassword,
      },
    };

    try {
      chrome.runtime.sendMessage({
        requestId: Date.now().toString(),
        type: "startSimulation",
        data: { persona: personaWithCreds },
      });
      setSimulationState("running");
      localStorage.setItem("persona", JSON.stringify(personaWithCreds));
    } catch (error) {
      AntdMessage.error("Failed to start simulation");
    }
  };

  const handlePause = () => {
    chrome.runtime.sendMessage({
      requestId: Date.now().toString(),
      type: "pauseSimulation",
      data: {},
    });
    setSimulationState("paused");
  };

  const handleStop = () => {
    chrome.runtime.sendMessage({
      requestId: Date.now().toString(),
      type: "pauseSimulation",
      data: {},
    });
    setSimulationState("idle");
    setSimulationStatus(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generatePersona();
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
          {/* Empty State or Persona Card */}
          {!persona ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <SparklesIcon />
              </div>
              <h2 className="empty-state-title">Create a Persona</h2>
              <p className="empty-state-description">
                Describe who you want to simulate browsing the web. Be as detailed as you like.
              </p>
            </div>
          ) : (
            <>
              {/* Persona Card */}
              <div className="persona-card">
                <div className="persona-card-header">
                  <span className="persona-card-title">Active Persona</span>
                  <div className="persona-card-actions">
                    <button className="icon-btn-sm" onClick={downloadPersona} title="Download">
                      <DownloadIcon />
                    </button>
                    <button className="icon-btn-sm" onClick={() => fileInputRef.current?.click()} title="Upload">
                      <UploadIcon />
                    </button>
                  </div>
                </div>
                <div className="persona-card-body">
                  <div className="persona-info-grid">
                    <div className="persona-info-item">
                      <UserIcon />
                      <div className="persona-info-content">
                        <div className="persona-info-label">Demographics</div>
                        <div className="persona-info-value">
                          {persona.demographics.age}y/o {persona.demographics.gender}, {persona.demographics.location}
                        </div>
                      </div>
                    </div>

                    <div className="persona-info-item">
                      <MailIcon />
                      <div className="persona-info-content">
                        <div className="persona-info-label">Email</div>
                        <div className="persona-info-value">{persona.email}</div>
                      </div>
                    </div>

                    <div className="persona-info-item">
                      <ClockIcon />
                      <div className="persona-info-content">
                        <div className="persona-info-label">Schedule</div>
                        <div className="persona-info-value">
                          {persona.schedule.wake_time} - {persona.schedule.sleep_time}
                        </div>
                      </div>
                    </div>

                    <div className="persona-info-item">
                      <HeartIcon />
                      <div className="persona-info-content">
                        <div className="persona-info-label">Interests</div>
                        <div className="tag-list">
                          {persona.interests.slice(0, 4).map((interest, i) => (
                            <span key={i} className="tag">{interest}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="persona-info-item">
                      <GlobeIcon />
                      <div className="persona-info-content">
                        <div className="persona-info-label">Favorite Sites</div>
                        <div className="persona-info-value">
                          {persona.browsing_habits.favorite_sites.slice(0, 3).join(", ")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Credential Input */}
                  <div className="credential-input-group">
                    <label className="credential-label">
                      <LockIcon />
                      Email Password (Optional)
                    </label>
                    <input
                      type="password"
                      className="credential-input"
                      placeholder="For email simulation"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                    />
                    <div className="credential-note">
                      <AlertIcon />
                      Stored locally only
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Card (when running) */}
              {simulationState !== "idle" && simulationStatus && (
                <div className="status-card">
                  <div className="status-card-header">
                    <div className={`status-indicator ${simulationState === "paused" ? "paused" : ""}`} />
                    <span className="status-title">
                      {simulationState === "running" ? "Simulation Running" : "Simulation Paused"}
                    </span>
                  </div>
                  <div className="status-grid">
                    <div className="status-item">
                      <div className="status-label">Status</div>
                      <div className="status-value success">{simulationStatus.status}</div>
                    </div>
                    <div className="status-item">
                      <div className="status-label">Energy</div>
                      <div className={`status-value ${
                        simulationStatus.energy > 50 ? "success" :
                        simulationStatus.energy > 30 ? "warning" : "error"
                      }`}>
                        {simulationStatus.energy.toFixed(0)}%
                      </div>
                    </div>
                    <div className="status-item">
                      <div className="status-label">Activity</div>
                      <div className="status-value">{simulationStatus.activity}</div>
                    </div>
                    <div className="status-item">
                      <div className="status-label">Current Site</div>
                      <div className="status-value">{simulationStatus.site}</div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="file-input-hidden"
          onChange={handleFileUpload}
        />

        {/* Input Area - 27% height with controls inside */}
        <div className="input-container">
          <div className="input-wrapper">
            <textarea
              ref={textareaRef}
              className="prompt-textarea"
              placeholder="Describe a persona to create... (e.g., 25-year-old software developer who loves gaming and coffee)"
              value={personaDescription}
              onChange={(e) => setPersonaDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={generating}
            />
            <div className="input-controls">
              {/* Play/Pause/Stop buttons */}
              {simulationState === "idle" && (
                <button
                  className="control-btn play"
                  onClick={handlePlay}
                  disabled={!persona}
                  title="Start Simulation"
                >
                  <PlayIcon />
                </button>
              )}

              {simulationState === "running" && (
                <>
                  <button
                    className="control-btn pause"
                    onClick={handlePause}
                    title="Pause Simulation"
                  >
                    <PauseIcon />
                  </button>
                  <button
                    className="control-btn stop"
                    onClick={handleStop}
                    title="Stop Simulation"
                  >
                    <StopIcon />
                  </button>
                </>
              )}

              {simulationState === "paused" && (
                <>
                  <button
                    className="control-btn play"
                    onClick={handlePlay}
                    title="Resume Simulation"
                  >
                    <PlayIcon />
                  </button>
                  <button
                    className="control-btn stop"
                    onClick={handleStop}
                    title="Stop Simulation"
                  >
                    <StopIcon />
                  </button>
                </>
              )}

              {/* Generate/Send button */}
              <button
                className="control-btn send"
                onClick={generatePersona}
                disabled={!personaDescription.trim() || generating}
                title="Generate Persona"
              >
                {generating ? (
                  <div className="loading-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  <>
                    <SendIcon />
                    <span>Generate</span>
                  </>
                )}
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
