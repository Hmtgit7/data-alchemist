import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { pipeline, Pipeline } from '@xenova/transformers';

// Types
export interface AIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  confidence?: number;
}

export interface SearchCondition {
  entity: string;
  field: string;
  operator: string;
  value: string | number | string[] | number[];
}

export interface ValidationSuggestion {
  type: string;
  message: string;
  field: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
  confidence: number;
}

export interface RuleSuggestion {
  type: string;
  name: string;
  description: string;
  rationale: string;
  confidence: number;
  config: Record<string, unknown>;
}

class AIService {
  private genAI: GoogleGenerativeAI | null = null;
  private groq: Groq | null = null;
  private classifier: Pipeline | null = null;
  private embedder: Pipeline | null = null;
  private initialized = false;
  private initializing = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Don't initialize immediately - do it lazily
    if (typeof window !== 'undefined') {
      // Only initialize in browser environment
      setTimeout(() => this.initializeAI(), 100);
    }
  }

  private async initializeAI() {
    if (this.initializing || this.initialized) return;
    
    this.initializing = true;
    
    if (!this.initializationPromise) {
      this.initializationPromise = this.doInitialization();
    }
    
    return this.initializationPromise;
  }

  private async doInitialization() {
    try {
      console.log('Starting AI service initialization...');

      // Initialize Google Gemini (free tier)
      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
        try {
          this.genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
          console.log('Gemini AI initialized');
        } catch (error) {
          console.warn('Gemini AI failed to initialize:', error);
        }
      }

      // Initialize Groq (free tier)
      if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_GROQ_API_KEY) {
        try {
          this.groq = new Groq({
            apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
            dangerouslyAllowBrowser: true
          });
          console.log('Groq AI initialized');
        } catch (error) {
          console.warn('Groq AI failed to initialize:', error);
        }
      }

      // Initialize Transformers.js (browser-based models)
      if (typeof window !== 'undefined') {
        try {
          // Set model cache directory
          const { env } = await import('@xenova/transformers');
          
          // Use local cache directory in browser
          env.cacheDir = '/models/';
          env.allowLocalModels = false;
          env.allowRemoteModels = true;
          
          // Initialize with simpler models first
          console.log('Loading Transformers.js models...');
          
          // Try to load models with timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Model loading timeout')), 30000)
          );
          
          // Load classifier with fallback
          try {
            this.classifier = await Promise.race([
              pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english'),
              timeoutPromise
            ]) as Pipeline;
            console.log('Text classification model loaded');
          } catch (error) {
            console.warn('Text classification model failed to load:', error);
          }

          // Load embedder with fallback
          try {
            this.embedder = await Promise.race([
              pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2'),
              timeoutPromise
            ]) as Pipeline;
            console.log('Embedding model loaded');
          } catch (error) {
            console.warn('Embedding model failed to load:', error);
          }

        } catch (error) {
          console.warn('Transformers.js failed to initialize:', error);
        }
      }

      this.initialized = true;
      this.initializing = false;
      console.log('AI services initialization completed');
      console.log('Available services:', this.getAvailableServices());
      
    } catch (error) {
      console.error('AI services initialization failed:', error);
      this.initialized = true; // Still allow the app to work with pattern matching
      this.initializing = false;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized && !this.initializing) {
      await this.initializeAI();
    } else if (this.initializing && this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  // Natural Language Query Processing
  async processNaturalLanguageQuery(query: string, dataContext: Record<string, unknown>): Promise<AIResponse> {
    await this.ensureInitialized();

    try {
      // Try Gemini first for complex reasoning
      if (this.genAI) {
        return await this.processWithGemini(query, dataContext);
      }

      // Fallback to Groq
      if (this.groq) {
        return await this.processWithGroq(query, dataContext);
      }

      // Fallback to pattern matching with Transformers.js
      return await this.processWithTransformers(query);
    } catch (error) {
      console.error('AI query processing failed:', error);
      return { success: false, error: 'Failed to process query' };
    }
  }

  private async processWithGemini(query: string, dataContext: Record<string, unknown>): Promise<AIResponse> {
    const model = this.genAI!.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
You are a data analysis AI. Given this query and data context, generate search conditions.

Query: "${query}"

Data Context:
- Clients: ${(dataContext.clients as unknown[])?.length || 0} records
- Workers: ${(dataContext.workers as unknown[])?.length || 0} records  
- Tasks: ${(dataContext.tasks as unknown[])?.length || 0} records

Available fields:
Clients: ClientID, ClientName, PriorityLevel (1-5), RequestedTaskIDs, GroupTag, AttributesJSON
Workers: WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel
Tasks: TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent

Return a JSON array of search conditions with this structure:
[{
  "entity": "clients|workers|tasks",
  "field": "field_name",
  "operator": "=|>|<|>=|<=|contains|includes|includes_range",
  "value": "value"
}]

Example queries:
- "tasks with duration more than 2" → [{"entity": "tasks", "field": "Duration", "operator": ">", "value": 2}]
- "high priority clients" → [{"entity": "clients", "field": "PriorityLevel", "operator": ">=", "value": 4}]
- "workers with JavaScript skills" → [{"entity": "workers", "field": "Skills", "operator": "contains", "value": "JavaScript"}]

Respond with ONLY the JSON array, no other text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    try {
      const conditions = JSON.parse(text);
      return { success: true, data: conditions, confidence: 0.9 };
    } catch {
      return { success: false, error: 'Failed to parse AI response' };
    }
  }

  private async processWithGroq(query: string, dataContext: Record<string, unknown>): Promise<AIResponse> {
    const completion = await this.groq!.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a data analysis AI that converts natural language queries to structured search conditions. Respond with only valid JSON."
        },
        {
          role: "user",
          content: `Query: "${query}"\nData: ${JSON.stringify(dataContext, null, 2)}`
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.1,
      max_tokens: 1000,
    });

    try {
      const conditions = JSON.parse(completion.choices[0]?.message?.content || '[]');
      return { success: true, data: conditions, confidence: 0.85 };
    } catch {
      return { success: false, error: 'Failed to parse AI response' };
    }
  }

  private async processWithTransformers(query: string): Promise<AIResponse> {
    // Enhanced pattern matching with semantic understanding
    const conditions: SearchCondition[] = [];
    const lowerQuery = query.toLowerCase();

    console.log('Pattern matching for query:', lowerQuery);

    // Use embedding similarity for better matching (if available)
    if (this.embedder) {
      try {
        await this.embedder(query);
        // Store embeddings for semantic search (simplified for demo)
        console.log('Query embedding generated for semantic search');
      } catch {
        console.warn('Embedding generation failed, using pattern matching');
      }
    }

    // Handle "all [entity]" queries first
    if (/^all\s+(clients?|workers?|tasks?)/.test(lowerQuery)) {
      const entityMatch = lowerQuery.match(/^all\s+(clients?|workers?|tasks?)/);
      if (entityMatch) {
        let entity = entityMatch[1];
        if (entity.endsWith('s')) entity = entity.slice(0, -1); // Remove plural
        
        console.log('Detected "all" query for entity:', entity);
        
        // Return all entities by using a condition that always matches
        conditions.push({
          entity: entity + 's', // Make it plural for consistency
          field: 'all',
          operator: 'all',
          value: '*'
        });
        
        console.log('Generated "all" condition:', conditions);
        return { success: true, data: conditions, confidence: 0.9 };
      }
    }

    // Enhanced pattern matching with comprehensive coverage
    const patterns = {
      // Duration patterns
      durationMore: /(?:tasks?\s*(?:with\s*)?)?duration\s*(?:of\s*)?(?:more\s*than|greater\s*than|>\s*|above\s*|over\s*)(\d+)/,
      durationLess: /(?:tasks?\s*(?:with\s*)?)?duration\s*(?:of\s*)?(?:less\s*than|<\s*|below\s*|under\s*)(\d+)/,
      durationEqual: /(?:tasks?\s*(?:with\s*)?)?duration\s*(?:of\s*)?(?:equals?|=\s*|is\s*)(\d+)/,
      durationRange: /(?:tasks?\s*(?:with\s*)?)?duration\s*(?:between\s*)(\d+)\s*(?:and|to)\s*(\d+)/,
      longTasks: /long\s*(?:running\s*)?tasks?\s*\(?\s*>\s*(\d+)\s*\)?/,
      shortTasks: /short\s*(?:running\s*)?tasks?\s*\(?\s*<\s*(\d+)\s*\)?/,
      
      // Priority patterns
      priority: /(?:clients?\s*(?:with\s*)?)?priority\s*(?:level\s*)?(?:of\s*)?(\d+)/,
      highPriority: /high\s*priority\s*(?:clients?|customers?)/,
      lowPriority: /low\s*priority\s*(?:clients?|customers?)/,
      criticalPriority: /critical\s*(?:clients?|customers?)/,
      
      // Skills patterns
      skillsWith: /(?:workers?\s*(?:with\s*)?(?:skill|skills)\s*(?:in\s*)?|skilled\s*in\s*)([a-zA-Z\s,.-]+)/,
      skillsOf: /(?:skill|skills)\s*(?:of\s*)?([a-zA-Z\s,.-]+)/,
      experts: /(?:expert|experienced)\s*(?:in\s*)?([a-zA-Z\s,.-]+)/,
      specialists: /([a-zA-Z]+)\s*(?:specialists?|experts?|developers?)/,
      
      // Phase patterns
      phase: /(?:tasks?\s*(?:in\s*)?)?phase\s*(\d+)/,
      phaseRange: /(?:tasks?\s*(?:in\s*)?)?phases?\s*(\d+)(?:\s*(?:to|through|\-)\s*(\d+))?/,
      earlyPhases: /(?:tasks?\s*(?:in\s*)?)?early\s*phases?/,
      latePhases: /(?:tasks?\s*(?:in\s*)?)?late\s*phases?/,
      
      // Worker group patterns
      seniorWorkers: /(?:senior|experienced|expert)\s*(?:workers?|employees?)/,
      juniorWorkers: /(?:junior|entry\s*level|beginner)\s*(?:workers?|employees?)/,
      midLevelWorkers: /(?:mid\s*level|intermediate)\s*(?:workers?|employees?)/,
      
      // Task category patterns
      category: /(?:tasks?\s*(?:of\s*)?)?category\s*(?:of\s*)?([a-zA-Z\s-]+)/,
      taskType: /([a-zA-Z]+)\s*tasks?/,
      
      // Availability patterns
      available: /available\s*(?:workers?|slots?)/,
      busy: /busy\s*(?:workers?)/,
      overloaded: /overloaded\s*(?:workers?)/,
      
      // Concurrent patterns
      concurrent: /concurrent\s*(?:tasks?|jobs?)\s*(?:more\s*than\s*)?(\d+)/,
      maxConcurrent: /max\s*concurrent\s*(?:tasks?|jobs?)\s*(?:of\s*)?(\d+)/
    };

    console.log('Checking patterns for matches...');
    
    Object.entries(patterns).forEach(([key, pattern]) => {
      const match = lowerQuery.match(pattern);
      if (match) {
        console.log(`Pattern '${key}' matched:`, match);
        switch (key) {
          case 'durationMore':
            conditions.push({
              entity: 'tasks',
              field: 'Duration',
              operator: '>',
              value: parseInt(match[1])
            });
            break;
          case 'durationLess':
            conditions.push({
              entity: 'tasks',
              field: 'Duration',
              operator: '<',
              value: parseInt(match[1])
            });
            break;
          case 'durationEqual':
            conditions.push({
              entity: 'tasks',
              field: 'Duration',
              operator: '=',
              value: parseInt(match[1])
            });
            break;
          case 'durationRange':
            conditions.push({
              entity: 'tasks',
              field: 'Duration',
              operator: '>=',
              value: parseInt(match[1])
            });
            conditions.push({
              entity: 'tasks',
              field: 'Duration',
              operator: '<=',
              value: parseInt(match[2])
            });
            break;
          case 'longTasks':
            conditions.push({
              entity: 'tasks',
              field: 'Duration',
              operator: '>',
              value: parseInt(match[1])
            });
            break;
          case 'shortTasks':
            conditions.push({
              entity: 'tasks',
              field: 'Duration',
              operator: '<',
              value: parseInt(match[1])
            });
            break;
          case 'priority':
            conditions.push({
              entity: 'clients',
              field: 'PriorityLevel',
              operator: '=',
              value: parseInt(match[1])
            });
            break;
          case 'highPriority':
          case 'criticalPriority':
            const priorityCondition = {
              entity: 'clients',
              field: 'PriorityLevel',
              operator: '>=',
              value: 4
            };
            console.log('Generated high priority condition:', priorityCondition);
            conditions.push(priorityCondition);
            break;
          case 'lowPriority':
            conditions.push({
              entity: 'clients',
              field: 'PriorityLevel',
              operator: '<=',
              value: 2
            });
            break;
          case 'skillsWith':
          case 'skillsOf':
          case 'experts':
            const skillText = match[1].trim();
            const skills = skillText.includes(',') ? 
              skillText.split(',').map(s => s.trim()) : 
              [skillText];
            conditions.push({
              entity: 'workers',
              field: 'Skills',
              operator: 'contains',
              value: skills
            });
            break;
          case 'specialists':
            conditions.push({
              entity: 'workers',
              field: 'Skills',
              operator: 'contains',
              value: match[1]
            });
            break;
          case 'phase':
            conditions.push({
              entity: 'tasks',
              field: 'PreferredPhases',
              operator: 'includes',
              value: parseInt(match[1])
            });
            break;
          case 'phaseRange':
            const startPhase = parseInt(match[1]);
            const endPhase = match[2] ? parseInt(match[2]) : startPhase;
            conditions.push({
              entity: 'tasks',
              field: 'PreferredPhases',
              operator: endPhase > startPhase ? 'includes_range' : 'includes',
              value: endPhase > startPhase ? [startPhase, endPhase] : startPhase
            });
            break;
          case 'earlyPhases':
            conditions.push({
              entity: 'tasks',
              field: 'PreferredPhases',
              operator: 'includes_range',
              value: [1, 2]
            });
            break;
          case 'latePhases':
            conditions.push({
              entity: 'tasks',
              field: 'PreferredPhases',
              operator: 'includes_range',
              value: [5, 6]
            });
            break;
          case 'seniorWorkers':
            conditions.push({
              entity: 'workers',
              field: 'QualificationLevel',
              operator: '=',
              value: 'senior'
            });
            break;
          case 'juniorWorkers':
            conditions.push({
              entity: 'workers',
              field: 'QualificationLevel',
              operator: '=',
              value: 'junior'
            });
            break;
          case 'midLevelWorkers':
            conditions.push({
              entity: 'workers',
              field: 'QualificationLevel',
              operator: '=',
              value: 'mid'
            });
            break;
          case 'category':
          case 'taskType':
            conditions.push({
              entity: 'tasks',
              field: 'Category',
              operator: 'contains',
              value: match[1].trim()
            });
            break;
          case 'concurrent':
          case 'maxConcurrent':
            conditions.push({
              entity: 'tasks',
              field: 'MaxConcurrent',
              operator: '>',
              value: parseInt(match[1])
            });
            break;
          // Additional availability patterns
          case 'available':
            conditions.push({
              entity: 'workers',
              field: 'AvailableSlots',
              operator: '>',
              value: 0
            });
            break;
          case 'busy':
            conditions.push({
              entity: 'workers',
              field: 'AvailableSlots',
              operator: '=',
              value: 0
            });
            break;
          case 'overloaded':
            conditions.push({
              entity: 'workers',
              field: 'MaxLoadPerPhase',
              operator: '<',
              value: 3
            });
            break;
        }
      }
    });

    console.log('Final conditions generated:', conditions);
    return { success: true, data: conditions, confidence: 0.7 };
  }

  // Data Validation with AI
  async validateDataWithAI(data: Record<string, unknown>[], entityType: string): Promise<ValidationSuggestion[]> {
    await this.ensureInitialized();

    const suggestions: ValidationSuggestion[] = [];

    try {
      if (this.genAI) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `
Analyze this ${entityType} data for potential issues and suggest improvements:

${JSON.stringify(data.slice(0, 5), null, 2)}

Look for:
1. Data quality issues (missing values, inconsistencies)
2. Business logic violations
3. Optimization opportunities
4. Potential errors or anomalies

Return suggestions as JSON array:
[{
  "type": "validation_type",
  "message": "Issue description",
  "field": "field_name",
  "severity": "error|warning|info",
  "suggestion": "How to fix it",
  "confidence": 0.85
}]

Respond with ONLY the JSON array.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        try {
          const aiSuggestions = JSON.parse(text);
          suggestions.push(...aiSuggestions);
        } catch (error) {
          console.warn('Failed to parse AI validation response:', error);
        }
      }

      // Add Transformers.js based validation
      if (this.classifier) {
        for (const item of data.slice(0, 10)) {
          const textFields = Object.entries(item)
            .filter(([, value]) => typeof value === 'string' && value.length > 0)
            .map(([key, value]) => ({ key, value: value as string }));

          for (const { key, value } of textFields) {
            if (value.length > 5) {
              const sentiment = await this.classifier(value);
              
              if (Array.isArray(sentiment) && sentiment[0]?.label === 'NEGATIVE' && sentiment[0]?.score > 0.8) {
                suggestions.push({
                  type: 'content_quality',
                  message: `Potential negative content detected in ${key}`,
                  field: key,
                  severity: 'warning',
                  suggestion: 'Review content for professionalism',
                  confidence: sentiment[0]?.score || 0.8
                });
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('AI validation failed:', error);
    }

    return suggestions;
  }

  // Rule Generation with AI
  async generateRuleSuggestions(dataContext: Record<string, unknown>): Promise<RuleSuggestion[]> {
    await this.ensureInitialized();

    try {
      if (this.genAI) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `
Analyze this business data and suggest optimal allocation rules:

Clients: ${(dataContext.clients as unknown[])?.length || 0} records
Workers: ${(dataContext.workers as unknown[])?.length || 0} records
Tasks: ${(dataContext.tasks as unknown[])?.length || 0} records

Sample data:
${JSON.stringify({
  clients: (dataContext.clients as unknown[])?.slice(0, 3) || [],
  workers: (dataContext.workers as unknown[])?.slice(0, 3) || [],
  tasks: (dataContext.tasks as unknown[])?.slice(0, 3) || []
}, null, 2)}

Suggest rules for:
1. Co-run tasks (tasks that should run together)
2. Load limits (worker capacity constraints)
3. Phase windows (timing constraints)
4. Skill matching (capability requirements)
5. Priority handling (client importance)

Return JSON array:
[{
  "type": "rule_type",
  "name": "Rule name",
  "description": "What this rule does",
  "rationale": "Why this rule is needed",
  "confidence": 0.85,
  "config": {"parameter": "value"}
}]

Respond with ONLY the JSON array.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        try {
          return JSON.parse(text);
        } catch (error) {
          console.warn('Failed to parse AI rule suggestions:', error);
        }
      }
    } catch (error) {
      console.error('AI rule generation failed:', error);
    }

    return [];
  }

  // Natural Language Data Modification
  async processDataModification(instruction: string, data: Record<string, unknown>[]): Promise<AIResponse> {
    await this.ensureInitialized();

    try {
      if (this.genAI) {
        const model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const prompt = `
Execute this data modification instruction:
"${instruction}"

Current data sample:
${JSON.stringify(data.slice(0, 3), null, 2)}

Return the modification as JSON:
{
  "action": "update|add|delete",
  "conditions": [{"field": "field_name", "operator": "=", "value": "value"}],
  "changes": {"field_name": "new_value"},
  "affected_count": 5
}

If the instruction is unclear or unsafe, return:
{"error": "Description of the issue"}

Respond with ONLY the JSON object.
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        try {
          const modification = JSON.parse(text);
          return { success: true, data: modification, confidence: 0.8 };
        } catch {
          return { success: false, error: 'Failed to parse modification instructions' };
        }
      }
    } catch (error) {
      console.error('AI modification failed:', error);
    }

    return { success: false, error: 'AI modification not available' };
  }

  // Semantic Search
  async semanticSearch(query: string, data: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    await this.ensureInitialized();

    if (!this.embedder || data.length === 0) {
      return [];
    }

    try {
              const queryEmbedding = await this.embedder(query);
        const results: Array<Record<string, unknown> & { _similarity: number }> = [];

      for (const item of data) {
        const itemText = Object.values(item).join(' ');
        const itemEmbedding = await this.embedder(itemText);
        
        // Simple cosine similarity (simplified)
        const similarity = this.cosineSimilarity(queryEmbedding, itemEmbedding);
        
        if (similarity > 0.7) {
          results.push({ ...item, _similarity: similarity });
        }
      }

      return results.sort((a, b) => b._similarity - a._similarity);
    } catch {
      console.error('Semantic search failed');
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  // Check if AI services are available
  isAvailable(): boolean {
    return this.initialized && (!!this.genAI || !!this.groq || !!this.classifier);
  }

  getAvailableServices(): string[] {
    const services = [];
    if (this.genAI) services.push('Gemini');
    if (this.groq) services.push('Groq');
    if (this.classifier) services.push('Transformers');
    return services;
  }
}

// Singleton instance
export const aiService = new AIService();
export default aiService; 