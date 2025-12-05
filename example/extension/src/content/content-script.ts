import { BrowserAutomation } from "./browser-automation";
import { PersonaTraits } from "./keyboard-emulator";

let automation: BrowserAutomation;
let isSimulationActive = false;

function initializeAutomation(traits?: Partial<PersonaTraits>): void {
  automation = new BrowserAutomation(traits);
}

initializeAutomation();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "initializePersona") {
    initializeAutomation(message.data.traits);
    sendResponse({ success: true });
  } else if (message.type === "startBrowsing") {
    handleStartBrowsing(message.data);
    sendResponse({ success: true });
  } else if (message.type === "stopBrowsing") {
    handleStopBrowsing();
    sendResponse({ success: true });
  } else if (message.type === "loginEmail") {
    handleEmailLogin(message.data);
    sendResponse({ success: true });
  } else if (message.type === "performSearch") {
    handleSearch(message.data);
    sendResponse({ success: true });
  } else if (message.type === "checkDistraction") {
    handleCheckDistraction().then((url) => {
      sendResponse({ url });
    });
    return true;
  }
  return true;
});

async function handleStartBrowsing(data: any): Promise<void> {
  isSimulationActive = true;
  automation.start();

  const activity = data.activity;
  const duration = data.duration || 30000;

  console.log(`Starting browsing activity: ${activity}`);

  await automation.simulateReading(duration);

  if (Math.random() < 0.3) {
    await automation.scroll(500);
  }
}

function handleStopBrowsing(): void {
  isSimulationActive = false;
  automation.stop();
  console.log('Browsing stopped');
}

async function handleEmailLogin(data: any): Promise<void> {
  const { email, password } = data;

  if (!email || !password) {
    console.log('Email credentials not provided');
    return;
  }

  console.log('Attempting to log into email...');

  await automation.loginToEmail(email, password);
}

async function handleSearch(data: any): Promise<void> {
  const { query } = data;

  if (!query) {
    console.log('No search query provided');
    return;
  }

  console.log(`Performing search: ${query}`);

  await automation.performSearch(query);
}

async function handleCheckDistraction(): Promise<string | null> {
  return await automation.getDistractedAndOpenRelatedTab();
}

if (window.location.hostname.includes('protonmail.com')) {
  chrome.storage.local.get(['autoLoginEmail'], (result) => {
    if (result.autoLoginEmail) {
      console.log('Auto-login triggered for ProtonMail');
    }
  });
}

window.addEventListener('load', () => {
  console.log('PersonaSurfer content script loaded with hyper-realistic input simulation');
});
