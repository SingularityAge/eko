import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Form, Input, Button, message, Card, AutoComplete } from "antd";

const OptionsPage = () => {
  const [form] = Form.useForm();

  const [config, setConfig] = useState({
    llm: "openrouter",
    apiKey: "",
    modelName: "anthropic/claude-sonnet-4.5",
    options: {
      baseURL: "https://openrouter.ai/api/v1",
    },
  });

  useEffect(() => {
    chrome.storage.sync.get(["llmConfig"], (result) => {
      if (result.llmConfig) {
        const llmConfig = result.llmConfig;
        llmConfig.llm = "openrouter";
        llmConfig.options = llmConfig.options || {};
        llmConfig.options.baseURL = "https://openrouter.ai/api/v1";

        setConfig(llmConfig);
        form.setFieldsValue(llmConfig);
      }
    });
  }, []);

  const handleSave = () => {
    form
      .validateFields()
      .then((values) => {
        const configToSave = {
          ...values,
          llm: "openrouter",
          options: {
            baseURL: "https://openrouter.ai/api/v1",
          },
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
        message.error("Please check the form field");
      });
  };

  const modelOptions = [
    { value: "anthropic/claude-sonnet-4.5", label: "claude-sonnet-4.5 (default)" },
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

  return (
    <div className="p-6 max-w-xl mx-auto">
      <Card title="OpenRouter Configuration" className="shadow-md">
        <Form form={form} layout="vertical" initialValues={config}>
          <Form.Item
            name="modelName"
            label="Model Name"
            rules={[
              {
                required: true,
                message: "Please select a model",
              },
            ]}
          >
            <AutoComplete
              placeholder="Select or type model name"
              options={modelOptions}
              filterOption={(inputValue, option) =>
                (option?.value as string).toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </Form.Item>

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
