// ============================================
// Email Agent
// Handles webpage-based email login and management
// ============================================

import { BaseAgent, createBrowserTools } from './base-agent';
import { OpenRouterService } from '../services/openrouter';
import { Tool, EmailConfig, EMAIL_PROVIDERS } from '../shared/types';

export class EmailAgent extends BaseAgent {
  private emailConfig: EmailConfig | null = null;
  private isLoggedIn: boolean = false;
  private lastCheckTime: number = 0;

  constructor(llm: OpenRouterService, model?: string) {
    super('email', llm, { model });
  }

  setEmailConfig(config: EmailConfig): void {
    this.emailConfig = config;
  }

  getEmailConfig(): EmailConfig | null {
    return this.emailConfig;
  }

  protected getDefaultSystemPrompt(): string {
    return `You are an email management agent that helps check, read, and interact with email through web interfaces.

Your capabilities:
- Log into email accounts via web interface
- Check inbox for new emails
- Read email content
- Compose and send emails
- Search emails
- Manage folders (archive, delete, spam)
- Extract verification codes from emails

Guidelines:
1. Handle login forms carefully - enter credentials accurately
2. Wait for pages to load completely before interacting
3. Look for common email UI patterns (inbox, compose, etc.)
4. Extract important information like verification codes
5. Don't send emails without explicit user confirmation
6. Be careful with sensitive information
7. Report any login issues or captchas

Email Provider Patterns:
- Gmail: Look for inbox rows, email threads, compose button
- Outlook: Look for message list, reading pane
- Yahoo: Similar layout to Gmail
- ProtonMail: Encrypted interface, may have additional security

When extracting verification codes:
- Look for 4-8 digit codes in email body
- Check subject lines for codes
- Look for "verify", "confirm", "code" keywords`;
  }

  protected getDefaultTools(): Tool[] {
    const browserTools = createBrowserTools();

    const emailTools: Tool[] = [
      {
        type: 'function',
        function: {
          name: 'go_to_email',
          description: 'Navigate to the email provider login or inbox page',
          parameters: {
            type: 'object',
            properties: {
              page: {
                type: 'string',
                enum: ['login', 'inbox', 'compose'],
                description: 'Which email page to navigate to'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'login_email',
          description: 'Log into the email account using stored credentials',
          parameters: {
            type: 'object',
            properties: {
              step: {
                type: 'string',
                enum: ['enter_email', 'enter_password', 'submit', 'auto'],
                description: 'Login step to perform'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_inbox',
          description: 'Check the inbox and list recent emails',
          parameters: {
            type: 'object',
            properties: {
              unread_only: {
                type: 'boolean',
                description: 'Only show unread emails'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of emails to list'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'open_email',
          description: 'Open and read a specific email',
          parameters: {
            type: 'object',
            properties: {
              email_index: {
                type: 'number',
                description: 'Index of the email element to click'
              }
            },
            required: ['email_index']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'extract_verification_code',
          description: 'Look for and extract a verification code from the current email',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_emails',
          description: 'Search for emails matching a query',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (sender, subject, content)'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'compose_email',
          description: 'Start composing a new email',
          parameters: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient email address'
              },
              subject: {
                type: 'string',
                description: 'Email subject'
              },
              body: {
                type: 'string',
                description: 'Email body content'
              }
            },
            required: ['to', 'subject', 'body']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'reply_to_email',
          description: 'Reply to the currently open email',
          parameters: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: 'Reply message content'
              }
            },
            required: ['message']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'archive_email',
          description: 'Archive the current email',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'delete_email',
          description: 'Delete/trash the current email',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'mark_as_read',
          description: 'Mark email as read',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'mark_as_spam',
          description: 'Mark email as spam',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'go_to_folder',
          description: 'Navigate to a specific email folder',
          parameters: {
            type: 'object',
            properties: {
              folder: {
                type: 'string',
                enum: ['inbox', 'sent', 'drafts', 'spam', 'trash', 'starred'],
                description: 'Folder to navigate to'
              }
            },
            required: ['folder']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'wait_for_email',
          description: 'Wait for a new email from a specific sender or with specific subject',
          parameters: {
            type: 'object',
            properties: {
              from: {
                type: 'string',
                description: 'Expected sender email or domain'
              },
              subject_contains: {
                type: 'string',
                description: 'Text the subject should contain'
              },
              timeout_seconds: {
                type: 'number',
                description: 'Maximum time to wait (default 60)'
              }
            }
          }
        }
      }
    ];

    return [...browserTools, ...emailTools];
  }

  protected async executeToolCall(name: string, args: Record<string, any>): Promise<string> {
    // Handle email-specific tools
    if (name === 'go_to_email') {
      return this.goToEmail(args.page || 'inbox');
    }

    if (name === 'login_email') {
      return this.loginEmail(args.step || 'auto');
    }

    if (name === 'extract_verification_code') {
      return this.extractVerificationCode();
    }

    if (name === 'wait_for_email') {
      return this.waitForEmail(args);
    }

    // Log email activities
    if (['open_email', 'compose_email', 'reply_to_email'].includes(name)) {
      this.logActivity({
        type: name === 'open_email' ? 'email_read' : 'email_compose',
        url: this.context.url,
        details: { action: name, args }
      });
    }

    // Use executeTool which handles both direct and message-based execution
    const response = await this.executeTool(name, args);

    return response?.result || 'Action completed';
  }

  private async goToEmail(page: string): Promise<string> {
    if (!this.emailConfig) {
      throw new Error('Email not configured. Please set email credentials in settings.');
    }

    const provider = this.emailConfig.provider;
    const providerUrls = provider !== 'other'
      ? EMAIL_PROVIDERS[provider]
      : {
          loginUrl: this.emailConfig.loginUrl || 'about:blank',
          inboxUrl: this.emailConfig.loginUrl || 'about:blank',
          composeUrl: this.emailConfig.loginUrl || 'about:blank'
        };

    let url: string;
    switch (page) {
      case 'login':
        url = providerUrls.loginUrl;
        break;
      case 'compose':
        url = providerUrls.composeUrl;
        break;
      case 'inbox':
      default:
        url = this.isLoggedIn ? providerUrls.inboxUrl : providerUrls.loginUrl;
        break;
    }

    await this.executeTool('navigate_to', { url });

    this.logActivity({
      type: 'email_check',
      url,
      details: { provider, page }
    });

    return `Navigated to ${provider} ${page}`;
  }

  private async loginEmail(step: string): Promise<string> {
    if (!this.emailConfig) {
      throw new Error('Email not configured');
    }

    const { email, password, provider } = this.emailConfig;

    if (step === 'auto') {
      // Provide guidance for the full login flow
      return `Ready to log in to ${provider}.

Email: ${email}
Password: [stored securely]

Login steps for ${provider}:
1. First, look for an email/username input field and enter: ${email}
2. Click "Next" or submit button
3. Wait for password field to appear
4. Enter password and submit

Use click_element and type_text tools to interact with the login form.
The DOM tree shows all interactive elements with their indices.`;
    }

    if (step === 'enter_email') {
      return `Email to enter: ${email}`;
    }

    if (step === 'enter_password') {
      // Don't expose password in logs, but allow agent to use it
      return `Password ready. Use type_text with the password field index.`;
    }

    return 'Login step completed';
  }

  private async extractVerificationCode(): Promise<string> {
    // Get page content using executeTool
    const response = await this.executeTool('extract_content', {});

    const content = response?.result || '';

    // Common verification code patterns
    const patterns = [
      /\b(\d{6})\b/g,                          // 6-digit code
      /\b(\d{4})\b/g,                          // 4-digit code
      /\b(\d{8})\b/g,                          // 8-digit code
      /code[:\s]+(\d{4,8})/gi,                 // "code: 123456"
      /verification[:\s]+(\d{4,8})/gi,         // "verification: 123456"
      /confirm[:\s]+(\d{4,8})/gi,              // "confirm: 123456"
      /OTP[:\s]+(\d{4,8})/gi,                  // "OTP: 123456"
      /\b([A-Z0-9]{6,8})\b/g,                  // Alphanumeric codes
    ];

    const codes: string[] = [];

    for (const pattern of patterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const code = match[1];
        // Filter out common non-code numbers (years, etc.)
        if (code && !codes.includes(code)) {
          const num = parseInt(code);
          if (isNaN(num) || (num > 999 && num < 100000000 && num < 1900 || num > 2100)) {
            codes.push(code);
          }
        }
      }
    }

    if (codes.length === 0) {
      return 'No verification code found in the email content.';
    }

    if (codes.length === 1) {
      return `Found verification code: ${codes[0]}`;
    }

    return `Found potential verification codes: ${codes.join(', ')}. The most likely code is: ${codes[0]}`;
  }

  private async waitForEmail(args: Record<string, any>): Promise<string> {
    const timeout = (args.timeout_seconds || 60) * 1000;
    const startTime = Date.now();
    const checkInterval = 10000; // Check every 10 seconds

    while (Date.now() - startTime < timeout) {
      // Refresh inbox
      await this.goToEmail('inbox');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check for matching email using executeTool
      const response = await this.executeTool('extract_content', {});

      const content = (response?.result || '').toLowerCase();

      let found = false;

      if (args.from && content.includes(args.from.toLowerCase())) {
        found = true;
      }

      if (args.subject_contains && content.includes(args.subject_contains.toLowerCase())) {
        found = true;
      }

      if (found) {
        return `Found matching email from ${args.from || 'any'} with subject containing "${args.subject_contains || 'any'}"`;
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    return `Timeout: No matching email found after ${args.timeout_seconds || 60} seconds.`;
  }

  // Convenience methods
  async checkEmail(): Promise<string> {
    this.lastCheckTime = Date.now();
    return this.run('Go to email inbox and check for new messages. List the most recent unread emails.');
  }

  async getVerificationCode(from?: string): Promise<string> {
    const task = from
      ? `Check email inbox, find the most recent email from ${from}, open it, and extract any verification code.`
      : `Check email inbox, find the most recent verification/confirmation email, open it, and extract the verification code.`;

    return this.run(task);
  }

  async composeAndSend(to: string, subject: string, body: string): Promise<string> {
    return this.run(`
      Compose a new email with:
      - To: ${to}
      - Subject: ${subject}
      - Body: ${body}

      Fill in the form and send the email.
    `);
  }

  shouldCheck(): boolean {
    if (!this.emailConfig) return false;

    const checkInterval = this.emailConfig.checkFrequency * 60 * 1000;
    return Date.now() - this.lastCheckTime > checkInterval;
  }
}
