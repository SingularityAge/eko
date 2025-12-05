import { BrowserAutomation } from "./browser-automation";

const automation = new BrowserAutomation();
let isSimulationActive = false;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "startBrowsing") {
    handleStartBrowsing(message.data);
    sendResponse({ success: true });
  } else if (message.type === "stopBrowsing") {
    handleStopBrowsing();
    sendResponse({ success: true });
  } else if (message.type === "loginEmail") {
    handleEmailLogin(message.data);
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
