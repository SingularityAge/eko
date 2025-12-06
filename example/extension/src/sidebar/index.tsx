import "./index.css";
import { createRoot } from "react-dom/client";
import { Button, Input, Card, Switch, message as AntdMessage, Space, Typography, Tabs } from "antd";
import { PlayCircleOutlined, PauseCircleOutlined, DownloadOutlined, UploadOutlined, BarChartOutlined, SettingOutlined } from "@ant-design/icons";
import React, { useState, useRef, useEffect } from "react";
import { AnalyticsTimeline } from "./components/AnalyticsTimeline";

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

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

const AppRun = () => {
  const [personaDescription, setPersonaDescription] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [generating, setGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [personaEmail, setPersonaEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [emailAutoVerifyEnabled, setEmailAutoVerifyEnabled] = useState(false);
  const [activeTab, setActiveTab] = useState("control");
  const [activities, setActivities] = useState<any[]>([]);
  const [activityStats, setActivityStats] = useState<any>({
    totalEvents: 0,
    pageVisits: 0,
    searches: 0,
    emailChecks: 0,
    distractions: 0,
    signups: 0,
    verifications: 0,
    totalActiveTime: 0,
    sessionStart: Date.now(),
  });
  const [timeline, setTimeline] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedPersona = localStorage.getItem("persona");
    if (savedPersona) {
      try {
        const personaData = JSON.parse(savedPersona);
        setPersona(personaData);
        setPersonaEmail(personaData.email || "");
        setEmailPassword(personaData.credentials?.email_password || "");
      } catch (e) {
        console.error("Failed to load persona", e);
      }
    }

    chrome.storage.local.get(["isSimulationRunning", "emailAutoVerifyEnabled"], (result) => {
      setIsPlaying(result.isSimulationRunning || false);
      setEmailAutoVerifyEnabled(result.emailAutoVerifyEnabled || false);
    });
  }, []);

  useEffect(() => {
    loadActivityData();
    const interval = setInterval(loadActivityData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadActivityData = () => {
    chrome.runtime.sendMessage({ type: "getActivities" }, (response) => {
      if (response) {
        setActivities(response.activities || []);
        setActivityStats(response.stats || activityStats);
        setTimeline(response.timeline || []);
      }
    });
  };

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
      } else if (message.type === "activity_update") {
        setActivities(message.data.activities || []);
        setActivityStats(message.data.stats || activityStats);
        setTimeline(message.data.timeline || []);
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const generatePersona = async () => {
    if (!personaDescription.trim()) {
      AntdMessage.warning("Please enter a persona description");
      return;
    }

    if (!personaEmail.trim()) {
      AntdMessage.warning("Please enter an email address for the persona");
      return;
    }

    setGenerating(true);
    try {
      const config = await chrome.storage.sync.get(["llmConfig"]);
      const llmConfig = config.llmConfig;

      if (!llmConfig || !llmConfig.apiKey) {
        AntdMessage.warning("OpenRouter API key not configured. Opening settings...", 5);
        setTimeout(() => chrome.runtime.openOptionsPage(), 1000);
        setGenerating(false);
        return;
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${llmConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: llmConfig.modelName || "anthropic/claude-sonnet-4.5",
          messages: [
            {
              role: "user",
              content: `Generate a detailed JSON persona from this description: "${personaDescription}".

Include these exact fields:
- demographics: {age (number), gender (string), location (string)}
- schedule: {wake_time (e.g. "7:00 AM"), sleep_time, work_hours (optional), meals (array of times), bathroom_breaks (number per day)}
- interests: array of hobbies/interests
- browsing_habits: {favorite_sites (array), session_length_minutes (number), search_patterns (array of typical searches)}
- personality_traits: array of traits (e.g. "curious", "impatient")
- tech_setup: {laptop_model (string), os (string)}

Do NOT include an email field. Output ONLY valid JSON, no markdown or explanation.`
            }
          ],
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "API returned an error");
      }

      if (!data.choices || !data.choices[0]) {
        console.error("Unexpected API response:", data);
        throw new Error("Unexpected API response format. Please check your API key and try again.");
      }

      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error("No response from API");
      }

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const personaData = JSON.parse(jsonMatch ? jsonMatch[0] : content);

      personaData.email = personaEmail;

      setPersona(personaData);
      localStorage.setItem("persona", JSON.stringify(personaData));
      AntdMessage.success("Persona generated successfully!");
    } catch (error) {
      console.error("Error generating persona:", error);
      AntdMessage.error("Failed to generate persona: " + error);
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
    link.download = `persona_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    AntdMessage.success("Persona downloaded!");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const personaData = JSON.parse(e.target?.result as string);
        setPersona(personaData);
        setPersonaEmail(personaData.email || "");
        setEmailPassword(personaData.credentials?.email_password || "");
        localStorage.setItem("persona", JSON.stringify(personaData));
        AntdMessage.success("Persona uploaded successfully!");
      } catch (error) {
        AntdMessage.error("Invalid persona file");
      }
    };
    reader.readAsText(file);
  };

  const handlePlay = async () => {
    if (!persona) {
      AntdMessage.warning("Please generate or upload a persona first");
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
      setIsPlaying(true);
      localStorage.setItem("persona", JSON.stringify(personaWithCreds));
    } catch (error) {
      AntdMessage.error("Failed to start simulation: " + error);
    }
  };

  const handlePause = () => {
    chrome.runtime.sendMessage({
      requestId: Date.now().toString(),
      type: "pauseSimulation",
      data: {},
    });
    setIsPlaying(false);
    setSimulationStatus(null);
  };

  const colors = {
    light: {
      background: "#FFFFFF",
      surface: "#F9FAFB",
      surfaceHover: "#F3F4F6",
      border: "#E5E7EB",
      text: "#1F2937",
      textSecondary: "#6B7280",
      primary: "#2563EB",
      primaryHover: "#1D4ED8",
    },
    dark: {
      background: "#1A1A1A",
      surface: "#2A2A2A",
      surfaceHover: "#353535",
      border: "#404040",
      text: "#E5E7EB",
      textSecondary: "#9CA3AF",
      primary: "#3B82F6",
      primaryHover: "#2563EB",
    }
  };

  const theme = darkMode ? colors.dark : colors.light;

  const cardStyle = {
    marginBottom: 16,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
  };

  const renderPersonaPreview = () => {
    if (!persona) return null;

    return (
      <Card
        title={<span style={{ fontSize: 15, fontWeight: 500 }}>Persona Preview</span>}
        style={{ ...cardStyle, marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <Text strong>Demographics: </Text>
            <Text>
              {persona.demographics.age}y/o {persona.demographics.gender} from{" "}
              {persona.demographics.location}
            </Text>
          </div>
          <div>
            <Text strong>Email: </Text>
            <Text>{persona.email}</Text>
          </div>
          <div>
            <Text strong>Schedule: </Text>
            <Text>
              Wakes at {persona.schedule.wake_time}, sleeps at {persona.schedule.sleep_time}
            </Text>
          </div>
          <div>
            <Text strong>Interests: </Text>
            <Text>{persona.interests.join(", ")}</Text>
          </div>
          <div>
            <Text strong>Personality: </Text>
            <Text>{persona.personality_traits.join(", ")}</Text>
          </div>
          <div>
            <Text strong>Tech: </Text>
            <Text>
              {persona.tech_setup.laptop_model} ({persona.tech_setup.os})
            </Text>
          </div>
          <div>
            <Text strong>Favorite Sites: </Text>
            <Text>{persona.browsing_habits.favorite_sites.slice(0, 3).join(", ")}</Text>
          </div>
        </Space>
      </Card>
    );
  };


  const renderControlTab = () => (
    <>
      <Card
        title={<span style={{ fontSize: 15, fontWeight: 500 }}>1. Describe Your Persona</span>}
        style={cardStyle}
      >
        <TextArea
          rows={4}
          placeholder="e.g., 20-year-old college student into gaming and memes"
          value={personaDescription}
          onChange={(e) => setPersonaDescription(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Input
          placeholder="Persona email (e.g., yourname@protonmail.com)"
          value={personaEmail}
          onChange={(e) => setPersonaEmail(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Button
          type="primary"
          onClick={generatePersona}
          loading={generating}
          block
          size="large"
        >
          Generate Persona
        </Button>
      </Card>

      <Card
        title={<span style={{ fontSize: 15, fontWeight: 500 }}>2. Manage Persona</span>}
        style={cardStyle}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space style={{ width: "100%" }}>
            <Button
              icon={<DownloadOutlined />}
              onClick={downloadPersona}
              disabled={!persona}
            >
              Download
            </Button>
            <Button
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </Space>

          {persona && (
            <div style={{ width: "100%", marginTop: 12 }}>
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Persona Email
              </Text>
              <Input
                placeholder="Persona email address"
                value={personaEmail}
                onChange={(e) => {
                  setPersonaEmail(e.target.value);
                  if (persona) {
                    const updatedPersona = { ...persona, email: e.target.value };
                    setPersona(updatedPersona);
                    localStorage.setItem("persona", JSON.stringify(updatedPersona));
                  }
                }}
                style={{ marginBottom: 12 }}
              />
              <Text strong style={{ display: "block", marginBottom: 8 }}>
                Email Password (Optional)
              </Text>
              <Input.Password
                placeholder="Email password for simulation"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                style={{ marginBottom: 12 }}
              />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <Text strong style={{ color: theme.text }}>
                    Enable Email Auto-Verify
                  </Text>
                  <br />
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Automatically detect signups and fill verification codes
                  </Text>
                </div>
                <Switch
                  checked={emailAutoVerifyEnabled}
                  onChange={(checked) => {
                    setEmailAutoVerifyEnabled(checked);
                    chrome.runtime.sendMessage({
                      type: "enableEmailAutoVerify",
                      data: {
                        enabled: checked,
                        email: persona?.email,
                        password: emailPassword,
                      },
                    });
                  }}
                  disabled={!persona}
                />
              </div>
              <Text style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4, display: "block" }}>
                Stored locally only. Used for simulation purposes.
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {renderPersonaPreview()}

      <Card
        title={<span style={{ fontSize: 15, fontWeight: 500 }}>Control Simulation</span>}
        style={{ ...cardStyle, marginTop: 16 }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space style={{ width: "100%" }}>
            {!isPlaying ? (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handlePlay}
                disabled={!persona}
                size="large"
              >
                Play
              </Button>
            ) : (
              <Button
                danger
                icon={<PauseCircleOutlined />}
                onClick={handlePause}
                size="large"
              >
                Pause
              </Button>
            )}
          </Space>

          {!persona && (
            <Paragraph style={{ marginTop: 12, color: theme.textSecondary }}>
              Generate or upload a persona to start simulation
            </Paragraph>
          )}

          {isPlaying && (
            <Card
              size="small"
              style={{
                marginTop: 12,
                backgroundColor: theme.surface,
                border: `1px solid ${theme.border}`,
                borderLeft: `4px solid ${simulationStatus ? "#10B981" : theme.border}`,
                borderRadius: 6,
              }}
            >
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: "#10B981",
                    animation: "pulse 2s infinite"
                  }} />
                  <Text strong style={{ color: theme.text, fontSize: 13, fontWeight: 500 }}>
                    Simulation Active
                  </Text>
                </div>
                {simulationStatus && (
                  <>
                    <div style={{ paddingLeft: 16 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                        {simulationStatus.activity}
                      </Text>
                    </div>
                    {simulationStatus.site !== "N/A" && (
                      <div style={{ paddingLeft: 16 }}>
                        <Text style={{ color: theme.textSecondary, fontSize: 11, opacity: 0.8 }}>
                          {simulationStatus.site.length > 40
                            ? simulationStatus.site.substring(0, 40) + "..."
                            : simulationStatus.site}
                        </Text>
                      </div>
                    )}
                    <div style={{ paddingLeft: 16, marginTop: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          flex: 1,
                          height: 4,
                          backgroundColor: theme.border,
                          borderRadius: 2,
                          overflow: "hidden"
                        }}>
                          <div style={{
                            width: `${simulationStatus.energy}%`,
                            height: "100%",
                            backgroundColor: simulationStatus.energy > 50
                              ? "#10B981"
                              : simulationStatus.energy > 30
                              ? "#F59E0B"
                              : "#EF4444",
                            transition: "width 0.3s ease"
                          }} />
                        </div>
                        <Text style={{
                          fontSize: 11,
                          color: theme.textSecondary,
                          minWidth: 35
                        }}>
                          {simulationStatus.energy.toFixed(0)}%
                        </Text>
                      </div>
                    </div>
                  </>
                )}
              </Space>
            </Card>
          )}
        </Space>
      </Card>
    </>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: theme.background,
        color: theme.text,
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, color: theme.text, fontWeight: 600 }}>
          PersonaSurfer
        </Title>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>Dark Mode</Text>
          <Switch checked={darkMode} onChange={setDarkMode} />
        </div>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'control',
            label: (
              <span>
                <SettingOutlined />
                Control
              </span>
            ),
            children: renderControlTab(),
          },
          {
            key: 'analytics',
            label: (
              <span>
                <BarChartOutlined />
                Analytics
              </span>
            ),
            children: (
              <AnalyticsTimeline
                activities={activities}
                stats={activityStats}
                timeline={timeline}
                darkMode={darkMode}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <AppRun />
  </React.StrictMode>
);
