# PersonaSurfer - Human-Like Browser Automation Extension

> **Eerie-realistic digital personas that surf the web like real humans**

PersonaSurfer is a Chrome extension that creates hyper-realistic browsing behavior using AI-driven personas. Watch as synthetic users browse, search, get distracted, check email, and even verify signups—all with human-like imperfections.

## ✨ Features

### 🤖 Realistic Persona Simulation
- **Schedule-Driven Behavior**: Wake/sleep times, meals, bathroom breaks
- **Natural Input**: Typing with errors, mouse jitter, scroll variations
- **Human Patterns**: Distractions, reading pauses, tab switching
- **Energy System**: Fatigue affects speed and accuracy over time

### 📧 Automatic Email Verification
- **Signup Detection**: Recognizes signup forms automatically
- **Inbox Polling**: Monitors ProtonMail every 10 seconds
- **Code Extraction**: Finds 6-digit verification codes
- **Link Detection**: Identifies confirmation URLs
- **Auto-Fill**: Types codes with realistic delays

### 📊 Analytics Dashboard
- **Activity Timeline**: 30-minute interval visualization
- **Session Statistics**: Page visits, searches, emails, signups
- **Real-Time Tracking**: Live updates every 5 seconds
- **Activity Types**: 7 categories with color coding
- **Export Ready**: All data persisted in chrome.storage

### 🔒 Security & Privacy
- **AES-256-GCM Encryption**: Military-grade credential protection
- **PBKDF2 Key Derivation**: 100,000 iterations
- **Zero Plaintext**: Credentials never stored unencrypted
- **Auto-Generated Keys**: Master password creation
- **Local Storage Only**: No external data transmission

### 🎯 Reproducible Testing
- **Seeded Randomness**: Same seed = same behavior
- **Deterministic Traits**: Consistent typing speed, error rate
- **Debug Mode**: Replay exact scenarios
- **Test Personas**: Pre-built test cases

### 🛡️ Error Recovery
- **Tab Crash Detection**: Automatic restart
- **Exponential Backoff**: 2^n * 2s + random jitter
- **Max Retries**: 3 attempts per tab
- **Graceful Degradation**: Continue on partial failures

## 🚀 Quick Start

### Installation

1. **Clone or download** this repository
2. **Install dependencies**:
   ```bash
   pnpm install
   pnpm -r --sequential build
   ```
3. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `example/extension/dist/` folder

### First Run

1. **Configure API Key**:
   - Click extension icon → Options
   - Enter OpenRouter API key
   - Select model (default: claude-sonnet-4.5)

2. **Create Persona**:
   - Open sidebar (click extension icon)
   - Enter description: "35-year-old tech worker interested in AI"
   - Click "Generate Persona"
   - Review and download for future use

3. **Start Simulation**:
   - Enter email password (for ProtonMail auto-login)
   - Toggle "Enable Email Auto-Verify" if testing signups
   - Click "Play" to start
   - Switch to "Analytics" tab to watch activity

## 📖 Usage Examples

### Example 1: Busy Mom Testing E-Commerce

```json
{
  "demographics": { "age": 38, "gender": "female", "location": "Chicago" },
  "email": "busymom2024@protonmail.com",
  "schedule": {
    "wake_time": "06:00",
    "sleep_time": "22:30",
    "work_hours": "09:00-17:00",
    "meals": ["07:00", "12:00", "18:00"],
    "bathroom_breaks": 4
  },
  "interests": ["parenting", "recipes", "organizing"],
  "browsing_habits": {
    "favorite_sites": ["pinterest.com", "amazon.com"],
    "session_length_minutes": 45,
    "search_patterns": ["easy recipes", "kids activities"]
  }
}
```

**Behavior**: Shops on Amazon at lunch, searches recipes before dinner, takes breaks every 2-3 hours.

### Example 2: College Student Researching

```json
{
  "demographics": { "age": 20, "gender": "male", "location": "Boston" },
  "email": "student2024@protonmail.com",
  "schedule": {
    "wake_time": "08:30",
    "sleep_time": "01:00",
    "work_hours": "14:00-18:00",
    "meals": ["09:00", "13:00", "19:00"],
    "bathroom_breaks": 3
  },
  "interests": ["gaming", "tech", "memes"],
  "browsing_habits": {
    "favorite_sites": ["reddit.com", "youtube.com", "github.com"],
    "session_length_minutes": 90,
    "search_patterns": ["coding tutorials", "game reviews"]
  }
}
```

**Behavior**: Late-night browsing, frequent distractions to Reddit, long session lengths.

### Example 3: Testing Signup Flow

1. Create persona with ProtonMail email
2. Enter email password
3. Enable "Email Auto-Verify"
4. Navigate to signup page manually
5. Watch PersonaSurfer:
   - Detect signup form
   - Fill out fields with realistic typing
   - Submit form
   - Switch to ProtonMail tab
   - Find verification email
   - Extract code/link
   - Switch back and complete verification

## 🎨 Architecture

### Components

```
PersonaSurfer/
├── background/
│   ├── index.ts              # Main service worker
│   ├── persona-engine.ts     # Persona brain & scheduling
│   ├── email-verifier.ts     # Email polling & verification
│   ├── error-recovery.ts     # Tab crash handling
│   ├── activity-tracker.ts   # Analytics & logging
│   ├── random-seed.ts        # Deterministic randomness
│   └── crypto-helper.ts      # Credential encryption
├── content/
│   ├── content-script.ts     # Main coordinator
│   ├── browser-automation.ts # High-level actions
│   ├── keyboard-emulator.ts  # Realistic typing
│   ├── mouse-emulator.ts     # Human-like cursor
│   └── signup-detector.ts    # Form recognition
└── sidebar/
    ├── index.tsx             # Main UI
    └── components/
        └── AnalyticsTimeline.tsx  # Dashboard
```

### Data Flow

```
User Input → Persona Generation (LLM)
          → PersonaEngine (schedule + traits)
          → Simulation Loop (background)
          → Content Scripts (per tab)
          → DOM Automation
          → Activity Tracking
          → Analytics UI
```

### Security Model

```
User Password → PBKDF2 (100K iterations)
             → AES-256-GCM Key
             → Encrypt Credentials
             → chrome.storage.local (encrypted)

When Needed  → Retrieve Encrypted Data
             → Decrypt with Master Key
             → Use in Memory Only
             → Never Log or Store Plaintext
```

## 🧪 Testing

### Manual Testing

1. **Basic Simulation**:
   ```
   - Create persona
   - Start simulation
   - Verify tabs open automatically
   - Check realistic typing/scrolling
   - Observe distractions occurring
   ```

2. **Email Verification**:
   ```
   - Enable email auto-verify
   - Go to test signup page (e.g., GitHub)
   - Fill and submit signup form
   - Watch ProtonMail inbox poll
   - Verify code auto-filled
   ```

3. **Error Recovery**:
   ```
   - Start simulation
   - Manually crash a tab (close dev tools mid-load)
   - Observe automatic reopening
   - Check exponential backoff delays
   ```

4. **Analytics**:
   ```
   - Run simulation for 10 minutes
   - Switch to Analytics tab
   - Verify activity counts
   - Check timeline visualization
   - Confirm stats accuracy
   ```

### Reproducible Tests

```javascript
// Same seed = same behavior
const seed = 12345;
const persona1 = new PersonaRandomness("test@email.com", seed);
const persona2 = new PersonaRandomness("test@email.com", seed);

persona1.getTypingSpeed() === persona2.getTypingSpeed(); // true
persona1.shouldGetDistracted() === persona2.shouldGetDistracted(); // true
```

## 🔧 Configuration

### Environment Variables

None required - all configuration in extension options.

### Options Page

- **LLM Provider**: OpenRouter (default)
- **Model**: claude-sonnet-4.5, gpt-4, etc.
- **API Key**: Required for persona generation

### Sidebar Settings

- **Persona**: Upload/download JSON files
- **Email Password**: Encrypted in chrome.storage.local
- **Email Auto-Verify**: Toggle for signup testing
- **Simulation Control**: Play/pause buttons
- **Analytics**: Real-time dashboard

## 📊 Analytics Data

### Activity Types

| Type | Description | Color | Icon |
|------|-------------|-------|------|
| `page_visit` | Website navigation | Blue | 🌐 |
| `search` | Search queries | Green | 🔍 |
| `email_check` | Inbox polling | Orange | 📧 |
| `distraction` | Unplanned tabs | Red | 👀 |
| `signup` | Account creation | Purple | 📝 |
| `verification` | Email verification | Cyan | ✓ |
| `idle` | Sleep/breaks | Gray | ⏰ |

### Statistics

- **Total Events**: Count of all activities
- **Active Time**: Sum of activity durations
- **Page Visits**: Navigation event count
- **Searches**: Query count
- **Emails**: Inbox check count
- **Signups**: Registration count
- **Verifications**: Completed verifications

### Timeline

- 30-minute intervals (customizable)
- Activity type breakdown per interval
- Color-coded visualization
- Scrollable for full-day view

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm 8+
- Chrome 100+

### Build Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r --sequential build

# Build extension only
pnpm --filter @eko-ai/eko-extension-example build

# Development mode (watch)
cd example/extension
npx webpack --watch
```

### Code Style

- TypeScript strict mode
- 2-space indentation
- No semicolons (ESLint)
- Prettier formatting
- JSDoc comments for public APIs

### Adding Features

1. Create new module in appropriate directory
2. Export from index file
3. Import in background/index.ts
4. Add event handlers if needed
5. Update UI in sidebar if needed
6. Test thoroughly
7. Update documentation

## 🐛 Troubleshooting

### "ChatAgent not initialized"

**Solution**: Configure OpenRouter API key in extension options.

### Email verification not working

**Checklist**:
- ProtonMail logged in?
- Email auto-verify enabled?
- Correct email password?
- ProtonMail tab open?

### Tabs not opening

**Solutions**:
- Check persona has favorite_sites
- Verify Chrome allows popup tabs
- Check browser console for errors
- Restart simulation

### Build failing

**Solutions**:
```bash
# Clean and reinstall
pnpm clean
pnpm install

# Try building core first
pnpm --filter @eko-ai/eko build
pnpm --filter @eko-ai/eko-extension build
pnpm --filter @eko-ai/eko-extension-example build
```

### Activity tracking not updating

**Solutions**:
- Check sidebar is open
- Verify simulation is running
- Check browser console for errors
- Try clearing activity history

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🙏 Acknowledgments

- **Eko Framework**: Core agent architecture
- **OpenRouter**: LLM API gateway
- **Anthropic Claude**: Persona generation
- **Ant Design**: UI components
- **Web Crypto API**: Encryption

## 📧 Support

- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: support@personasurfer.com

## 🎯 Roadmap

- [ ] Firefox support
- [ ] Additional email providers
- [ ] Cloud persona sync
- [ ] Team collaboration features
- [ ] Advanced analytics export
- [ ] Mobile simulation
- [ ] Voice interaction simulation
- [ ] Multi-device coordination

---

**PersonaSurfer** - Making the web feel more human, one synthetic persona at a time. 🤖✨
