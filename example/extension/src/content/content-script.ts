import { BrowserAutomation } from "./browser-automation";
import { PersonaTraits } from "./keyboard-emulator";
import { SignupDetector } from "./signup-detector";
import { KeyboardEmulator } from "./keyboard-emulator";

let automation: BrowserAutomation;
let isSimulationActive = false;
let signupDetector: SignupDetector;

function initializeAutomation(traits?: Partial<PersonaTraits>): void {
  automation = new BrowserAutomation(traits);
}

initializeAutomation();
signupDetector = new SignupDetector();

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
  } else if (message.type === "detectSignup") {
    const detection = signupDetector.detectSignupPage();
    sendResponse(detection);
  } else if (message.type === "scanInbox") {
    handleScanInbox(message.data).then((result) => {
      sendResponse(result);
    });
    return true;
  } else if (message.type === "openEmail") {
    handleOpenEmail(message.data);
    sendResponse({ success: true });
  } else if (message.type === "getEmailContent") {
    const content = getEmailContent();
    sendResponse(content);
  } else if (message.type === "fillVerificationCode") {
    handleFillVerificationCode(message.data);
    sendResponse({ success: true });
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

async function handleScanInbox(data: any): Promise<any> {
  const { domain } = data;

  const emailList = document.querySelectorAll('[data-testid="message-item"], .item-container, .message-list-item, .thread-item');

  for (const emailItem of Array.from(emailList)) {
    const sender = emailItem.textContent || '';

    if (sender.toLowerCase().includes(domain.toLowerCase())) {
      const isUnread = emailItem.classList.contains('unread') ||
                      emailItem.querySelector('.unread') !== null ||
                      emailItem.getAttribute('data-read') === 'false';

      if (isUnread) {
        console.log(`Found unread email from ${domain}`);

        const clickable = emailItem as HTMLElement;
        clickable.click();

        await new Promise(resolve => setTimeout(resolve, 2000));

        const content = getEmailContent();

        const codeMatch = content.match(/\b\d{6}\b/);
        if (codeMatch) {
          return { type: 'code', value: codeMatch[0], domain };
        }

        const linkMatch = content.match(/(https?:\/\/[^\s]+(?:verify|confirm)[^\s]*)/i);
        if (linkMatch) {
          return { type: 'link', value: linkMatch[1], domain };
        }
      }
    }
  }

  return null;
}

async function handleOpenEmail(data: any): Promise<void> {
  const { selector } = data;
  const emailElement = document.querySelector(selector) as HTMLElement;

  if (emailElement) {
    emailElement.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

function getEmailContent(): string {
  const contentSelectors = [
    '.message-content',
    '[data-testid="message-content"]',
    '.email-body',
    '.mail-body',
    'iframe[title*="message"]',
  ];

  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      if (element.tagName === 'IFRAME') {
        const iframe = element as HTMLIFrameElement;
        try {
          return iframe.contentDocument?.body.innerText || '';
        } catch (e) {
          console.log('Cannot access iframe content');
        }
      } else {
        return element.textContent || '';
      }
    }
  }

  return document.body.innerText;
}

async function handleFillVerificationCode(data: any): Promise<void> {
  const { code } = data;

  await new Promise(resolve => setTimeout(resolve, 500));

  const codeInput = signupDetector.findVerificationCodeInput();

  if (codeInput) {
    console.log(`Filling verification code: ${code}`);

    const keyboard = new KeyboardEmulator({ typingSpeed: 'normal', errorRate: 0.02 });
    await keyboard.typeText(codeInput, code);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const submitButton = document.querySelector(
      'button[type="submit"], input[type="submit"], button[class*="submit"], button[class*="verify"], button[class*="confirm"]'
    ) as HTMLElement;

    if (submitButton) {
      submitButton.click();
    }
  } else {
    console.log('No verification code input found');
  }
}

window.addEventListener('load', () => {
  console.log('PersonaSurfer content script loaded with hyper-realistic input simulation');

  chrome.storage.local.get(['emailAutoVerifyEnabled'], (result) => {
    if (result.emailAutoVerifyEnabled) {
      const detection = signupDetector.detectSignupPage();

      if (detection.isSignupPage && detection.hasEmailField) {
        console.log('Signup page detected, monitoring for verification');

        signupDetector.observeSignupSubmit(() => {
          chrome.runtime.sendMessage({
            type: 'signupSubmitted',
            data: { domain: detection.domain },
          });
        });
      }

      const isVerificationPage = signupDetector.detectVerificationPage();
      if (isVerificationPage) {
        console.log('Verification page detected');
        chrome.runtime.sendMessage({
          type: 'verificationPageDetected',
          data: { domain: detection.domain },
        });
      }
    }
  });
});
