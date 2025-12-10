// ============================================
// Base Agent Class
// Foundation for all specialized agents
// ============================================

import { OpenRouterService } from '../services/openrouter';
import { LLMMessage, Tool, AgentState, AgentType, Activity } from '../shared/types';

export interface AgentContext {
  tabId: number;
  url: string;
  pageContent?: string;
  domTree?: string;
  previousActions: string[];
  variables: Map<string, any>;
}

export interface AgentConfig {
  model: string;
  maxIterations: number;
  temperature: number;
  systemPrompt: string;
  tools: Tool[];
}

// Tool executor type for direct execution in background context
export type ToolExecutor = (tool: string, args: Record<string, any>, tabId?: number) => Promise<any>;

export abstract class BaseAgent {
  protected id: string;
  protected type: AgentType;
  protected llm: OpenRouterService;
  protected config: AgentConfig;
  protected state: AgentState;
  protected context: AgentContext;
  protected messages: LLMMessage[];
  protected abortController: AbortController | null = null;
  protected toolExecutor: ToolExecutor | null = null;

  constructor(
    type: AgentType,
    llm: OpenRouterService,
    config: Partial<AgentConfig> = {}
  ) {
    this.id = `agent_${type}_${Date.now()}`;
    this.type = type;
    this.llm = llm;

    this.config = {
      model: config.model || 'anthropic/claude-3.5-sonnet',
      maxIterations: config.maxIterations || 10,
      temperature: config.temperature || 0.7,
      systemPrompt: config.systemPrompt || this.getDefaultSystemPrompt(),
      tools: config.tools || this.getDefaultTools()
    };

    this.state = {
      id: this.id,
      type,
      status: 'idle',
      lastActivity: Date.now()
    };

    this.context = {
      tabId: 0,
      url: '',
      previousActions: [],
      variables: new Map()
    };

    this.messages = [];
  }

  // Abstract methods to be implemented by specialized agents
  protected abstract getDefaultSystemPrompt(): string;
  protected abstract getDefaultTools(): Tool[];
  protected abstract executeToolCall(name: string, args: Record<string, any>): Promise<string>;

  // Get agent state
  getState(): AgentState {
    return { ...this.state };
  }

  // Get agent ID
  getId(): string {
    return this.id;
  }

  // Get agent type
  getType(): AgentType {
    return this.type;
  }

  // Set context
  setContext(context: Partial<AgentContext>): void {
    this.context = { ...this.context, ...context };
  }

  // Set tool executor for direct execution in background context
  setToolExecutor(executor: ToolExecutor): void {
    this.toolExecutor = executor;
  }

  // Execute tool - uses direct executor if available, otherwise sends message
  protected async executeTool(tool: string, args: Record<string, any>): Promise<any> {
    if (this.toolExecutor) {
      // Direct execution in background context
      return this.toolExecutor(tool, args, this.context.tabId);
    }

    // Fallback to message passing (for content script context)
    const response = await chrome.runtime.sendMessage({
      type: 'EXECUTE_TOOL',
      payload: {
        tool,
        args,
        tabId: this.context.tabId
      }
    });

    if (response?.error) {
      throw new Error(response.error);
    }

    return response;
  }

  // Initialize conversation
  protected initializeConversation(task: string): void {
    this.messages = [
      {
        role: 'system',
        content: this.config.systemPrompt
      },
      {
        role: 'user',
        content: this.buildTaskMessage(task)
      }
    ];
  }

  // Build task message with context
  protected buildTaskMessage(task: string): string {
    let message = `Task: ${task}\n\n`;

    if (this.context.url) {
      message += `Current URL: ${this.context.url}\n`;
    }

    // Ensure pageContent is a string before slicing
    const pageContent = typeof this.context.pageContent === 'string'
      ? this.context.pageContent
      : JSON.stringify(this.context.pageContent || '');
    if (pageContent) {
      message += `\nPage Content:\n${pageContent.slice(0, 10000)}\n`;
    }

    // Ensure domTree is a string before slicing
    const domTree = typeof this.context.domTree === 'string'
      ? this.context.domTree
      : JSON.stringify(this.context.domTree || '');
    if (domTree) {
      message += `\nInteractive Elements:\n${domTree.slice(0, 15000)}\n`;
    }

    if (this.context.previousActions.length > 0) {
      message += `\nPrevious Actions:\n${this.context.previousActions.slice(-5).join('\n')}\n`;
    }

    return message;
  }

  // Run the agent
  async run(
    task: string,
    onUpdate?: (update: { type: string; data: any }) => void
  ): Promise<string> {
    this.state.status = 'running';
    this.state.currentTask = task;
    this.abortController = new AbortController();

    try {
      this.initializeConversation(task);

      onUpdate?.({ type: 'start', data: { task, agentId: this.id } });

      let iteration = 0;

      while (iteration < this.config.maxIterations) {
        if (this.abortController.signal.aborted) {
          throw new Error('Agent execution aborted');
        }

        // Get LLM response
        const response = await this.llm.chat(
          this.messages,
          this.config.model,
          this.config.tools,
          { temperature: this.config.temperature }
        );

        const assistantMessage = response.choices[0]?.message;
        if (!assistantMessage) {
          throw new Error('No response from LLM');
        }

        // Add assistant message to history
        const llmMessage: LLMMessage = {
          role: 'assistant',
          content: assistantMessage.content || '',
          tool_calls: assistantMessage.tool_calls
        };
        this.messages.push(llmMessage);

        onUpdate?.({
          type: 'message',
          data: {
            iteration,
            content: assistantMessage.content,
            toolCalls: assistantMessage.tool_calls
          }
        });

        // If no tool calls, agent is done
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
          this.state.status = 'idle';
          this.state.currentTask = undefined;
          this.state.lastActivity = Date.now();

          onUpdate?.({ type: 'complete', data: { result: assistantMessage.content } });

          return assistantMessage.content || '';
        }

        // Execute tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          if (this.abortController.signal.aborted) {
            throw new Error('Agent execution aborted');
          }

          const args = JSON.parse(toolCall.function.arguments);

          onUpdate?.({
            type: 'tool_call',
            data: {
              name: toolCall.function.name,
              args,
              toolCallId: toolCall.id
            }
          });

          try {
            const result = await this.executeToolCall(toolCall.function.name, args);

            this.context.previousActions.push(
              `${toolCall.function.name}(${JSON.stringify(args)}) -> ${result.slice(0, 200)}`
            );

            this.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: result
            });

            onUpdate?.({
              type: 'tool_result',
              data: {
                toolCallId: toolCall.id,
                result: result.slice(0, 500)
              }
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            this.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${errorMessage}`
            });

            onUpdate?.({
              type: 'tool_error',
              data: {
                toolCallId: toolCall.id,
                error: errorMessage
              }
            });
          }
        }

        iteration++;
      }

      throw new Error(`Agent exceeded max iterations (${this.config.maxIterations})`);
    } catch (error) {
      this.state.status = 'error';
      this.state.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      onUpdate?.({
        type: 'error',
        data: { error: this.state.errorMessage }
      });

      throw error;
    }
  }

  // Pause agent
  pause(): void {
    this.state.status = 'paused';
  }

  // Resume agent
  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running';
    }
  }

  // Stop agent
  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.state.status = 'idle';
    this.state.currentTask = undefined;
  }

  // Reset agent state
  reset(): void {
    this.messages = [];
    this.context.previousActions = [];
    this.context.variables.clear();
    this.state = {
      id: this.id,
      type: this.type,
      status: 'idle',
      lastActivity: Date.now()
    };
  }

  // Log activity
  protected logActivity(activity: Partial<Activity>): void {
    // Send to background for tracking
    chrome.runtime.sendMessage({
      type: 'ACTIVITY_LOG',
      payload: {
        ...activity,
        agentId: this.id,
        timestamp: Date.now()
      }
    }).catch(() => {
      // Ignore errors if background is not available
    });
  }
}

// Common browser tools that all agents can use
export function createBrowserTools(): Tool[] {
  return [
    {
      type: 'function',
      function: {
        name: 'navigate_to',
        description: 'Navigate to a specific URL',
        parameters: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description: 'The URL to navigate to'
            }
          },
          required: ['url']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'click_element',
        description: 'Click on an element by its index number from the DOM tree',
        parameters: {
          type: 'object',
          properties: {
            index: {
              type: 'number',
              description: 'The index number of the element to click (e.g., [0], [1], etc.)'
            }
          },
          required: ['index']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'type_text',
        description: 'Type text into the currently focused input field',
        parameters: {
          type: 'object',
          properties: {
            text: {
              type: 'string',
              description: 'The text to type'
            },
            press_enter: {
              type: 'boolean',
              description: 'Whether to press Enter after typing'
            }
          },
          required: ['text']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'scroll_page',
        description: 'Scroll the page up or down',
        parameters: {
          type: 'object',
          properties: {
            direction: {
              type: 'string',
              enum: ['up', 'down'],
              description: 'Direction to scroll'
            },
            amount: {
              type: 'number',
              description: 'Pixels to scroll (default 500)'
            }
          },
          required: ['direction']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'wait',
        description: 'Wait for a specified time before continuing',
        parameters: {
          type: 'object',
          properties: {
            seconds: {
              type: 'number',
              description: 'Number of seconds to wait'
            }
          },
          required: ['seconds']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'extract_content',
        description: 'Extract and return the main text content of the current page',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'get_page_info',
        description: 'Get current page URL and title',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'go_back',
        description: 'Go back to the previous page in browser history',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'refresh_page',
        description: 'Refresh the current page',
        parameters: {
          type: 'object',
          properties: {}
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'fill_form',
        description: 'Fill a form field by clicking on it and typing',
        parameters: {
          type: 'object',
          properties: {
            element_index: {
              type: 'number',
              description: 'Index of the input element'
            },
            value: {
              type: 'string',
              description: 'Value to fill in'
            }
          },
          required: ['element_index', 'value']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'complete',
        description: 'Mark the task as complete and provide a summary',
        parameters: {
          type: 'object',
          properties: {
            summary: {
              type: 'string',
              description: 'Summary of what was accomplished'
            }
          },
          required: ['summary']
        }
      }
    }
  ];
}
