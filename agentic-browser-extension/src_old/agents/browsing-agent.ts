// ============================================
// Browsing Agent
// Main agent for general web navigation and browsing
// ============================================

import { BaseAgent, createBrowserTools, AgentContext } from './base-agent';
import { OpenRouterService } from '../services/openrouter';
import { Tool } from '../shared/types';
import { PersonaEngine } from '../services/persona-engine';

export class BrowsingAgent extends BaseAgent {
  private personaEngine: PersonaEngine | null = null;

  constructor(llm: OpenRouterService, model?: string, personaEngine?: PersonaEngine) {
    super('browsing', llm, { model });
    this.personaEngine = personaEngine || null;
  }

  setPersonaEngine(engine: PersonaEngine): void {
    this.personaEngine = engine;
  }

  protected getDefaultSystemPrompt(): string {
    const persona = this.personaEngine?.getPersona();

    let prompt = `You are an intelligent web browsing agent that navigates websites naturally and efficiently.

Your capabilities:
- Navigate to URLs and browse websites
- Click on links, buttons, and interactive elements
- Fill out forms and input fields
- Scroll through content
- Extract information from pages
- Interact with web applications

Guidelines:
1. Always analyze the page structure before taking action
2. Use element indices [0], [1], etc. to reference clickable elements
3. Be patient - wait for pages to load before interacting
4. If an action fails, try alternative approaches
5. Provide clear summaries of what you observe and accomplish
6. Avoid suspicious or harmful websites
7. Respect website terms of service`;

    if (persona) {
      prompt += `

You are browsing as a ${persona.age}-year-old ${persona.gender} from ${persona.location.city}, ${persona.location.state}.

Browsing Style:
- Reading depth: ${persona.browsingHabits.readingDepth}
- Scroll speed: ${persona.browsingHabits.scrollSpeed}
- Tab behavior: ${persona.browsingHabits.tabBehavior}
- Session length: approximately ${persona.browsingHabits.avgSessionLength} minutes

Interests: ${persona.interests.slice(0, 10).join(', ')}

Behave naturally as this persona would - take appropriate pauses, show interest in relevant content, and browse in a human-like manner.`;
    }

    return prompt;
  }

  protected getDefaultTools(): Tool[] {
    const browserTools = createBrowserTools();

    // Add browsing-specific tools
    const browsingTools: Tool[] = [
      {
        type: 'function',
        function: {
          name: 'search_google',
          description: 'Perform a Google search for the given query',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'open_new_tab',
          description: 'Open a URL in a new browser tab',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to open in new tab'
              }
            },
            required: ['url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'close_tab',
          description: 'Close the current tab',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'take_screenshot',
          description: 'Take a screenshot of the current page',
          parameters: {
            type: 'object',
            properties: {}
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'bookmark_page',
          description: 'Bookmark the current page',
          parameters: {
            type: 'object',
            properties: {
              folder: {
                type: 'string',
                description: 'Folder to save bookmark to (optional)'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'read_article',
          description: 'Spend time reading an article on the page, simulating natural reading behavior',
          parameters: {
            type: 'object',
            properties: {
              duration_seconds: {
                type: 'number',
                description: 'Approximate time to spend reading (10-120 seconds)'
              }
            },
            required: ['duration_seconds']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'hover_element',
          description: 'Hover over an element (useful for dropdown menus)',
          parameters: {
            type: 'object',
            properties: {
              index: {
                type: 'number',
                description: 'Element index to hover over'
              }
            },
            required: ['index']
          }
        }
      }
    ];

    return [...browserTools, ...browsingTools];
  }

  protected async executeToolCall(name: string, args: Record<string, any>): Promise<string> {
    // Use executeTool which handles both direct and message-based execution
    const response = await this.executeTool(name, args);

    // Log activity for certain actions
    if (['navigate_to', 'click_element', 'search_google'].includes(name)) {
      this.logActivity({
        type: name === 'search_google' ? 'search' : 'page_visit',
        url: args.url || this.context.url,
        details: { tool: name, args }
      });
    }

    return response?.result || 'Action completed';
  }

  // Browse naturally based on persona
  async browseNaturally(duration: number = 300000): Promise<void> {
    if (!this.personaEngine) {
      throw new Error('Persona engine required for natural browsing');
    }

    const startTime = Date.now();
    const persona = this.personaEngine.getPersona();

    while (Date.now() - startTime < duration) {
      if (!this.personaEngine.isAwake()) {
        console.log('Persona is asleep, stopping browse session');
        break;
      }

      const action = this.personaEngine.generateNextAction();
      const thinkTime = this.personaEngine.getThinkTime();

      // Simulate thinking
      await new Promise(resolve => setTimeout(resolve, thinkTime));

      switch (action.type) {
        case 'search':
          await this.run(`Search Google for: ${action.target}`);
          break;

        case 'visit':
          await this.run(`Navigate to ${action.target} and browse the content naturally`);
          break;

        case 'social':
          // Let social agent handle this
          chrome.runtime.sendMessage({
            type: 'START_AGENT',
            payload: { agentType: 'social', target: action.target }
          });
          break;

        case 'email':
          // Let email agent handle this
          chrome.runtime.sendMessage({
            type: 'START_AGENT',
            payload: { agentType: 'email' }
          });
          break;

        case 'break':
          console.log(`Taking a break for ${(action.duration || 60000) / 1000}s`);
          await new Promise(resolve => setTimeout(resolve, action.duration || 60000));
          break;

        case 'idle':
          await new Promise(resolve => setTimeout(resolve, 5000));
          break;
      }

      // Random delay between actions
      const delay = 5000 + Math.random() * 15000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
