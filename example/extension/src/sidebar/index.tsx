import "./index.css";
import { createRoot } from "react-dom/client";
import { Button, Input, Card, Switch, message as AntdMessage, Space, Typography } from "antd";
import { PlayCircleOutlined, PauseCircleOutlined, DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import React, { useState, useRef, useEffect } from "react";

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
  const [darkMode, setDarkMode] = useState(true);
  const [emailPassword, setEmailPassword] = useState("");
  const [simulationStatus, setSimulationStatus] = useState<SimulationStatus | null>(null);
  const [emailAutoVerifyEnabled, setEmailAutoVerifyEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    chrome.storage.local.get(["isSimulationRunning", "emailAutoVerifyEnabled"], (result) => {
      setIsPlaying(result.isSimulationRunning || false);
      setEmailAutoVerifyEnabled(result.emailAutoVerifyEnabled || false);
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
      AntdMessage.warning("Please enter a persona description");
      return;
    }

    setGenerating(true);
    try {
      const config = await chrome.storage.sync.get(["llmConfig"]);
      const llmConfig = config.llmConfig;

      if (!llmConfig || !llmConfig.apiKey) {
        AntdMessage.error("Please configure your OpenRouter API key in settings");
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
          model: llmConfig.modelName || "anthropic/claude-sonnet-4.5",
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

  const renderPersonaPreview = () => {
    if (!persona) return null;

    return (
      <Card title="Persona Preview" style={{ marginTop: 16 }}>
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


  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: darkMode ? "#1a1a1a" : "#ffffff",
        color: darkMode ? "#ffffff" : "#000000",
        padding: "20px",
        overflowY: "auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <Title level={2} style={{ margin: 0, color: darkMode ? "#ffffff" : "#000000" }}>
          PersonaSurfer
        </Title>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Text style={{ color: darkMode ? "#ffffff" : "#000000" }}>Dark Mode</Text>
          <Switch checked={darkMode} onChange={setDarkMode} />
        </div>
      </div>

      <Card
        title="1. Describe Your Persona"
        style={{ marginBottom: 16, backgroundColor: darkMode ? "#2a2a2a" : "#ffffff" }}
      >
        <TextArea
          rows={4}
          placeholder="e.g., 20-year-old college student into gaming and memes"
          value={personaDescription}
          onChange={(e) => setPersonaDescription(e.target.value)}
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
        title="2. Manage Persona"
        style={{ marginBottom: 16, backgroundColor: darkMode ? "#2a2a2a" : "#ffffff" }}
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
                Email Credentials (Optional)
              </Text>
              <Input.Password
                placeholder="Email password for simulation"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                style={{ marginBottom: 4 }}
              />
              <Text style={{ fontSize: 12, color: "#888" }}>
                ⚠️ Stored locally only. Used for simulation purposes.
              </Text>
            </div>
          )}
        </Space>
      </Card>

      {renderPersonaPreview()}

      <Card
        title="Email Auto-Verify"
        style={{ marginTop: 16, backgroundColor: darkMode ? "#2a2a2a" : "#ffffff" }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <Text strong style={{ color: darkMode ? "#ffffff" : "#000000" }}>
                Enable Email Auto-Verify
              </Text>
              <br />
              <Text style={{ fontSize: 12, color: "#888" }}>
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
          {emailAutoVerifyEnabled && (
            <div style={{ marginTop: 12, padding: 12, backgroundColor: darkMode ? "#1a1a1a" : "#f5f5f5", borderRadius: 6 }}>
              <Text style={{ fontSize: 12, color: darkMode ? "#aaa" : "#666" }}>
                ✓ Will monitor for signup forms<br />
                ✓ Poll ProtonMail inbox every 10s<br />
                ✓ Auto-extract verification codes/links<br />
                ✓ Fill codes with realistic typing
              </Text>
            </div>
          )}
        </Space>
      </Card>

      <Card
        title="Control Simulation"
        style={{ marginTop: 16, backgroundColor: darkMode ? "#2a2a2a" : "#ffffff" }}
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
            <Paragraph style={{ marginTop: 12, color: "#999" }}>
              Generate or upload a persona to start simulation
            </Paragraph>
          )}

          {simulationStatus && isPlaying && (
            <Card
              size="small"
              style={{
                marginTop: 12,
                backgroundColor: darkMode ? "#333" : "#f0f0f0",
                borderColor: "#52c41a",
              }}
            >
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                <div>
                  <Text strong style={{ color: darkMode ? "#fff" : "#000" }}>
                    Status:{" "}
                  </Text>
                  <Text style={{ color: "#52c41a" }}>
                    {simulationStatus.status}
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: darkMode ? "#fff" : "#000" }}>
                    Browsing:{" "}
                  </Text>
                  <Text style={{ color: darkMode ? "#fff" : "#000" }}>
                    {simulationStatus.site}
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: darkMode ? "#fff" : "#000" }}>
                    Activity:{" "}
                  </Text>
                  <Text style={{ color: darkMode ? "#fff" : "#000" }}>
                    {simulationStatus.activity}
                  </Text>
                </div>
                <div>
                  <Text strong style={{ color: darkMode ? "#fff" : "#000" }}>
                    Energy:{" "}
                  </Text>
                  <Text
                    style={{
                      color:
                        simulationStatus.energy > 50
                          ? "#52c41a"
                          : simulationStatus.energy > 30
                          ? "#faad14"
                          : "#f5222d",
                    }}
                  >
                    {simulationStatus.energy.toFixed(0)}%
                  </Text>
                </div>
              </Space>
            </Card>
          )}
        </Space>
      </Card>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <AppRun />
  </React.StrictMode>
);
