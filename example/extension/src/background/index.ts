import {
  LLMs,
  global,
  uuidv4,
  ChatAgent,
  AgentContext,
  AgentStreamMessage,
} from "@eko-ai/eko";
import {
  HumanCallback,
  MessageTextPart,
  MessageFilePart,
  ChatStreamMessage,
  AgentStreamCallback,
} from "@eko-ai/eko/types";
import { initAgentServices } from "./agent";
import WriteFileAgent from "./agent/file-agent";
import { BrowserAgent } from "@eko-ai/eko-extension";
import { PersonaEngine, PersonaData } from "./persona-engine";

var chatAgent: ChatAgent | null = null;
const humanCallbackIdMap = new Map<string, Function>();
const abortControllers = new Map<string, AbortController>();

let personaEngine: PersonaEngine | null = null;
let simulationInterval: number | null = null;
let isSimulationRunning = false;

// Chat callback
const chatCallback = {
  onMessage: async (message: ChatStreamMessage) => {
    chrome.runtime.sendMessage({
      type: "chat_callback",
      data: message,
    });
    console.log("chat message: ", JSON.stringify(message, null, 2));
  },
};

// Task agent callback
const taskCallback: AgentStreamCallback & HumanCallback = {
  onMessage: async (message: AgentStreamMessage) => {
    chrome.runtime.sendMessage({
      type: "task_callback",
      data: { ...message, messageId: message.taskId },
    });
    console.log("task message: ", JSON.stringify(message, null, 2));
  },
  onHumanConfirm: async (context: AgentContext, prompt: string) => {
    const callbackId = uuidv4();
    chrome.runtime.sendMessage({
      type: "task_callback",
      data: {
        streamType: "agent",
        chatId: context.context.chatId,
        taskId: context.context.taskId,
        agentName: context.agent.Name,
        nodeId: context.agentChain.agent.id,
        messageId: context.context.taskId,
        type: "human_confirm",
        callbackId: callbackId,
        prompt: prompt,
      },
    });
    console.log("human_confirm: ", prompt);
    return new Promise((resolve) => {
      humanCallbackIdMap.set(callbackId, (value: boolean) => {
        humanCallbackIdMap.delete(callbackId);
        resolve(value);
      });
    });
  },
  onHumanInput: async (context: AgentContext, prompt: string) => {
    const callbackId = uuidv4();
    chrome.runtime.sendMessage({
      type: "task_callback",
      data: {
        streamType: "agent",
        chatId: context.context.chatId,
        taskId: context.context.taskId,
        agentName: context.agent.Name,
        nodeId: context.agentChain.agent.id,
        messageId: context.context.taskId,
        type: "human_input",
        callbackId: callbackId,
        prompt: prompt,
      },
    });
    console.log("human_input: ", prompt);
    return new Promise((resolve) => {
      humanCallbackIdMap.set(callbackId, (value: string) => {
        humanCallbackIdMap.delete(callbackId);
        resolve(value);
      });
    });
  },
  onHumanSelect: async (
    context: AgentContext,
    prompt: string,
    options: string[],
    multiple: boolean
  ) => {
    const callbackId = uuidv4();
    chrome.runtime.sendMessage({
      type: "task_callback",
      data: {
        streamType: "agent",
        chatId: context.context.chatId,
        taskId: context.context.taskId,
        agentName: context.agent.Name,
        nodeId: context.agentChain.agent.id,
        messageId: context.context.taskId,
        type: "human_select",
        callbackId: callbackId,
        prompt: prompt,
        options: options,
        multiple: multiple,
      },
    });
    console.log("human_select: ", prompt);
    return new Promise((resolve) => {
      humanCallbackIdMap.set(callbackId, (value: string[]) => {
        humanCallbackIdMap.delete(callbackId);
        resolve(value);
      });
    });
  },
  onHumanHelp: async (
    context: AgentContext,
    helpType: "request_login" | "request_assistance",
    prompt: string
  ) => {
    const callbackId = uuidv4();
    chrome.runtime.sendMessage({
      type: "task_callback",
      data: {
        streamType: "agent",
        chatId: context.context.chatId,
        taskId: context.context.taskId,
        agentName: context.agent.Name,
        nodeId: context.agentChain.agent.id,
        messageId: context.context.taskId,
        type: "human_help",
        callbackId: callbackId,
        helpType: helpType,
        prompt: prompt,
      },
    });
    console.log("human_help: ", prompt);
    return new Promise((resolve) => {
      humanCallbackIdMap.set(callbackId, (value: boolean) => {
        humanCallbackIdMap.delete(callbackId);
        resolve(value);
      });
    });
  },
};

export async function init(): Promise<ChatAgent | void> {
  const storageKey = "llmConfig";
  const llmConfig = (await chrome.storage.sync.get([storageKey]))[storageKey];
  if (!llmConfig || !llmConfig.apiKey) {
    printLog(
      "Please configure your OpenRouter API key in the extension options.",
      "error"
    );
    setTimeout(() => {
      chrome.runtime.openOptionsPage();
    }, 1000);
    return;
  }

  initAgentServices();

  const llms: LLMs = {
    default: {
      provider: "openrouter",
      model: llmConfig.modelName,
      apiKey: llmConfig.apiKey,
      config: {
        baseURL: "https://openrouter.ai/api/v1",
      },
    },
  };

  const agents = [new BrowserAgent(), new WriteFileAgent()];
  chatAgent = new ChatAgent({ llms, agents });
  chatAgent.initMessages().catch((e) => {
    printLog("init messages error: " + e, "error");
  });

  return chatAgent;
}

// Handle chat request
async function handleChat(requestId: string, data: any): Promise<void> {
  const messageId = data.messageId;

  if (!chatAgent) {
    chrome.runtime.sendMessage({
      requestId,
      type: "chat_result",
      data: { messageId, error: "ChatAgent not initialized" },
    });
    return;
  }

  const user = data.user as (MessageTextPart | MessageFilePart)[];
  const abortController = new AbortController();
  abortControllers.set(messageId, abortController);

  try {
    const result = await chatAgent.chat({
      user: user,
      messageId,
      callback: {
        chatCallback,
        taskCallback,
      },
      signal: abortController.signal,
    });
    chrome.runtime.sendMessage({
      requestId,
      type: "chat_result",
      data: { messageId, result },
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      requestId,
      type: "chat_result",
      data: { messageId, error: String(error) },
    });
  }
}

// Handle human callback request
async function handleHumanCallback(
  requestId: string,
  data: any
): Promise<void> {
  const callbackId = data.callbackId as string;
  const value = data.value as any;
  const callback = humanCallbackIdMap.get(callbackId);
  if (callback) {
    callback(value);
  }
  chrome.runtime.sendMessage({
    requestId,
    type: "human_callback_result",
    data: { callbackId, success: callback != null },
  });
}

// Handle upload file request
async function handleUploadFile(requestId: string, data: any): Promise<void> {
  if (!chatAgent) {
    chrome.runtime.sendMessage({
      requestId,
      type: "uploadFile_result",
      data: { error: "ChatAgent not initialized" },
    });
    return;
  }

  const base64Data = data.base64Data as string;
  const mimeType = data.mimeType as string;
  const filename = data.filename as string;

  try {
    const { fileId, url } = await global.chatService.uploadFile(
      { base64Data, mimeType, filename },
      chatAgent.getChatContext().getChatId()
    );
    chrome.runtime.sendMessage({
      requestId,
      type: "uploadFile_result",
      data: { fileId, url },
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      requestId,
      type: "uploadFile_result",
      data: { error: error + "" },
    });
  }
}

// Handle stop request
async function handleStop(requestId: string, data: any): Promise<void> {
  const abortController = abortControllers.get(data.messageId);
  if (abortController) {
    abortController.abort("User aborted");
    abortControllers.delete(data.messageId);
  }
}

// Handle clear messages request
async function handleClearMessages(requestId: string, data: any): Promise<void> {
  if (chatAgent) {
    chatAgent.getMemory().clear();
  }
}

// Handle get tabs request
async function handleGetTabs(requestId: string, data: any): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({});
    const sortedTabs = tabs
      .sort((a, b) => {
        const aTime = (a as any).lastAccessed || 0;
        const bTime = (b as any).lastAccessed || 0;
        return bTime - aTime;
      })
      .filter((tab) => !tab.url?.startsWith("chrome://"))
      .map((tab) => {
        const lastAccessed = (tab as any).lastAccessed;
        return {
          tabId: String(tab.id),
          title: tab.title || "",
          url: tab.url || "",
          active: tab.active,
          status: tab.status,
          favicon: tab.favIconUrl,
          lastAccessed: lastAccessed
            ? new Date(lastAccessed).toLocaleString()
            : "",
        };
      })
      .slice(0, 15);

    chrome.runtime.sendMessage({
      requestId,
      type: "getTabs_result",
      data: { tabs: sortedTabs },
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      requestId,
      type: "getTabs_result",
      data: { error: String(error) },
    });
  }
}

// Handle start simulation
async function handleStartSimulation(requestId: string, data: any): Promise<void> {
  try {
    const personaData = data.persona as PersonaData;

    if (!personaData) {
      throw new Error("No persona data provided");
    }

    personaEngine = new PersonaEngine();
    personaEngine.loadPersona(personaData);

    await chrome.storage.local.set({
      persona: personaData,
      isSimulationRunning: true,
    });

    isSimulationRunning = true;
    startSimulationLoop();

    printLog("Simulation started", "success");
    chrome.runtime.sendMessage({
      requestId,
      type: "startSimulation_result",
      data: { success: true },
    });
  } catch (error) {
    printLog("Failed to start simulation: " + error, "error");
    chrome.runtime.sendMessage({
      requestId,
      type: "startSimulation_result",
      data: { error: String(error) },
    });
  }
}

// Handle pause simulation
async function handlePauseSimulation(requestId: string, data: any): Promise<void> {
  try {
    isSimulationRunning = false;
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }

    await chrome.storage.local.set({ isSimulationRunning: false });

    printLog("Simulation paused", "info");
    chrome.runtime.sendMessage({
      requestId,
      type: "pauseSimulation_result",
      data: { success: true },
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      requestId,
      type: "pauseSimulation_result",
      data: { error: String(error) },
    });
  }
}

// Start simulation loop
function startSimulationLoop(): void {
  if (simulationInterval) {
    clearInterval(simulationInterval);
  }

  let emailLoginAttempted = false;

  simulationInterval = setInterval(async () => {
    if (!isSimulationRunning || !personaEngine) {
      return;
    }

    try {
      const activity = personaEngine.getCurrentActivity();
      const randomSite = personaEngine.getRandomSite();
      const brain = personaEngine.getBrain();

      personaEngine.updateEnergyLevel();

      if (activity?.activity === "sleep") {
        printLog("Persona is sleeping", "info");
        chrome.runtime.sendMessage({
          type: "simulation_status",
          data: {
            status: "sleeping",
            site: "N/A",
            activity: activity.activity,
            energy: brain?.state.energyLevel || 0,
          },
        });
        return;
      }

      if (activity?.activity.includes("bathroom") || activity?.activity.includes("meal")) {
        printLog(`Persona is on ${activity.activity}`, "info");
        chrome.runtime.sendMessage({
          type: "simulation_status",
          data: {
            status: "break",
            site: "N/A",
            activity: activity.activity,
            energy: brain?.state.energyLevel || 0,
          },
        });
        await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
        return;
      }

      if (personaEngine.shouldTakeBreak()) {
        printLog("Persona is taking a break due to low energy", "info");
        await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000));
        return;
      }

      if (!emailLoginAttempted && brain?.email.credentials.pass) {
        emailLoginAttempted = true;
        await attemptEmailLogin();
      }

      const tabs = await chrome.tabs.query({ currentWindow: true });

      if (tabs.length < 3 || Math.random() < 0.3) {
        const newTab = await chrome.tabs.create({ url: randomSite, active: false });
        printLog(`Opening ${randomSite}`, "info");

        if (newTab.id) {
          setTimeout(async () => {
            try {
              await chrome.tabs.sendMessage(newTab.id!, {
                type: "startBrowsing",
                data: {
                  activity: activity?.activity,
                  duration: Math.random() * 50000 + 10000,
                },
              });
            } catch (e) {
              console.log("Content script not ready yet");
            }
          }, 2000);
        }

        chrome.runtime.sendMessage({
          type: "simulation_status",
          data: {
            status: "browsing",
            site: randomSite,
            activity: activity?.activity,
            energy: brain?.state.energyLevel || 0,
          },
        });
      }

      if (Math.random() < 0.2 && tabs.length > 0) {
        const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
        if (randomTab.id) {
          try {
            const response = await chrome.tabs.sendMessage(randomTab.id, {
              type: "checkDistraction",
            });

            if (response?.url) {
              await chrome.tabs.create({ url: response.url, active: false });
              printLog(`Got distracted, opening ${response.url}`, "info");
            }
          } catch (e) {
            console.log("Tab not responding to distraction check");
          }
        }
      }
    } catch (error) {
      console.error("Simulation loop error:", error);
    }
  }, Math.random() * 4000 + 1000);
}

async function attemptEmailLogin(): Promise<void> {
  if (!personaEngine) return;

  const brain = personaEngine.getBrain();
  if (!brain?.email.credentials.pass) return;

  printLog("Attempting to log into ProtonMail", "info");

  const emailTab = await chrome.tabs.create({
    url: "https://account.proton.me/login",
    active: false,
  });

  if (emailTab.id) {
    setTimeout(async () => {
      try {
        await chrome.tabs.sendMessage(emailTab.id!, {
          type: "loginEmail",
          data: {
            email: brain.email.address,
            password: brain.email.credentials.pass,
          },
        });
        printLog("Email login attempted", "success");
      } catch (e) {
        console.log("Email login failed:", e);
      }
    }, 5000);
  }
}

// Get simulation status
async function handleGetSimulationStatus(requestId: string, data: any): Promise<void> {
  try {
    const storage = await chrome.storage.local.get(["persona", "isSimulationRunning"]);

    const status = {
      isRunning: storage.isSimulationRunning || false,
      persona: storage.persona || null,
      currentActivity: personaEngine?.getCurrentActivity(),
      brain: personaEngine?.getBrain(),
    };

    chrome.runtime.sendMessage({
      requestId,
      type: "getSimulationStatus_result",
      data: status,
    });
  } catch (error) {
    chrome.runtime.sendMessage({
      requestId,
      type: "getSimulationStatus_result",
      data: { error: String(error) },
    });
  }
}

// Event routing mapping
const eventHandlers: Record<
  string,
  (requestId: string, data: any) => Promise<void>
> = {
  chat: handleChat,
  human_callback: handleHumanCallback,
  uploadFile: handleUploadFile,
  stop: handleStop,
  clear_messages: handleClearMessages,
  getTabs: handleGetTabs,
  startSimulation: handleStartSimulation,
  pauseSimulation: handlePauseSimulation,
  getSimulationStatus: handleGetSimulationStatus,
};

// Message listener
chrome.runtime.onMessage.addListener(async function (
  request,
  sender,
  sendResponse
) {
  const requestId = request.requestId;
  const type = request.type;
  const data = request.data;

  if (!chatAgent) {
    await init();
  }

  const handler = eventHandlers[type];
  if (handler) {
    handler(requestId, data).catch((error) => {
      printLog(`Error handling ${type}: ${error}`, "error");
    });
  }
});

function printLog(message: string, level?: "info" | "success" | "error") {
  chrome.runtime.sendMessage({
    type: "log",
    data: {
      level: level || "info",
      message: message + "",
    },
  });
}

if ((chrome as any).sidePanel) {
  // open panel on action click
  (chrome as any).sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
}
