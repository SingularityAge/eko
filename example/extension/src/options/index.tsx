import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";

// SVG Icons
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

const KeyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);

const BrainIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Small eye icon for vision capability
const VisionIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="#DA7756"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ width: '12px', height: '12px', marginLeft: '4px', verticalAlign: 'middle' }}
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// Agent configuration with vision requirement flag
const agentConfig = [
  {
    id: "plannerModel",
    name: "Planner",
    description: "Plans and breaks down tasks into steps",
    icon: "P",
    requiresVision: false,
  },
  {
    id: "chatModel",
    name: "Chat",
    description: "Handles conversation and coordinates agents",
    icon: "C",
    requiresVision: false,
  },
  {
    id: "navigatorModel",
    name: "Navigator",
    description: "Controls browser navigation and interactions",
    icon: "N",
    requiresVision: true,
  },
  {
    id: "writerModel",
    name: "Writer",
    description: "Writes and saves files to disk",
    icon: "W",
    requiresVision: false,
  },
];

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string;
  };
}

interface GroupedModels {
  [provider: string]: OpenRouterModel[];
}

const OptionsPage = () => {
  const defaultModel = "anthropic/claude-sonnet-4";

  const [config, setConfig] = useState({
    apiKey: "",
    plannerModel: defaultModel,
    chatModel: defaultModel,
    navigatorModel: defaultModel,
    writerModel: defaultModel,
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [groupedModels, setGroupedModels] = useState<GroupedModels>({});
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [recentlySelected, setRecentlySelected] = useState<Record<string, boolean>>({});

  // Fetch models from OpenRouter - reusable function
  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models");
      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }
      const data = await response.json();
      const modelList: OpenRouterModel[] = data.data || [];

      // Sort and group by provider
      const grouped: GroupedModels = {};
      modelList.forEach((model) => {
        const provider = model.id.split("/")[0] || "other";
        if (!grouped[provider]) {
          grouped[provider] = [];
        }
        grouped[provider].push(model);
      });

      // Sort models within each provider alphabetically
      Object.keys(grouped).forEach((provider) => {
        grouped[provider].sort((a, b) => a.name.localeCompare(b.name));
      });

      setGroupedModels(grouped);
    } catch (error) {
      console.error("Error fetching models:", error);
      setModelError("Failed to load models. Please check your connection.");
    } finally {
      setLoadingModels(false);
    }
  }, []);

  // Load saved config
  useEffect(() => {
    chrome.storage.sync.get(["llmConfig"], (result) => {
      if (result.llmConfig) {
        const llmConfig = result.llmConfig;
        setConfig({
          apiKey: llmConfig.apiKey || "",
          plannerModel: llmConfig.plannerModel || llmConfig.modelName || defaultModel,
          chatModel: llmConfig.chatModel || llmConfig.modelName || defaultModel,
          navigatorModel: llmConfig.navigatorModel || llmConfig.modelName || defaultModel,
          writerModel: llmConfig.writerModel || llmConfig.modelName || defaultModel,
        });
      }
    });
  }, []);

  // Fetch models on page load
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const handleChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleModelSelect = (agentId: string, value: string) => {
    handleChange(agentId, value);
    // Show glow effect
    setRecentlySelected(prev => ({ ...prev, [agentId]: true }));
    // Remove glow after animation
    setTimeout(() => {
      setRecentlySelected(prev => ({ ...prev, [agentId]: false }));
    }, 1500);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!config.apiKey.trim()) {
      newErrors.apiKey = "API key is required";
    }

    agentConfig.forEach(agent => {
      if (!config[agent.id as keyof typeof config].trim()) {
        newErrors[agent.id] = `Model is required for ${agent.name}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    chrome.storage.sync.set({ llmConfig: config }, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const toggleAgent = (agentId: string) => {
    setExpandedAgent(expandedAgent === agentId ? null : agentId);
  };

  // Get sorted provider names (alphabetically, but put popular ones first)
  const getSortedProviders = () => {
    const priorityProviders = ["anthropic", "openai", "google", "meta-llama", "mistralai", "x-ai"];
    const providers = Object.keys(groupedModels);

    return providers.sort((a, b) => {
      const aIndex = priorityProviders.indexOf(a);
      const bIndex = priorityProviders.indexOf(b);

      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });
  };

  const formatProviderName = (provider: string) => {
    const names: Record<string, string> = {
      "anthropic": "Anthropic",
      "openai": "OpenAI",
      "google": "Google",
      "meta-llama": "Meta",
      "mistralai": "Mistral AI",
      "x-ai": "xAI",
      "cohere": "Cohere",
      "perplexity": "Perplexity",
      "deepseek": "DeepSeek",
      "microsoft": "Microsoft",
      "databricks": "Databricks",
      "amazon": "Amazon",
      "qwen": "Qwen",
      "nvidia": "NVIDIA",
    };
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  return (
    <div style={styles.container}>
      {/* Fixed Header */}
      <div style={styles.fixedHeader}>
        <div style={styles.headerContent}>
          <div style={styles.logoContainer}>
            <div style={styles.logo}>
              <LogoIcon />
            </div>
            <h1 style={styles.title}>
              Browseless <span style={styles.titleLight}>Settings</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={styles.scrollContent}>
        <div style={styles.content}>
          {/* API Key Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>
                <KeyIcon />
              </div>
              <div>
                <h2 style={styles.sectionTitle}>API Key</h2>
                <p style={styles.sectionDescription}>Your OpenRouter API key for accessing AI models</p>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <div style={styles.inputWrapper}>
                <input
                  type={showApiKey ? "text" : "password"}
                  style={{
                    ...styles.input,
                    ...(errors.apiKey ? styles.inputError : {}),
                  }}
                  placeholder="sk-or-v1-..."
                  value={config.apiKey}
                  onChange={(e) => handleChange("apiKey", e.target.value)}
                />
                <button
                  style={styles.toggleButton}
                  onClick={() => setShowApiKey(!showApiKey)}
                  type="button"
                >
                  {showApiKey ? "Hide" : "Show"}
                </button>
              </div>
              {errors.apiKey && <span style={styles.errorText}>{errors.apiKey}</span>}
            </div>

            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.link}
            >
              Get your API key at openrouter.ai
            </a>
          </div>

          {/* Agent Models Section */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <div style={styles.sectionIcon}>
                <BrainIcon />
              </div>
              <div>
                <h2 style={styles.sectionTitle}>Agent Models</h2>
                <p style={styles.sectionDescription}>Assign different AI models to each agent</p>
              </div>
            </div>

            <div style={styles.agentList}>
              {agentConfig.map((agent) => (
                <div key={agent.id} style={styles.agentCard}>
                  <button
                    style={styles.agentHeader}
                    onClick={() => toggleAgent(agent.id)}
                    type="button"
                  >
                    <div style={styles.agentInfo}>
                      <div style={styles.agentIcon}>{agent.icon}</div>
                      <div>
                        <div style={styles.agentName}>
                          {agent.name}
                          {agent.requiresVision && <VisionIcon />}
                        </div>
                        <div style={styles.agentDescription}>{agent.description}</div>
                      </div>
                    </div>
                    <div style={{
                      ...styles.chevron,
                      transform: expandedAgent === agent.id ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}>
                      <ChevronDownIcon />
                    </div>
                  </button>

                  {expandedAgent === agent.id && (
                    <div style={styles.agentBody}>
                      {agent.requiresVision && (
                        <div style={styles.visionNote}>
                          <VisionIcon />
                          <span>This agent benefits from vision-capable models</span>
                        </div>
                      )}

                      {/* Model selector */}
                      <div style={styles.modelSelector}>
                        {loadingModels ? (
                          <div style={styles.loadingText}>Loading models...</div>
                        ) : modelError ? (
                          <div style={styles.errorText}>{modelError}</div>
                        ) : (
                          <select
                            style={{
                              ...styles.select,
                              ...(recentlySelected[agent.id] ? styles.selectGlow : {}),
                              ...(errors[agent.id] ? styles.selectError : {}),
                            }}
                            value={config[agent.id as keyof typeof config]}
                            onChange={(e) => handleModelSelect(agent.id, e.target.value)}
                          >
                            <option value="">Select a model...</option>
                            {getSortedProviders().map((provider) => (
                              <optgroup key={provider} label={formatProviderName(provider)}>
                                {groupedModels[provider].map((model) => (
                                  <option key={model.id} value={model.id}>
                                    {model.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        )}
                        {errors[agent.id] && <span style={styles.errorText}>{errors[agent.id]}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <button
            style={{
              ...styles.saveButton,
              ...(saved ? styles.saveButtonSuccess : {}),
            }}
            onClick={handleSave}
            type="button"
          >
            {saved ? (
              <>
                <CheckIcon />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F9F7F3',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    WebkitFontSmoothing: 'antialiased',
  },
  fixedHeader: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #E8E4DE',
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '672px',
    margin: '0 auto',
    padding: '12px 24px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logo: {
    width: '32px',
    height: '32px',
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontSize: '18px',
    fontWeight: '500',
    color: '#1A1915',
    margin: 0,
    letterSpacing: '-0.3px',
  },
  titleLight: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: '300',
    color: '#9A948D',
  },
  scrollContent: {
    paddingTop: '72px',
  },
  content: {
    maxWidth: '672px',
    margin: '0 auto',
    padding: '24px 24px 32px',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    border: '1px solid #E8E4DE',
    boxShadow: '0 1px 2px rgba(26, 25, 21, 0.04)',
  },
  sectionHeader: {
    display: 'flex',
    gap: '14px',
    marginBottom: '20px',
  },
  sectionIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#DA7756',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1A1915',
    margin: '0 0 4px 0',
  },
  sectionDescription: {
    fontSize: '13px',
    color: '#6B6560',
    margin: 0,
  },
  inputGroup: {
    marginBottom: '16px',
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '2px solid #E8E4DE',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    color: '#1A1915',
    outline: 'none',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
    boxSizing: 'border-box' as const,
  },
  inputError: {
    borderColor: '#E53935',
  },
  toggleButton: {
    position: 'absolute' as const,
    right: '12px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#6B6560',
    backgroundColor: '#F0EDE8',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 150ms ease',
  },
  errorText: {
    display: 'block',
    fontSize: '12px',
    color: '#E53935',
    marginTop: '6px',
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#DA7756',
    textDecoration: 'none',
    fontWeight: '500',
  },
  agentList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  agentCard: {
    border: '1px solid #E8E4DE',
    borderRadius: '12px',
    overflow: 'hidden',
    backgroundColor: '#FAFAF8',
  },
  agentHeader: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  agentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  agentIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#DA7756',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
  },
  agentName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1A1915',
    marginBottom: '2px',
    display: 'flex',
    alignItems: 'center',
  },
  agentDescription: {
    fontSize: '12px',
    color: '#6B6560',
  },
  chevron: {
    width: '20px',
    height: '20px',
    color: '#9A948D',
    transition: 'transform 200ms ease',
  },
  agentBody: {
    padding: '0 16px 16px',
  },
  visionNote: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#DA7756',
    marginBottom: '12px',
    padding: '6px 10px',
    backgroundColor: '#FFF8F6',
    borderRadius: '6px',
  },
  modelSelector: {
    marginTop: '0',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '2px solid #E8E4DE',
    borderRadius: '10px',
    backgroundColor: '#FFFFFF',
    color: '#1A1915',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 200ms ease, box-shadow 200ms ease',
  },
  selectGlow: {
    borderColor: '#DA7756',
    boxShadow: '0 0 0 3px rgba(218, 119, 86, 0.2)',
  },
  selectError: {
    borderColor: '#E53935',
  },
  loadingText: {
    fontSize: '12px',
    color: '#9A948D',
    padding: '8px 0',
  },
  saveButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: '#DA7756',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 150ms ease, transform 150ms ease',
  },
  saveButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <OptionsPage />
  </React.StrictMode>
);
