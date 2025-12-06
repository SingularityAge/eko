import "./index.css";
import { createRoot } from "react-dom/client";
import { message as AntdMessage } from "antd";
import React, { useState, useRef, useEffect, useMemo } from "react";

// SVG Icons as React components - all sized consistently
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

// Activity types and colors
interface Activity {
  name: string;
  startHour: number;
  endHour: number;
  color: string;
}

// Helper to parse time string to hours
const parseTimeToHours = (timeStr: string): number => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2]);
  const period = match[3]?.toUpperCase();

  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;

  return hours + minutes / 60;
};

// Generate activities from persona schedule
const generateActivities = (persona: Persona): Activity[] => {
  const activities: Activity[] = [];
  const wakeHour = parseTimeToHours(persona.schedule.wake_time);
  const sleepHour = parseTimeToHours(persona.schedule.sleep_time);

  // Sleep (previous night until wake)
  activities.push({
    name: "Sleep",
    startHour: sleepHour > wakeHour ? sleepHour - 24 : sleepHour,
    endHour: wakeHour,
    color: "#6B7280"
  });

  // Morning routine
  activities.push({
    name: "Morning Routine",
    startHour: wakeHour,
    endHour: wakeHour + 0.5,
    color: "#8B5CF6"
  });

  // Breakfast
  const breakfastTime = persona.schedule.meals[0] ? parseTimeToHours(persona.schedule.meals[0]) : wakeHour + 0.5;
  activities.push({
    name: "Breakfast",
    startHour: breakfastTime,
    endHour: breakfastTime + 0.5,
    color: "#F59E0B"
  });

  // Work hours if defined
  if (persona.schedule.work_hours) {
    const workMatch = persona.schedule.work_hours.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM)?)/i);
    if (workMatch) {
      const workStart = parseTimeToHours(workMatch[1]);
      const workEnd = parseTimeToHours(workMatch[2]);
      activities.push({
        name: "Work",
        startHour: workStart,
        endHour: workEnd,
        color: "#3B82F6"
      });
    }
  } else {
    // Default work hours
    activities.push({
      name: "Browsing",
      startHour: breakfastTime + 0.5,
      endHour: 12,
      color: "#10B981"
    });
  }

  // Lunch
  const lunchTime = persona.schedule.meals[1] ? parseTimeToHours(persona.schedule.meals[1]) : 12;
  activities.push({
    name: "Lunch",
    startHour: lunchTime,
    endHour: lunchTime + 0.75,
    color: "#F59E0B"
  });

  // Afternoon activities
  activities.push({
    name: "Browsing",
    startHour: lunchTime + 0.75,
    endHour: 17,
    color: "#10B981"
  });

  // Dinner
  const dinnerTime = persona.schedule.meals[2] ? parseTimeToHours(persona.schedule.meals[2]) : 18;
  activities.push({
    name: "Dinner",
    startHour: dinnerTime,
    endHour: dinnerTime + 1,
    color: "#F59E0B"
  });

  // Evening leisure
  activities.push({
    name: "Leisure",
    startHour: dinnerTime + 1,
    endHour: sleepHour,
    color: "#EC4899"
  });

  // Sleep (tonight)
  activities.push({
    name: "Sleep",
    startHour: sleepHour,
    endHour: sleepHour + (24 - sleepHour) + wakeHour,
    color: "#6B7280"
  });

  return activities.sort((a, b) => a.startHour - b.startHour);
};

// Activity Timeline Component
const ActivityTimeline: React.FC<{ persona: Persona; currentActivity?: string }> = ({ persona, currentActivity }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
  const activities = useMemo(() => generateActivities(persona), [persona]);

  // Timeline shows 24 hours centered on current time
  const timelineStart = currentHour - 12;
  const timelineEnd = currentHour + 12;

  // Get position percentage for an hour
  const getPosition = (hour: number): number => {
    let normalizedHour = hour;
    // Handle wrap-around
    if (normalizedHour < timelineStart) normalizedHour += 24;
    if (normalizedHour > timelineEnd) normalizedHour -= 24;
    return ((normalizedHour - timelineStart) / 24) * 100;
  };

  // Get width percentage for duration
  const getWidth = (startHour: number, endHour: number): number => {
    const duration = endHour - startHour;
    return (duration / 24) * 100;
  };

  // Find current activity
  const getCurrentActivity = (): Activity | null => {
    for (const activity of activities) {
      let start = activity.startHour;
      let end = activity.endHour;

      // Normalize hours for comparison
      if (start < 0) start += 24;
      if (end > 24) end -= 24;

      if (start <= currentHour && currentHour < end) {
        return activity;
      }
      // Handle overnight activities
      if (start > end && (currentHour >= start || currentHour < end)) {
        return activity;
      }
    }
    return null;
  };

  const activeActivity = getCurrentActivity();

  // Render activity segments
  const renderActivities = () => {
    const elements: JSX.Element[] = [];
    let labelDirection = true; // true = up, false = down

    activities.forEach((activity, index) => {
      let startHour = activity.startHour;
      let endHour = activity.endHour;

      // Normalize hours
      if (startHour < 0) startHour += 24;

      // Check if activity is visible in current window
      const visibleStart = Math.max(startHour, timelineStart);
      const visibleEnd = Math.min(endHour, timelineEnd);

      if (visibleEnd <= visibleStart) return;

      const left = getPosition(visibleStart);
      const width = getWidth(visibleStart, visibleEnd);

      if (width <= 0 || left < 0 || left > 100) return;

      const isActive = activeActivity?.name === activity.name;
      const isPast = endHour <= currentHour;
      const isFuture = startHour > currentHour;

      // Calculate opacity for future parts of current activity
      let opacity = 1;
      if (isActive && !isPast) {
        // Current activity - show completed part solid, remaining part at 50%
        opacity = 1;
      } else if (isFuture) {
        opacity = 0.5;
      }

      // Segment bar
      elements.push(
        <div
          key={`segment-${index}`}
          className="timeline-segment"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            backgroundColor: activity.color,
            opacity: opacity,
          }}
        />
      );

      // For active activity, show the remaining time with 50% opacity
      if (isActive && !isPast && !isFuture) {
        const remainingStart = currentHour;
        const remainingLeft = getPosition(remainingStart);
        const remainingWidth = getWidth(remainingStart, visibleEnd);

        elements.push(
          <div
            key={`segment-future-${index}`}
            className="timeline-segment"
            style={{
              left: `${remainingLeft}%`,
              width: `${remainingWidth}%`,
              backgroundColor: activity.color,
              opacity: 0.5,
            }}
          />
        );
      }

      // Label with alternating direction
      const labelLeft = left + width / 2;
      if (labelLeft > 5 && labelLeft < 95 && width > 2) {
        elements.push(
          <div
            key={`label-${index}`}
            className={`timeline-label ${labelDirection ? 'label-up' : 'label-down'}`}
            style={{
              left: `${labelLeft}%`,
              color: activity.color,
            }}
          >
            <div className="label-line" style={{ backgroundColor: activity.color }} />
            <span className="label-text">{activity.name}</span>
          </div>
        );
        labelDirection = !labelDirection; // Alternate
      }
    });

    return elements;
  };

  // Render hour markers
  const renderHourMarkers = () => {
    const markers: JSX.Element[] = [];
    for (let i = -12; i <= 12; i += 3) {
      let hour = Math.floor(currentHour + i);
      if (hour < 0) hour += 24;
      if (hour >= 24) hour -= 24;

      const position = ((i + 12) / 24) * 100;
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';

      markers.push(
        <div
          key={`marker-${i}`}
          className="hour-marker"
          style={{ left: `${position}%` }}
        >
          <span>{displayHour}{ampm}</span>
        </div>
      );
    }
    return markers;
  };

  return (
    <div className="activity-timeline-container">
      <div className="timeline-header">
        <span className="timeline-label-text">
          {activeActivity?.name || currentActivity || "Current Activity"}
        </span>
        <span className="timeline-time">
          {currentTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>
      <div className="timeline-wrapper" ref={timelineRef}>
        <div className="timeline-fade-left" />
        <div className="timeline-fade-right" />
        <div className="timeline-track">
          {renderActivities()}
          {/* Current time indicator */}
          <div className="current-time-indicator" style={{ left: '50%' }}>
            <div className="indicator-line" />
            <div className="indicator-dot" />
          </div>
        </div>
        <div className="timeline-hours">
          {renderHourMarkers()}
        </div>
      </div>
    </div>
  );
};

const Browseless = () => {
  const [personaDescription, setPersonaDescription] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [generating, setGenerating] = useState(false);
  const [simulationState, setSimulationState] = useState<SimulationState>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedPersona = localStorage.getItem("persona");
    if (savedPersona) {
      try {
        const personaData = JSON.parse(savedPersona);
        setPersona(personaData);
        setEmail(personaData.email || "");
        setPassword(personaData.credentials?.email_password || "");
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
          model: llmConfig.plannerModel || llmConfig.chatModel || "anthropic/claude-sonnet-4",
          messages: [
            {
              role: "user",
              content: `Generate a detailed JSON persona from this description: "${personaDescription}".

Include these exact fields:
- demographics: {age (number), gender (string), location (string)}
- email: leave as empty string ""
- schedule: {wake_time (e.g. "7:00 AM"), sleep_time, work_hours (optional, e.g. "9:00 AM - 5:00 PM"), meals (array of times like ["7:30 AM", "12:00 PM", "6:30 PM"]), bathroom_breaks (number per day)}
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
    const personaWithCreds = {
      ...persona,
      email: email,
      credentials: { email_password: password },
    };
    const dataStr = JSON.stringify(personaWithCreds, null, 2);
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
        setEmail(personaData.email || "");
        setPassword(personaData.credentials?.email_password || "");
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
      email: email,
      credentials: {
        email_password: password,
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
                  {/* Demographics */}
                  <div className="info-section">
                    <div className="info-section-label">Demographics</div>
                    <div className="info-section-value">
                      {persona.demographics.age}y/o {persona.demographics.gender}, {persona.demographics.location}
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="credential-field">
                    <label className="credential-field-label">Email Address</label>
                    <input
                      type="email"
                      className="credential-field-input"
                      placeholder="Enter email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  {/* Password Input */}
                  <div className="credential-field">
                    <label className="credential-field-label">Password</label>
                    <input
                      type="password"
                      className="credential-field-input"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="credential-field-note">Stored locally only</div>
                  </div>

                  {/* Activity Timeline */}
                  <ActivityTimeline
                    persona={persona}
                    currentActivity={simulationStatus?.activity}
                  />
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
