import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

// SVG Icons
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

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

// Agent configuration
const agentConfig = [
  {
    id: "plannerModel",
    name: "Planner",
    description: "Plans and breaks down tasks into steps",
    icon: "P",
  },
  {
    id: "chatModel",
    name: "Chat",
    description: "Handles conversation and coordinates agents",
    icon: "C",
  },
  {
    id: "navigatorModel",
    name: "Navigator",
    description: "Controls browser navigation and interactions",
    icon: "N",
  },
  {
    id: "writerModel",
    name: "Writer",
    description: "Writes and saves files to disk",
    icon: "W",
  },
];

const modelSuggestions = [
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5", recommended: true },
  { value: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { value: "anthropic/claude-3.7-sonnet", label: "Claude 3.7 Sonnet" },
  { value: "google/gemini-3-pro", label: "Gemini 3 Pro" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "openai/gpt-5.1", label: "GPT-5.1" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-4.1", label: "GPT-4.1" },
  { value: "openai/o4-mini", label: "O4 Mini" },
  { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { value: "x-ai/grok-4", label: "Grok 4" },
  { value: "x-ai/grok-4-fast", label: "Grok 4 Fast" },
];

const OptionsPage = () => {
  const defaultModel = "anthropic/claude-sonnet-4.5";

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

  const handleChange = (field: string, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
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

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoContainer}>
            <div style={styles.logo}>
              <LogoIcon />
            </div>
            <div>
              <h1 style={styles.title}>Browseless</h1>
              <p style={styles.subtitle}>Settings</p>
            </div>
          </div>
        </div>

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
            <span>Get your API key at openrouter.ai</span>
            <ExternalLinkIcon />
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
                      <div style={styles.agentName}>{agent.name}</div>
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
                    <input
                      type="text"
                      style={{
                        ...styles.input,
                        ...(errors[agent.id] ? styles.inputError : {}),
                      }}
                      placeholder="e.g., anthropic/claude-sonnet-4.5"
                      value={config[agent.id as keyof typeof config]}
                      onChange={(e) => handleChange(agent.id, e.target.value)}
                    />
                    {errors[agent.id] && <span style={styles.errorText}>{errors[agent.id]}</span>}

                    <div style={styles.suggestions}>
                      <span style={styles.suggestionsLabel}>Quick select:</span>
                      <div style={styles.suggestionTags}>
                        {modelSuggestions.slice(0, 5).map((model) => (
                          <button
                            key={model.value}
                            style={{
                              ...styles.suggestionTag,
                              ...(config[agent.id as keyof typeof config] === model.value ? styles.suggestionTagActive : {}),
                            }}
                            onClick={() => handleChange(agent.id, model.value)}
                            type="button"
                          >
                            {model.label}
                            {model.recommended && <span style={styles.recommendedBadge}>Recommended</span>}
                          </button>
                        ))}
                      </div>
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
  content: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  header: {
    marginBottom: '32px',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  logo: {
    width: '48px',
    height: '48px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#1A1915',
    margin: '0 0 2px 0',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6B6560',
    margin: 0,
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
    backgroundColor: '#F0EDE8',
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
  suggestions: {
    marginTop: '12px',
  },
  suggestionsLabel: {
    fontSize: '11px',
    fontWeight: '500',
    color: '#9A948D',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '8px',
  },
  suggestionTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
  },
  suggestionTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#6B6560',
    backgroundColor: '#F0EDE8',
    border: '1px solid transparent',
    borderRadius: '100px',
    cursor: 'pointer',
    transition: 'all 150ms ease',
  },
  suggestionTagActive: {
    backgroundColor: '#DA7756',
    color: '#FFFFFF',
  },
  recommendedBadge: {
    fontSize: '10px',
    fontWeight: '600',
    color: '#DA7756',
    backgroundColor: '#FFF5F2',
    padding: '2px 6px',
    borderRadius: '4px',
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
