// ============================================
// Search Agent
// Specialized for web search and research using Perplexity
// ============================================

import { BaseAgent, createBrowserTools } from './base-agent';
import { OpenRouterService } from '../services/openrouter';
import { Tool, PERPLEXITY_MODELS } from '../shared/types';

export class SearchAgent extends BaseAgent {
  private perplexityModel: string;

  constructor(
    llm: OpenRouterService,
    model?: string,
    perplexityModel?: string
  ) {
    super('search', llm, { model });
    this.perplexityModel = perplexityModel || PERPLEXITY_MODELS[1]; // sonar-large by default
  }

  protected getDefaultSystemPrompt(): string {
    return `You are a research and search specialist agent with access to real-time web search capabilities through Perplexity.

Your capabilities:
- Perform intelligent web searches
- Research topics comprehensively
- Compare information from multiple sources
- Fact-check and verify information
- Summarize search results clearly
- Navigate to search result pages for deeper exploration

Guidelines:
1. Use Perplexity search for current/real-time information
2. Use Google search when you need to visit specific pages
3. Cross-reference information from multiple sources
4. Clearly cite sources when providing information
5. Distinguish between facts and opinions
6. Be thorough but concise in your research
7. If information is uncertain, say so

When researching:
- Start with a broad search to understand the topic
- Narrow down to specific aspects as needed
- Look for authoritative sources
- Consider multiple perspectives`;
  }

  protected getDefaultTools(): Tool[] {
    const browserTools = createBrowserTools();

    const searchTools: Tool[] = [
      {
        type: 'function',
        function: {
          name: 'perplexity_search',
          description: 'Use Perplexity AI to search the web for real-time, up-to-date information. Best for current events, facts, and comprehensive research.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query or question'
              },
              depth: {
                type: 'string',
                enum: ['quick', 'detailed'],
                description: 'Search depth - quick for simple facts, detailed for comprehensive research'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'google_search',
          description: 'Perform a traditional Google search to find and visit specific websites',
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
          name: 'search_images',
          description: 'Search for images on Google Images',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Image search query'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_news',
          description: 'Search for recent news articles on Google News',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'News search query'
              },
              time_range: {
                type: 'string',
                enum: ['hour', 'day', 'week', 'month'],
                description: 'Time range for news articles'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_videos',
          description: 'Search for videos on YouTube',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Video search query'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_shopping',
          description: 'Search for products on Google Shopping',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Product search query'
              },
              max_price: {
                type: 'number',
                description: 'Maximum price filter (optional)'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_reddit',
          description: 'Search Reddit for discussions and opinions on a topic',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Reddit search query'
              },
              subreddit: {
                type: 'string',
                description: 'Specific subreddit to search in (optional)'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fact_check',
          description: 'Use Perplexity to fact-check a claim or statement',
          parameters: {
            type: 'object',
            properties: {
              claim: {
                type: 'string',
                description: 'The claim or statement to fact-check'
              }
            },
            required: ['claim']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'compare_options',
          description: 'Research and compare multiple options (products, services, etc.)',
          parameters: {
            type: 'object',
            properties: {
              options: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of options to compare'
              },
              criteria: {
                type: 'array',
                items: { type: 'string' },
                description: 'Criteria to compare on (price, quality, etc.)'
              }
            },
            required: ['options']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'summarize_page',
          description: 'Extract and summarize the key information from the current page',
          parameters: {
            type: 'object',
            properties: {
              focus: {
                type: 'string',
                description: 'Specific aspect to focus on (optional)'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'save_research',
          description: 'Save research findings to memory for later reference',
          parameters: {
            type: 'object',
            properties: {
              topic: {
                type: 'string',
                description: 'Topic of the research'
              },
              findings: {
                type: 'string',
                description: 'Key findings to save'
              },
              sources: {
                type: 'array',
                items: { type: 'string' },
                description: 'Source URLs'
              }
            },
            required: ['topic', 'findings']
          }
        }
      }
    ];

    return [...browserTools, ...searchTools];
  }

  protected async executeToolCall(name: string, args: Record<string, any>): Promise<string> {
    // Handle Perplexity-specific tools locally
    if (name === 'perplexity_search' || name === 'fact_check') {
      return this.executePerplexitySearch(args);
    }

    if (name === 'compare_options') {
      return this.compareOptions(args);
    }

    // Handle Google search variations
    if (['google_search', 'search_images', 'search_news', 'search_videos', 'search_shopping'].includes(name)) {
      return this.executeGoogleSearch(name, args);
    }

    if (name === 'search_reddit') {
      const query = args.subreddit
        ? `site:reddit.com/r/${args.subreddit} ${args.query}`
        : `site:reddit.com ${args.query}`;
      return this.executeGoogleSearch('google_search', { query });
    }

    // Use executeTool which handles both direct and message-based execution
    const response = await this.executeTool(name, args);

    return response?.result || 'Action completed';
  }

  private async executePerplexitySearch(args: Record<string, any>): Promise<string> {
    const query = args.query || args.claim;
    const isFactCheck = 'claim' in args;

    let searchPrompt = query;
    if (isFactCheck) {
      searchPrompt = `Fact check the following claim and provide evidence for or against it: "${query}"`;
    } else if (args.depth === 'detailed') {
      searchPrompt = `Provide a comprehensive and detailed answer to: ${query}. Include multiple perspectives and cite sources.`;
    }

    try {
      const result = await this.llm.searchWithPerplexity(searchPrompt, this.perplexityModel);

      this.logActivity({
        type: 'search',
        details: {
          engine: 'perplexity',
          query,
          isFactCheck
        }
      });

      return result;
    } catch (error) {
      return `Perplexity search failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private async executeGoogleSearch(type: string, args: Record<string, any>): Promise<string> {
    let url = 'https://www.google.com/search?q=' + encodeURIComponent(args.query);

    switch (type) {
      case 'search_images':
        url = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(args.query);
        break;
      case 'search_news':
        url = 'https://www.google.com/search?tbm=nws&q=' + encodeURIComponent(args.query);
        if (args.time_range) {
          const timeMap: Record<string, string> = {
            hour: 'qdr:h',
            day: 'qdr:d',
            week: 'qdr:w',
            month: 'qdr:m'
          };
          url += '&tbs=' + timeMap[args.time_range];
        }
        break;
      case 'search_videos':
        url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(args.query);
        break;
      case 'search_shopping':
        url = 'https://www.google.com/search?tbm=shop&q=' + encodeURIComponent(args.query);
        if (args.max_price) {
          url += `&tbs=mr:1,price:1,ppr_max:${args.max_price}`;
        }
        break;
    }

    // Navigate to search page using executeTool
    await this.executeTool('navigate_to', { url });

    this.logActivity({
      type: 'search',
      url,
      details: {
        engine: type === 'search_videos' ? 'youtube' : 'google',
        searchType: type,
        query: args.query
      }
    });

    return `Navigated to ${type.replace('_', ' ')}: ${args.query}`;
  }

  private async compareOptions(args: Record<string, any>): Promise<string> {
    const options = args.options as string[];
    const criteria = args.criteria as string[] || ['features', 'price', 'quality', 'reviews'];

    const comparisonPrompt = `Compare the following options: ${options.join(', ')}.

Evaluate each option based on these criteria: ${criteria.join(', ')}.

Provide:
1. A brief overview of each option
2. Pros and cons for each
3. A comparison table if applicable
4. Your recommendation and why`;

    return this.executePerplexitySearch({ query: comparisonPrompt, depth: 'detailed' });
  }

  // Convenience method for quick search
  async quickSearch(query: string): Promise<string> {
    return this.run(`Search for information about: ${query}`);
  }

  // Deep research on a topic
  async deepResearch(topic: string): Promise<string> {
    return this.run(`Conduct comprehensive research on: ${topic}.
    Use multiple search methods, gather information from various sources,
    and provide a detailed summary with citations.`);
  }
}
