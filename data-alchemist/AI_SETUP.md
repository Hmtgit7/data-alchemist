# AI Setup Instructions

## 🚀 AI Integration Setup

This application uses multiple AI services for enhanced functionality. Follow these steps to enable AI features:

### 1. Create Environment Variables File

Create a `.env.local` file in the project root with the following content:

```env
# AI API Keys - Add your own keys here
# Get free API keys from:
# - Google Gemini: https://ai.google.dev/ (Free tier: 15 requests/minute)
# - Groq: https://console.groq.com/ (Free tier with fast inference)

NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

### 2. Free AI Service Options

#### Option 1: Google Gemini (Recommended)
- Visit: https://ai.google.dev/
- Sign up for free account
- Generate API key
- 15 requests per minute FREE forever
- Best for complex reasoning tasks

#### Option 2: Groq (Fast Inference)
- Visit: https://console.groq.com/
- Sign up for free account
- Generate API key
- Fast inference with free tier
- Great for quick responses

#### Option 3: No Setup Required (Fallback)
- If no API keys are provided, the app automatically uses Transformers.js
- Runs entirely in browser
- No external API calls
- 100% free and private
- Slightly less powerful but still functional

### 3. Available AI Features

With AI integration enabled, you get:

#### 🔍 Natural Language Search
- "Find all tasks with duration more than 2 phases"
- "Show me high priority clients"
- "Workers with JavaScript skills"

#### 🧠 Smart Data Validation
- AI-powered error detection
- Content quality analysis
- Business logic validation
- Automated suggestions

#### 📋 Intelligent Rule Generation
- Automatic rule suggestions based on data patterns
- Co-run task recommendations  
- Load balancing optimization
- Phase scheduling hints

#### ✏️ Natural Language Data Modification
- "Update all senior workers' max load to 5"
- "Set priority level to 4 for all enterprise clients"
- "Add 'React' skill to all frontend developers"

### 4. Testing AI Features

1. Start the development server: `npm run dev`
2. Upload sample data files
3. Go to Validation tab
4. Try natural language search: "tasks lasting more than 2 phases"
5. Check the Rules tab for AI-generated suggestions

### 5. Performance Notes

- **With API Keys**: Best AI experience with complex reasoning
- **Without API Keys**: Still functional with Transformers.js fallback
- **Hybrid Mode**: Uses best available service automatically
- **Offline Support**: Transformers.js works without internet

### 6. Privacy & Security

- API keys are only used for AI processing
- Your data is only sent to AI services when using specific features
- Transformers.js option keeps all data local
- No data is stored on external servers

---

**Ready to go!** The app will work immediately even without API keys, using the built-in Transformers.js models for AI features. 