# Agentic Browser Extension

An AI-powered Chrome extension that simulates authentic web browsing behavior of a young US citizen. Features multiple specialized agents powered by OpenRouter LLMs, including Perplexity models for real-time search.

## Features

### Multiple Specialized Agents
- **Browsing Agent**: General web navigation with persona-based behavior
- **Search Agent**: Web research using Perplexity models via OpenRouter
- **Social Agent**: Social media browsing and interaction
- **Email Agent**: Webpage-based email checking and management

### Authentic Behavior Simulation
- Human-like mouse movements with Bezier curves
- Natural typing with configurable typos and speed
- Realistic scrolling patterns
- Thinking pauses between actions
- Schedule-aware activity timing

### Persona Engine
- Generate realistic young US citizen personas
- Customizable demographics, interests, and habits
- Personality traits affect browsing behavior
- Location and timezone awareness

### OpenRouter Integration
- Support for multiple LLM providers via OpenRouter
- Perplexity models for real-time web search
- Configurable models per agent type

## Installation

### Prerequisites
- Node.js 18+
- pnpm or npm

### Build Steps

```bash
# Navigate to extension directory
cd agentic-browser-extension

# Install dependencies
npm install

# Build the extension
npm run build

# For development with watch mode
npm run dev
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

## Configuration

### API Key Setup

1. Get an OpenRouter API key from [openrouter.ai/keys](https://openrouter.ai/keys)
2. Open the extension popup or options page
3. Enter your API key in the settings

### Model Configuration

Configure different models for each agent:
- **Browsing**: Default `anthropic/claude-3.5-sonnet`
- **Search**: Default `perplexity/llama-3.1-sonar-large-128k-online` (real-time search)
- **Social**: Default `anthropic/claude-3.5-sonnet`
- **Email**: Default `anthropic/claude-3-haiku` (fast responses)

### Email Setup

The extension uses webpage-based email login (not IMAP):
1. Go to Settings > Email Configuration
2. Select your email provider (Gmail, Outlook, Yahoo, ProtonMail)
3. Enter your email address and password
4. Enable auto-check if desired

### Persona Configuration

Generate or customize your persona:
- Basic info: name, age, gender, location
- Occupation and education
- Interests and hobbies
- Social media platforms
- Browsing habits and schedule

## Usage

### Quick Actions (Popup)
- **Auto Browse**: Start natural browsing based on persona interests
- **Search**: Open search interface with Perplexity
- **Check Email**: Navigate to email and check inbox
- **Social**: Browse social media platforms

### Task Execution (Sidebar)
Enter natural language tasks like:
- "Search for the latest iPhone reviews"
- "Check my Gmail for any new messages"
- "Browse Instagram for 5 minutes"
- "Research best coffee shops in New York"

### Agent Control
- Start/stop individual agents
- View real-time execution logs
- Monitor activity history

## Architecture

```
src/
├── agents/           # Specialized AI agents
│   ├── base-agent.ts
│   ├── browsing-agent.ts
│   ├── search-agent.ts
│   ├── social-agent.ts
│   └── email-agent.ts
├── background/       # Service worker
├── content/          # Content scripts
├── popup/            # Popup & options UI
├── sidebar/          # Side panel UI
├── services/         # Core services
│   ├── openrouter.ts
│   └── persona-engine.ts
├── shared/           # Shared types
└── utils/            # Utilities
    ├── dom-utils.ts
    └── human-simulation.ts
```

## Security Notes

- API keys and passwords are stored locally in Chrome storage
- Credentials are never transmitted except to their intended services
- No telemetry or data collection

## License

MIT

## Contributing

Contributions welcome! Please open an issue or PR.
