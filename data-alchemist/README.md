# 🧪 Data Alchemist - AI-Powered Resource Allocation Configurator

> Transform messy spreadsheets into clean, validated data with intelligent AI assistance for resource allocation planning.

[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![AI Powered](https://img.shields.io/badge/AI-Powered-brightgreen?logo=sparkles)](https://github.com)

## 🌟 Features

### 🤖 AI-Powered Core Features

- **🔍 Natural Language Search**: Query your data using plain English
- **✏️ Natural Language Data Modification**: Modify data with simple commands
- **📋 Intelligent Rule Generation**: AI suggests optimal allocation rules
- **🧠 Smart Data Validation**: AI detects complex patterns and anomalies
- **🗂️ AI Column Mapping**: Automatically maps CSV columns to correct fields
- **💡 Intelligent Suggestions**: Context-aware recommendations for data improvement

### 📊 Data Management

- **📁 Multi-Format Support**: CSV and XLSX file processing
- **✏️ Inline Editing**: Edit data directly in responsive tables
- **🔄 Real-time Validation**: Instant feedback on data quality
- **📱 Mobile Responsive**: Works seamlessly on all devices

### ⚙️ Business Rules Engine

- **🤝 Co-run Rules**: Tasks that must execute together
- **⚖️ Load Balancing**: Worker capacity management
- **📅 Phase Windows**: Timing constraints for tasks
- **🎯 Priority Management**: Client importance handling
- **🔧 Custom Rules**: Flexible rule configuration

### 🎨 Modern UI/UX

- **🌙 Dark Theme**: Beautiful, modern interface
- **⚡ Smooth Animations**: Framer Motion powered transitions
- **📱 Mobile First**: Responsive design for all devices
- **🎯 Accessibility**: WCAG compliant components

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd data-alchemist
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up AI services** (Optional but recommended)
   ```bash
   cp .env.example .env.local
   # Add your AI API keys (see AI Setup section)
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🧠 AI Setup & Configuration

### 🆓 Free AI Options

The app works with multiple AI providers with generous free tiers:

#### Option 1: Google Gemini (Recommended)
- **Free Tier**: 15 requests/minute forever
- **Setup**: Visit [ai.google.dev](https://ai.google.dev/)
- **Best For**: Complex reasoning and rule generation

#### Option 2: Groq (Fast Inference)
- **Free Tier**: Fast inference with rate limits
- **Setup**: Visit [console.groq.com](https://console.groq.com/)
- **Best For**: Quick responses and real-time processing

#### Option 3: Transformers.js (No Setup Required)
- **100% Free**: Runs entirely in browser
- **No API Keys**: Works offline
- **Best For**: Privacy-conscious users

### Environment Variables

Create `.env.local` in the project root:

```env
# Google Gemini API Key (Free tier: 15 requests/minute)
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here

# Groq API Key (Free tier with fast inference)
NEXT_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
```

> **Note**: If no API keys are provided, the app automatically falls back to Transformers.js for 100% free operation.

## 📖 Usage Guide

### 1. Data Ingestion

**Upload Your Files**
- Drag & drop CSV or XLSX files
- Support for Clients, Workers, and Tasks data
- AI automatically maps columns to correct fields

**AI Column Mapping**
```
Original Header: "Employee Name" → Mapped to: "WorkerName"
Original Header: "Task Duration" → Mapped to: "Duration"
```

### 2. Natural Language Search

**Example Queries**:
```
"Find all tasks with duration more than 2 phases"
"Show me high priority clients"
"Workers with JavaScript skills"
"Tasks in phase 2 that require React skills"
```

**Advanced Queries**:
```
"Senior workers available in phases 1-3"
"High priority tasks lasting more than 2 phases"
"Overloaded workers with more than 5 tasks"
```

### 3. Data Validation

**Core Validations**:
- ✅ Missing required fields
- ✅ Duplicate IDs detection
- ✅ Data type validation
- ✅ Business logic constraints
- ✅ Skill coverage analysis
- ✅ Capacity vs demand validation

**AI-Enhanced Validations**:
- 🤖 Content quality analysis
- 🤖 Pattern anomaly detection
- 🤖 Relationship inconsistencies
- 🤖 Optimization opportunities

### 4. Natural Language Data Modification

**Example Commands**:
```
"Set priority of Acme Corp to 5"
"Add React skill to John Smith"
"Change duration of Task T1 to 3"
"Move all frontend tasks to phase 2"
"Set max load of senior workers to 4"
```

### 5. AI Rule Generation

**Automatic Suggestions**:
- Co-run recommendations based on shared skills
- Load balancing for worker groups
- Phase optimization suggestions
- Priority-based scheduling rules

**Natural Language Rules**:
```
"Tasks T1 and T2 should always run together"
"Limit senior workers to maximum 3 tasks per phase"
"All architecture tasks must complete before development"
```

### 6. Export & Integration

- Clean, validated CSV/XLSX export
- Rules configuration JSON
- Ready for downstream allocation systems

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15.3.4, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui, Framer Motion
- **AI**: Google Gemini, Groq, Transformers.js
- **Data**: PapaParse, XLSX, Zod validation
- **State**: Context API, React hooks

### AI Service Layer

```typescript
// Multi-provider AI with automatic fallback
aiService.processNaturalLanguageQuery()
aiService.validateDataWithAI()
aiService.generateRuleSuggestions()
aiService.processDataModification()
```

### Component Architecture

```
├── 📁 components/
│   ├── DataIngestionTab.tsx    # File upload & AI column mapping
│   ├── ValidationTab.tsx       # AI validation & search
│   ├── RulesTab.tsx           # AI rule generation
│   ├── DataGrid.tsx           # Interactive data tables
│   └── ui/                    # shadcn/ui components
├── 📁 lib/
│   └── ai/
│       └── ai-service.ts      # Multi-provider AI service
├── 📁 contexts/
│   └── DataContext.tsx        # Global state management
└── 📁 types/                  # TypeScript definitions
```

## 🔧 Development

### Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint checking
```

### Adding New Validations

```typescript
// Add to ValidationTab.tsx
const customValidation = (data: any[]) => {
  // Your validation logic
  return errors;
};
```

### Creating Custom AI Features

```typescript
// Extend ai-service.ts
async customAIFeature(input: string) {
  const response = await this.processWithGemini(input, context);
  return response;
}
```

## 📊 Sample Data

The app includes sample data files in `/public/samples/`:
- `clients.csv` - Client information and priorities
- `workers.csv` - Worker skills and availability  
- `tasks.csv` - Task requirements and constraints

### Data Format Requirements

**Clients**:
```csv
ClientID,ClientName,PriorityLevel,RequestedTaskIDs,GroupTag,AttributesJSON
C001,Acme Corp,4,"T001,T002",enterprise,"{""budget"":50000}"
```

**Workers**:
```csv
WorkerID,WorkerName,Skills,AvailableSlots,MaxLoadPerPhase,WorkerGroup,QualificationLevel
W001,John Smith,"React,TypeScript","[1,2,3]",3,senior,expert
```

**Tasks**:
```csv
TaskID,TaskName,Category,Duration,RequiredSkills,PreferredPhases,MaxConcurrent
T001,Frontend Development,development,2,"React,CSS","[1,2]",2
```

## 🎯 Use Cases

### Enterprise Resource Planning
- Project staffing optimization
- Skill gap analysis
- Capacity planning

### Consulting Firms
- Client priority management
- Resource allocation
- Project timeline optimization

### Software Teams
- Sprint planning
- Developer workload balancing
- Skill-based task assignment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) team for the amazing framework
- [shadcn/ui](https://ui.shadcn.com/) for beautiful components
- [Transformers.js](https://huggingface.co/docs/transformers.js) for browser-based AI
- [Google](https://ai.google.dev/) and [Groq](https://groq.com/) for AI APIs

## 📧 Support

- 📧 Email: [support@example.com](mailto:support@example.com)
- 💬 Discord: [Join our community](https://discord.gg/example)
- 📚 Docs: [Full documentation](https://docs.example.com)

---

**Made with ❤️ for the Digitalyz assignment - showcasing AI-first development and modern web technologies.**
