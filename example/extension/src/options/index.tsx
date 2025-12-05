import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Form, Input, Button, message, Card, AutoComplete, Typography, Divider } from "antd";

const { Text } = Typography;

const OptionsPage = () => {
  const [form] = Form.useForm();

  const defaultModel = "anthropic/claude-sonnet-4.5";

  const [config, setConfig] = useState({
    apiKey: "",
    plannerModel: defaultModel,
    chatModel: defaultModel,
    navigatorModel: defaultModel,
    writerModel: defaultModel,
  });

  useEffect(() => {
    chrome.storage.sync.get(["llmConfig"], (result) => {
      if (result.llmConfig) {
        const llmConfig = result.llmConfig;
        const newConfig = {
          apiKey: llmConfig.apiKey || "",
          plannerModel: llmConfig.plannerModel || llmConfig.modelName || defaultModel,
          chatModel: llmConfig.chatModel || llmConfig.modelName || defaultModel,
          navigatorModel: llmConfig.navigatorModel || llmConfig.modelName || defaultModel,
          writerModel: llmConfig.writerModel || llmConfig.modelName || defaultModel,
        };
        setConfig(newConfig);
        form.setFieldsValue(newConfig);
      }
    });
  }, []);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        const configToSave = {
          apiKey: values.apiKey,
          plannerModel: values.plannerModel,
          chatModel: values.chatModel,
          navigatorModel: values.navigatorModel,
          writerModel: values.writerModel,
        };
        setConfig(configToSave);
        chrome.storage.sync.set(
          {
            llmConfig: configToSave,
          },
          () => {
            message.success("Save Success!");
          }
        );
      })
      .catch(() => {
        message.error("Please check the form fields");
      });
  };

  const modelOptions = [
    { value: "anthropic/claude-sonnet-4.5", label: "claude-sonnet-4.5 (recommended)" },
    { value: "anthropic/claude-sonnet-4", label: "claude-sonnet-4" },
    { value: "anthropic/claude-3.7-sonnet", label: "claude-3.7-sonnet" },
    { value: "google/gemini-3-pro", label: "gemini-3-pro" },
    { value: "google/gemini-2.5-pro", label: "gemini-2.5-pro" },
    { value: "openai/gpt-5.1", label: "gpt-5.1" },
    { value: "openai/gpt-5", label: "gpt-5" },
    { value: "openai/gpt-5-mini", label: "gpt-5-mini" },
    { value: "openai/gpt-4.1", label: "gpt-4.1" },
    { value: "openai/o4-mini", label: "o4-mini" },
    { value: "openai/gpt-4.1-mini", label: "gpt-4.1-mini" },
    { value: "x-ai/grok-4", label: "grok-4" },
    { value: "x-ai/grok-4-fast", label: "grok-4-fast" },
  ];

  const agentFields = [
    {
      name: "plannerModel",
      label: "Planner",
      description: "Plans and breaks down tasks into steps",
    },
    {
      name: "chatModel",
      label: "Chat",
      description: "Handles conversation and coordinates agents",
    },
    {
      name: "navigatorModel",
      label: "Navigator",
      description: "Controls browser navigation and interactions",
    },
    {
      name: "writerModel",
      label: "Writer",
      description: "Writes and saves files to disk",
    },
  ];

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card title="OpenRouter Configuration" className="shadow-md">
        <Form form={form} layout="vertical" initialValues={config}>
          <Form.Item
            name="apiKey"
            label="OpenRouter API Key"
            rules={[
              {
                required: true,
                message: "Please enter your OpenRouter API Key",
              },
            ]}
          >
            <Input.Password placeholder="sk-or-v1-..." allowClear />
          </Form.Item>

          <Divider orientation="left">Agent Models</Divider>
          <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
            Assign a different AI model to each agent. Use any OpenRouter model name.
          </Text>

          {agentFields.map((agent) => (
            <Form.Item
              key={agent.name}
              name={agent.name}
              label={
                <span>
                  {agent.label} <Text type="secondary" style={{ fontWeight: "normal", fontSize: 12 }}>— {agent.description}</Text>
                </span>
              }
              rules={[
                {
                  required: true,
                  message: `Please specify a model for ${agent.label}`,
                },
              ]}
            >
              <AutoComplete
                placeholder="e.g. anthropic/claude-sonnet-4.5"
                options={modelOptions}
                filterOption={(inputValue, option) =>
                  (option?.value as string).toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                }
              />
            </Form.Item>
          ))}

          <Form.Item>
            <Button type="primary" onClick={handleSave} block>
              Save
            </Button>
          </Form.Item>
        </Form>
        <div style={{ marginTop: "16px", fontSize: "12px", color: "#666" }}>
          Get your API key at{" "}
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer">
            openrouter.ai/keys
          </a>
        </div>
      </Card>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);

root.render(
  <React.StrictMode>
    <OptionsPage />
  </React.StrictMode>
);
