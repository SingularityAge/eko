// ============================================
// Social Agent
// Handles social media browsing and interactions
// ============================================

import { BaseAgent, createBrowserTools } from './base-agent';
import { OpenRouterService } from '../services/openrouter';
import { Tool, SocialPlatform } from '../shared/types';
import { PersonaEngine } from '../services/persona-engine';

const SOCIAL_MEDIA_URLS: Record<string, { base: string; login: string; feed: string }> = {
  instagram: {
    base: 'https://www.instagram.com',
    login: 'https://www.instagram.com/accounts/login/',
    feed: 'https://www.instagram.com/'
  },
  twitter: {
    base: 'https://twitter.com',
    login: 'https://twitter.com/i/flow/login',
    feed: 'https://twitter.com/home'
  },
  x: {
    base: 'https://x.com',
    login: 'https://x.com/i/flow/login',
    feed: 'https://x.com/home'
  },
  facebook: {
    base: 'https://www.facebook.com',
    login: 'https://www.facebook.com/login/',
    feed: 'https://www.facebook.com/'
  },
  reddit: {
    base: 'https://www.reddit.com',
    login: 'https://www.reddit.com/login/',
    feed: 'https://www.reddit.com/'
  },
  linkedin: {
    base: 'https://www.linkedin.com',
    login: 'https://www.linkedin.com/login',
    feed: 'https://www.linkedin.com/feed/'
  },
  tiktok: {
    base: 'https://www.tiktok.com',
    login: 'https://www.tiktok.com/login',
    feed: 'https://www.tiktok.com/foryou'
  },
  youtube: {
    base: 'https://www.youtube.com',
    login: 'https://accounts.google.com/signin',
    feed: 'https://www.youtube.com/'
  },
  discord: {
    base: 'https://discord.com',
    login: 'https://discord.com/login',
    feed: 'https://discord.com/channels/@me'
  }
};

export class SocialAgent extends BaseAgent {
  private personaEngine: PersonaEngine | null = null;
  private currentPlatform: string | null = null;
  private platformCredentials: Map<string, { username: string; password: string }> = new Map();

  constructor(llm: OpenRouterService, model?: string, personaEngine?: PersonaEngine) {
    super('social', llm, { model });
    this.personaEngine = personaEngine || null;
  }

  setPersonaEngine(engine: PersonaEngine): void {
    this.personaEngine = engine;
  }

  setCredentials(platform: string, username: string, password: string): void {
    this.platformCredentials.set(platform.toLowerCase(), { username, password });
  }

  protected getDefaultSystemPrompt(): string {
    const persona = this.personaEngine?.getPersona();

    let prompt = `You are a social media browsing agent that helps navigate and interact with various social platforms naturally.

Your capabilities:
- Log into social media accounts
- Browse feeds and discover content
- Like, comment, and share posts
- Follow/unfollow users
- Browse profiles and pages
- Search for content and users
- Watch videos and stories

Guidelines:
1. Act naturally - don't rush through actions
2. Engage authentically with content
3. Be mindful of platform-specific behaviors
4. Avoid any spam-like behavior
5. Respect privacy and community guidelines
6. Take breaks between interactions`;

    if (persona) {
      const engagementStyle = persona.socialMedia.engagementStyle;
      const frequency = persona.socialMedia.postingFrequency;
      const platforms = persona.socialMedia.platforms.map(p => p.name).join(', ');

      prompt += `

Persona Social Media Profile:
- Engagement Style: ${engagementStyle}
- Posting Frequency: ${frequency}
- Platforms Used: ${platforms}
- Interests: ${persona.interests.slice(0, 5).join(', ')}

Behavior Guidelines:
${engagementStyle === 'lurker' ? '- Mostly scroll and observe, rarely interact' : ''}
${engagementStyle === 'reactor' ? '- Like posts often, occasionally comment' : ''}
${engagementStyle === 'commenter' ? '- Actively comment and engage in discussions' : ''}
${engagementStyle === 'creator' ? '- Share content and participate actively' : ''}

Interact with content related to: ${persona.interests.join(', ')}`;
    }

    return prompt;
  }

  protected getDefaultTools(): Tool[] {
    const browserTools = createBrowserTools();

    const socialTools: Tool[] = [
      {
        type: 'function',
        function: {
          name: 'go_to_platform',
          description: 'Navigate to a social media platform',
          parameters: {
            type: 'object',
            properties: {
              platform: {
                type: 'string',
                enum: Object.keys(SOCIAL_MEDIA_URLS),
                description: 'The social media platform'
              },
              page: {
                type: 'string',
                enum: ['feed', 'login', 'profile', 'explore'],
                description: 'Which page to go to'
              }
            },
            required: ['platform']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'login_to_platform',
          description: 'Log into a social media platform with stored credentials',
          parameters: {
            type: 'object',
            properties: {
              platform: {
                type: 'string',
                description: 'The platform to log into'
              }
            },
            required: ['platform']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'like_post',
          description: 'Like/heart the current post or a post at a specific element',
          parameters: {
            type: 'object',
            properties: {
              element_index: {
                type: 'number',
                description: 'Index of the like button element'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'comment_on_post',
          description: 'Leave a comment on a post',
          parameters: {
            type: 'object',
            properties: {
              comment: {
                type: 'string',
                description: 'The comment text'
              },
              comment_input_index: {
                type: 'number',
                description: 'Index of the comment input field'
              }
            },
            required: ['comment']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'follow_user',
          description: 'Follow a user on the current platform',
          parameters: {
            type: 'object',
            properties: {
              follow_button_index: {
                type: 'number',
                description: 'Index of the follow button element'
              }
            },
            required: ['follow_button_index']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'share_post',
          description: 'Share or repost content',
          parameters: {
            type: 'object',
            properties: {
              share_button_index: {
                type: 'number',
                description: 'Index of the share/repost button'
              },
              add_comment: {
                type: 'string',
                description: 'Optional comment to add when sharing'
              }
            },
            required: ['share_button_index']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'browse_feed',
          description: 'Scroll through and browse the social feed naturally',
          parameters: {
            type: 'object',
            properties: {
              duration_seconds: {
                type: 'number',
                description: 'How long to browse (30-300 seconds)'
              },
              interact: {
                type: 'boolean',
                description: 'Whether to like/interact with content'
              }
            },
            required: ['duration_seconds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_platform',
          description: 'Search for content or users on the current platform',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query'
              },
              type: {
                type: 'string',
                enum: ['posts', 'users', 'hashtags', 'all'],
                description: 'Type of search'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'view_profile',
          description: 'View a user profile',
          parameters: {
            type: 'object',
            properties: {
              username: {
                type: 'string',
                description: 'Username to view'
              },
              profile_link_index: {
                type: 'number',
                description: 'Or click on a profile link by index'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'watch_video',
          description: 'Watch a video or story for a specified duration',
          parameters: {
            type: 'object',
            properties: {
              duration_seconds: {
                type: 'number',
                description: 'How long to watch (5-60 seconds)'
              }
            },
            required: ['duration_seconds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'view_stories',
          description: 'Watch stories on Instagram, Facebook, etc.',
          parameters: {
            type: 'object',
            properties: {
              count: {
                type: 'number',
                description: 'Number of stories to watch'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_notifications',
          description: 'Check notifications on the platform',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'check_messages',
          description: 'Check direct messages/DMs',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      }
    ];

    return [...browserTools, ...socialTools];
  }

  protected async executeToolCall(name: string, args: Record<string, any>): Promise<string> {
    // Handle platform navigation
    if (name === 'go_to_platform') {
      return this.goToPlatform(args.platform, args.page || 'feed');
    }

    if (name === 'login_to_platform') {
      return this.loginToPlatform(args.platform);
    }

    if (name === 'browse_feed') {
      return this.browseFeed(args.duration_seconds, args.interact);
    }

    // Send other tools to content script
    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_TOOL',
      payload: {
        tool: name,
        args,
        tabId: this.context.tabId
      }
    });

    // Log social activities
    if (['like_post', 'comment_on_post', 'follow_user', 'share_post'].includes(name)) {
      this.logActivity({
        type: 'social_react',
        url: this.context.url,
        details: {
          platform: this.currentPlatform,
          action: name,
          args
        }
      });
    }

    if (response.error) {
      throw new Error(response.error);
    }

    return response.result || 'Action completed';
  }

  private async goToPlatform(platform: string, page: string): Promise<string> {
    const platformKey = platform.toLowerCase();
    const urls = SOCIAL_MEDIA_URLS[platformKey];

    if (!urls) {
      throw new Error(`Unknown platform: ${platform}`);
    }

    this.currentPlatform = platformKey;
    let url = urls.feed;

    switch (page) {
      case 'login':
        url = urls.login;
        break;
      case 'feed':
        url = urls.feed;
        break;
      case 'explore':
        url = urls.base + '/explore';
        break;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_TOOL',
      payload: {
        tool: 'navigate_to',
        args: { url },
        tabId: this.context.tabId
      }
    });

    this.logActivity({
      type: 'social_browse',
      url,
      details: { platform, page }
    });

    return `Navigated to ${platform} ${page}`;
  }

  private async loginToPlatform(platform: string): Promise<string> {
    const platformKey = platform.toLowerCase();
    const credentials = this.platformCredentials.get(platformKey);

    if (!credentials) {
      throw new Error(`No credentials stored for ${platform}. Please set them in settings.`);
    }

    // Navigate to login page
    await this.goToPlatform(platform, 'login');

    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // The actual login will be handled by the browsing agent
    // sending click and type commands based on the DOM
    return `Ready to log into ${platform}. Use click_element and type_text to fill in credentials.
Username: ${credentials.username}
Password: [hidden]`;
  }

  private async browseFeed(duration: number, interact: boolean = false): Promise<string> {
    const persona = this.personaEngine?.getPersona();
    const engagementStyle = persona?.socialMedia.engagementStyle || 'lurker';

    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    let interactions = 0;

    // Simulate browsing
    while (Date.now() < endTime) {
      // Scroll down
      await chrome.runtime.sendMessage({
        type: 'EXECUTE_TOOL',
        payload: {
          tool: 'scroll_page',
          args: { direction: 'down', amount: 300 + Math.random() * 200 },
          tabId: this.context.tabId
        }
      });

      // Pause to "view" content
      const viewTime = 2000 + Math.random() * 4000;
      await new Promise(resolve => setTimeout(resolve, viewTime));

      // Decide whether to interact based on persona
      if (interact) {
        let interactProbability = 0.05; // Base 5%

        switch (engagementStyle) {
          case 'lurker':
            interactProbability = 0.02;
            break;
          case 'reactor':
            interactProbability = 0.15;
            break;
          case 'commenter':
            interactProbability = 0.1;
            break;
          case 'creator':
            interactProbability = 0.2;
            break;
        }

        if (Math.random() < interactProbability) {
          // This would trigger a like action
          interactions++;
        }
      }
    }

    const browseDuration = Math.round((Date.now() - startTime) / 1000);

    this.logActivity({
      type: 'social_browse',
      url: this.context.url,
      duration: browseDuration,
      details: {
        platform: this.currentPlatform,
        interactions
      }
    });

    return `Browsed feed for ${browseDuration}s. ${interactions} interactions.`;
  }

  // Convenience methods
  async browseSocial(platform: string, duration: number = 120): Promise<string> {
    return this.run(`
      Go to ${platform}, log in if needed, and browse the feed naturally for about ${duration} seconds.
      Engage with content that matches my interests.
    `);
  }

  async checkAllNotifications(): Promise<void> {
    const persona = this.personaEngine?.getPersona();
    const platforms = persona?.socialMedia.platforms || [{ name: 'instagram' }];

    for (const platform of platforms) {
      await this.run(`Go to ${platform.name} and check notifications`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}
