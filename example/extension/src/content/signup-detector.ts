export interface SignupDetection {
  isSignupPage: boolean;
  hasEmailField: boolean;
  hasPasswordField: boolean;
  hasSubmitButton: boolean;
  domain: string;
}

export class SignupDetector {
  private signupKeywords = [
    'sign up', 'signup', 'register', 'create account', 'join',
    'get started', 'create', 'new account'
  ];

  private verificationKeywords = [
    'verify', 'verification', 'confirm', 'code', 'enter code',
    'check your email', 'confirmation code'
  ];

  constructor() {}

  detectSignupPage(): SignupDetection {
    const domain = window.location.hostname;
    const pageText = document.body.innerText.toLowerCase();

    const isSignupPage = this.signupKeywords.some(keyword =>
      pageText.includes(keyword)
    );

    const emailInputs = document.querySelectorAll(
      'input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="email"]'
    );

    const passwordInputs = document.querySelectorAll(
      'input[type="password"]'
    );

    const submitButtons = document.querySelectorAll(
      'button[type="submit"], input[type="submit"], button[class*="submit"], button[class*="signup"], button[class*="register"]'
    );

    return {
      isSignupPage,
      hasEmailField: emailInputs.length > 0,
      hasPasswordField: passwordInputs.length > 0,
      hasSubmitButton: submitButtons.length > 0,
      domain: this.extractBaseDomain(domain),
    };
  }

  detectVerificationPage(): boolean {
    const pageText = document.body.innerText.toLowerCase();

    return this.verificationKeywords.some(keyword =>
      pageText.includes(keyword)
    );
  }

  findVerificationCodeInput(): HTMLInputElement | null {
    const codeInputs = document.querySelectorAll(
      'input[name*="code"], input[id*="code"], input[placeholder*="code"], input[type="text"]'
    ) as NodeListOf<HTMLInputElement>;

    for (const input of codeInputs) {
      const label = this.getInputLabel(input);
      if (label && /code|verify|confirm/i.test(label)) {
        return input;
      }
    }

    if (codeInputs.length === 1) {
      return codeInputs[0];
    }

    return null;
  }

  private getInputLabel(input: HTMLInputElement): string | null {
    if (input.labels && input.labels.length > 0) {
      return input.labels[0].innerText;
    }

    const labelFor = document.querySelector(`label[for="${input.id}"]`);
    if (labelFor) {
      return labelFor.textContent;
    }

    const parent = input.parentElement;
    if (parent) {
      const label = parent.querySelector('label');
      if (label) {
        return label.textContent;
      }
    }

    return input.placeholder || input.name || null;
  }

  private extractBaseDomain(hostname: string): string {
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    }
    return hostname;
  }

  observeSignupSubmit(callback: () => void): void {
    const forms = document.querySelectorAll('form');

    forms.forEach(form => {
      form.addEventListener('submit', (e) => {
        const detection = this.detectSignupPage();
        if (detection.isSignupPage && detection.hasEmailField) {
          console.log('Signup form submitted, may need email verification');
          callback();
        }
      });
    });

    const submitButtons = document.querySelectorAll(
      'button[type="submit"], input[type="submit"], button[class*="signup"], button[class*="register"]'
    );

    submitButtons.forEach(button => {
      button.addEventListener('click', () => {
        const detection = this.detectSignupPage();
        if (detection.isSignupPage && detection.hasEmailField) {
          console.log('Signup button clicked, may need email verification');
          setTimeout(callback, 2000);
        }
      });
    });
  }
}
