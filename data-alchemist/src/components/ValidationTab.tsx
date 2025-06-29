import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Search, Brain, Zap, Wand2, Filter } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import aiService, { SearchCondition } from '@/lib/ai/ai-service';

interface ValidationError {
  type: string;
  message: string;
  entity: string;
  field?: string;
  severity: 'error' | 'warning';
}

interface SearchResult {
  ClientID?: string;
  WorkerID?: string;
  TaskID?: string;
  ClientName?: string;
  WorkerName?: string;
  TaskName?: string;
  [key: string]: string | number | boolean | undefined;
}

interface AiSuggestion {
  type: string;
  message: string;
  action: string;
  data: Record<string, unknown>;
}

const ValidationTab = () => {
  const { clients, workers, tasks, validationErrors, setValidationErrors, rules, setClients, setWorkers, setTasks } = useData();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [naturalLanguageSearch, setNaturalLanguageSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [naturalLanguageModification, setNaturalLanguageModification] = useState('');
  const [isModifying, setIsModifying] = useState(false);

  // Enhanced natural language search parser
  const parseNaturalLanguageQuery = (query: string): SearchCondition[] => {
    const lowerQuery = query.toLowerCase();
    const conditions: SearchCondition[] = [];

    // Duration conditions - enhanced patterns
    const durationPatterns = [
      /duration\s*(?:of\s*)?(?:more\s*than|greater\s*than|>\s*|above\s*)(\d+)/,
      /duration\s*(?:of\s*)?(?:less\s*than|<\s*|below\s*)(\d+)/,
      /duration\s*(?:of\s*)?(?:equals?|=\s*|is\s*)(\d+)/,
      /tasks?\s*(?:that\s*)?(?:take|last|require)\s*(?:more\s*than\s*)?(\d+)\s*(?:phases?|periods?)/,
      /long\s*(?:running\s*)?tasks?\s*\(?\s*>\s*(\d+)\s*\)?/
    ];

    durationPatterns.forEach(pattern => {
      const match = lowerQuery.match(pattern);
      if (match) {
        const operator = pattern.source.includes('less|<|below') ? '<' : 
                        pattern.source.includes('equals|=|is') ? '=' : '>';
        conditions.push({
          entity: 'tasks',
          field: 'Duration',
          operator,
          value: parseInt(match[1])
        });
      }
    });

    // Priority conditions - enhanced patterns
    const priorityPatterns = [
      /priority\s*(?:level\s*)?(?:of\s*)?(\d+)/,
      /high\s*priority\s*(?:clients?|customers?)/,
      /low\s*priority\s*(?:clients?|customers?)/,
      /critical\s*(?:clients?|customers?)/,
      /(?:clients?|customers?)\s*(?:with\s*)?priority\s*(?:level\s*)?(\d+)/
    ];

    priorityPatterns.forEach(pattern => {
      const match = lowerQuery.match(pattern);
      if (match) {
        if (pattern.source.includes('high|critical')) {
          conditions.push({
            entity: 'clients',
            field: 'PriorityLevel',
            operator: '>=',
            value: 4
          });
        } else if (pattern.source.includes('low')) {
          conditions.push({
            entity: 'clients',
            field: 'PriorityLevel',
            operator: '<=',
            value: 2
          });
        } else if (match[1]) {
          conditions.push({
            entity: 'clients',
            field: 'PriorityLevel',
            operator: '=',
            value: parseInt(match[1])
          });
        }
      }
    });

    // Phase conditions - enhanced patterns
    const phasePatterns = [
      /phase\s*(\d+)/,
      /(?:in\s*)?phases?\s*(\d+)(?:\s*(?:to|through|\-)\s*(\d+))?/,
      /(?:scheduled\s*(?:for|in)\s*)?phase\s*(\d+)/,
      /early\s*phases?/,
      /late\s*phases?/
    ];

    phasePatterns.forEach(pattern => {
      const match = lowerQuery.match(pattern);
      if (match) {
        if (pattern.source.includes('early')) {
          conditions.push({
            entity: 'tasks',
            field: 'PreferredPhases',
            operator: 'includes_range',
            value: [1, 2]
          });
        } else if (pattern.source.includes('late')) {
          conditions.push({
            entity: 'tasks',
            field: 'PreferredPhases',
            operator: 'includes_range',
            value: [5, 6]
          });
        } else if (match[1]) {
          const startPhase = parseInt(match[1]);
          const endPhase = match[2] ? parseInt(match[2]) : startPhase;
          conditions.push({
            entity: 'tasks',
            field: 'PreferredPhases',
            operator: endPhase > startPhase ? 'includes_range' : 'includes',
            value: endPhase > startPhase ? [startPhase, endPhase] : startPhase
          });
        }
      }
    });

    // Skill conditions - enhanced patterns
    const skillPatterns = [
      /(?:workers?\s*(?:with\s*)?(?:skill|skills)\s*(?:in\s*)?|skilled\s*in\s*)([a-zA-Z,\s]+)/,
      /(?:skill|skills)\s*(?:of\s*)?([a-zA-Z,\s]+)/,
      /(?:expert|experienced)\s*(?:in\s*)?([a-zA-Z,\s]+)/,
      /([a-zA-Z]+)\s*(?:specialists?|experts?|developers?)/
    ];

    skillPatterns.forEach(pattern => {
      const match = lowerQuery.match(pattern);
      if (match) {
        const skillText = match[1].trim();
        const skills = skillText.includes(',') ? 
          skillText.split(',').map(s => s.trim()) : 
          [skillText];
        conditions.push({
          entity: 'workers',
          field: 'Skills',
          operator: 'includes',
          value: skills
        });
      }
    });

    // Worker group conditions
    const groupPatterns = [
      /(?:senior|experienced|expert)\s*(?:workers?|employees?)/,
      /(?:junior|entry\s*level|beginner)\s*(?:workers?|employees?)/,
      /(?:mid\s*level|intermediate)\s*(?:workers?|employees?)/
    ];

    groupPatterns.forEach(pattern => {
      const match = lowerQuery.match(pattern);
      if (match) {
        let groupValue = '';
        if (pattern.source.includes('senior|experienced|expert')) {
          groupValue = 'senior';
        } else if (pattern.source.includes('junior|entry|beginner')) {
          groupValue = 'junior';
        } else if (pattern.source.includes('mid|intermediate')) {
          groupValue = 'mid';
        }
        
        if (groupValue) {
          conditions.push({
            entity: 'workers',
            field: 'WorkerGroup',
            operator: '=',
            value: groupValue
          });
        }
      }
    });

    // Name conditions - enhanced patterns
    const namePatterns = [
      /(?:named?|called)\s*([a-zA-Z\s]+)/,
      /(?:client|worker|task)\s*(?:with\s*)?(?:name|title)\s*([a-zA-Z\s]+)/,
      /([A-Z][a-zA-Z\s]*(?:Corp|Inc|Ltd|Company|Solutions|Labs|Industries))/
    ];

    namePatterns.forEach(pattern => {
      const match = lowerQuery.match(pattern);
      if (match) {
        conditions.push({
          entity: 'all',
          field: 'Name',
          operator: 'contains',
          value: match[1].trim()
        });
      }
    });

    // Category conditions
    const categoryMatch = lowerQuery.match(/(?:category|type)\s*(?:of\s*)?([a-zA-Z]+)/);
    if (categoryMatch) {
      conditions.push({
        entity: 'tasks',
        field: 'Category',
        operator: '=',
        value: categoryMatch[1]
      });
    }

    // Concurrent conditions
    const concurrentMatch = lowerQuery.match(/(?:concurrent|parallel|simultaneous)\s*(?:tasks?|jobs?)\s*(?:more\s*than\s*)?(\d+)/);
    if (concurrentMatch) {
      conditions.push({
        entity: 'tasks',
        field: 'MaxConcurrent',
        operator: '>',
        value: parseInt(concurrentMatch[1])
      });
    }

    return conditions;
  };

  const executeSearch = (conditions: SearchCondition[]): SearchResult[] => {
    const results: SearchResult[] = [];
    console.log('Executing search with conditions:', conditions);

    conditions.forEach(condition => {
      console.log('Processing condition:', condition);
      // Handle "all" queries - return all entities of the specified type
      if (condition.field === 'all' && condition.operator === 'all') {
        if (condition.entity === 'clients') {
          clients.forEach(client => {
            results.push({
              ClientID: client.ClientID,
              ClientName: client.ClientName,
              PriorityLevel: client.PriorityLevel,
              RequestedTaskIDs: client.RequestedTaskIDs,
              GroupTag: client.GroupTag
            });
          });
        } else if (condition.entity === 'workers') {
          console.log('Processing all workers, available workers:', workers.length);
          workers.forEach(worker => {
            console.log('Adding worker to results:', worker);
            results.push({
              WorkerID: worker.WorkerID,
              WorkerName: worker.WorkerName,
              Skills: worker.Skills,
              AvailableSlots: worker.AvailableSlots,
              MaxLoadPerPhase: worker.MaxLoadPerPhase,
              WorkerGroup: worker.WorkerGroup,
              QualificationLevel: worker.QualificationLevel
            });
          });
        } else if (condition.entity === 'tasks') {
          tasks.forEach(task => {
            results.push({
              TaskID: task.TaskID,
              TaskName: task.TaskName,
              Category: task.Category,
              Duration: task.Duration,
              RequiredSkills: task.RequiredSkills,
              PreferredPhases: task.PreferredPhases,
              MaxConcurrent: task.MaxConcurrent
            });
          });
        }
        return; // Skip the rest of the processing for this condition
      }

      if (condition.entity === 'clients' || condition.entity === 'all') {
        console.log('Processing clients, available clients:', clients.length);
        clients.forEach(client => {
          let matches = false;
          console.log('Checking client:', client.ClientName, 'Priority:', client.PriorityLevel);

          if (condition.field === 'PriorityLevel') {
            const clientPriority = Number(client.PriorityLevel);
            const conditionValue = Number(condition.value);
            console.log(`Comparing client priority ${clientPriority} ${condition.operator} ${conditionValue}`);
            
            switch (condition.operator) {
              case '=':
                matches = clientPriority === conditionValue;
                break;
              case '>':
                matches = clientPriority > conditionValue;
                break;
              case '<':
                matches = clientPriority < conditionValue;
                break;
              case '>=':
                matches = clientPriority >= conditionValue;
                break;
              case '<=':
                matches = clientPriority <= conditionValue;
                break;
            }
            console.log('Priority match result:', matches);
          } else if (condition.field === 'Name' && condition.operator === 'contains') {
            matches = client.ClientName.toLowerCase().includes(String(condition.value).toLowerCase());
          }

          if (matches) {
            console.log('Client matched, adding to results:', client.ClientName);
            results.push({
              ClientID: client.ClientID,
              ClientName: client.ClientName,
              PriorityLevel: client.PriorityLevel,
              RequestedTaskIDs: client.RequestedTaskIDs,
              GroupTag: client.GroupTag
            });
          }
        });
      }

      if (condition.entity === 'workers' || condition.entity === 'all') {
        console.log('Processing workers search, available workers:', workers.length);
        workers.forEach(worker => {
          let matches = false;
          console.log('Checking worker:', worker.WorkerName, 'Skills:', worker.Skills);

          if (condition.field === 'Skills' && (condition.operator === 'includes' || condition.operator === 'contains')) {
            const workerSkills = String(worker.Skills || '').toLowerCase().split(',').map(s => s.trim());
            const searchSkills = Array.isArray(condition.value) ? 
              condition.value.map((s: string | number) => String(s).toLowerCase()) : 
              [String(condition.value).toLowerCase()];
            
            matches = searchSkills.some(skill => 
              workerSkills.some(workerSkill => workerSkill.includes(skill))
            );
            console.log('Skills match result:', matches);
          } else if (condition.field === 'QualificationLevel' && condition.operator === '=') {
            matches = String(worker.QualificationLevel || '').toLowerCase() === String(condition.value).toLowerCase();
            console.log('QualificationLevel match result:', matches);
          } else if (condition.field === 'AvailableSlots') {
            const availableSlots = Number(worker.AvailableSlots);
            const conditionValue = Number(condition.value);
            
            switch (condition.operator) {
              case '=':
                matches = availableSlots === conditionValue;
                break;
              case '>':
                matches = availableSlots > conditionValue;
                break;
              case '<':
                matches = availableSlots < conditionValue;
                break;
              case '>=':
                matches = availableSlots >= conditionValue;
                break;
              case '<=':
                matches = availableSlots <= conditionValue;
                break;
            }
            console.log('AvailableSlots match result:', matches);
          } else if (condition.field === 'MaxLoadPerPhase') {
            const maxLoad = Number(worker.MaxLoadPerPhase);
            const conditionValue = Number(condition.value);
            
            switch (condition.operator) {
              case '=':
                matches = maxLoad === conditionValue;
                break;
              case '>':
                matches = maxLoad > conditionValue;
                break;
              case '<':
                matches = maxLoad < conditionValue;
                break;
              case '>=':
                matches = maxLoad >= conditionValue;
                break;
              case '<=':
                matches = maxLoad <= conditionValue;
                break;
            }
            console.log('MaxLoadPerPhase match result:', matches);
          } else if (condition.field === 'WorkerGroup' && condition.operator === '=') {
            matches = String(worker.WorkerGroup || '').toLowerCase() === String(condition.value).toLowerCase();
            console.log('WorkerGroup match result:', matches);
          } else if (condition.field === 'Name' && condition.operator === 'contains') {
            matches = String(worker.WorkerName || '').toLowerCase().includes(String(condition.value).toLowerCase());
            console.log('Name match result:', matches);
          }

          if (matches) {
            console.log('Worker matched, adding to results:', worker.WorkerName);
            results.push({
              WorkerID: worker.WorkerID,
              WorkerName: worker.WorkerName,
              Skills: worker.Skills,
              AvailableSlots: worker.AvailableSlots,
              MaxLoadPerPhase: worker.MaxLoadPerPhase,
              WorkerGroup: worker.WorkerGroup,
              QualificationLevel: worker.QualificationLevel
            });
          }
        });
      }

      if (condition.entity === 'tasks' || condition.entity === 'all') {
        tasks.forEach(task => {
          let matches = false;

          if (condition.field === 'Duration') {
            const taskDuration = task.Duration;
            const conditionValue = Number(condition.value);
            
            switch (condition.operator) {
              case '=':
                matches = taskDuration === conditionValue;
                break;
              case '>':
                matches = taskDuration > conditionValue;
                break;
              case '<':
                matches = taskDuration < conditionValue;
                break;
              case '>=':
                matches = taskDuration >= conditionValue;
                break;
              case '<=':
                matches = taskDuration <= conditionValue;
                break;
            }
          } else if (condition.field === 'PreferredPhases') {
            try {
              let phases: number[] = [];
              
              // Handle JSON array format
              try {
                phases = JSON.parse(task.PreferredPhases);
              } catch {
                // Handle range format like "1-3"
                const rangeMatch = task.PreferredPhases.match(/^(\d+)-(\d+)$/);
                if (rangeMatch) {
                  const start = parseInt(rangeMatch[1]);
                  const end = parseInt(rangeMatch[2]);
                  phases = Array.from({ length: end - start + 1 }, (_, i) => start + i);
                }
              }

              if (Array.isArray(phases)) {
                if (condition.operator === 'includes') {
                  matches = phases.includes(Number(condition.value));
                } else if (condition.operator === 'includes_range') {
                  const [start, end] = condition.value as [number, number];
                  matches = phases.some(phase => phase >= start && phase <= end);
                }
              }
            } catch {
              // Skip malformed data
            }
          } else if (condition.field === 'Category' && (condition.operator === '=' || condition.operator === 'contains')) {
            if (condition.operator === '=') {
            matches = task.Category.toLowerCase() === String(condition.value).toLowerCase();
            } else {
              matches = task.Category.toLowerCase().includes(String(condition.value).toLowerCase());
            }
          } else if (condition.field === 'RequiredSkills' && condition.operator === 'contains') {
            const taskSkills = task.RequiredSkills.toLowerCase().split(',').map(s => s.trim());
            const searchValue = String(condition.value).toLowerCase();
            matches = taskSkills.some(skill => skill.includes(searchValue));
          } else if (condition.field === 'MaxConcurrent') {
            const taskConcurrent = task.MaxConcurrent;
            const conditionValue = Number(condition.value);
            
            switch (condition.operator) {
              case '=':
                matches = taskConcurrent === conditionValue;
                break;
              case '>':
                matches = taskConcurrent > conditionValue;
                break;
              case '<':
                matches = taskConcurrent < conditionValue;
                break;
              case '>=':
                matches = taskConcurrent >= conditionValue;
                break;
              case '<=':
                matches = taskConcurrent <= conditionValue;
                break;
            }
          } else if (condition.field === 'Name' && condition.operator === 'contains') {
            matches = task.TaskName.toLowerCase().includes(String(condition.value).toLowerCase());
          }

          if (matches) {
            results.push({
              TaskID: task.TaskID,
              TaskName: task.TaskName,
              Category: task.Category,
              Duration: task.Duration,
              RequiredSkills: task.RequiredSkills,
              PreferredPhases: task.PreferredPhases,
              MaxConcurrent: task.MaxConcurrent
            });
          }
        });
      }
    });

    // Remove duplicates
    return results.filter((result, index, self) => 
      index === self.findIndex(r => 
        (r.ClientID && r.ClientID === result.ClientID) ||
        (r.WorkerID && r.WorkerID === result.WorkerID) ||
        (r.TaskID && r.TaskID === result.TaskID)
      )
    );
  };

  const handleNaturalLanguageSearch = async () => {
    if (!naturalLanguageSearch.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter a search query.",
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Processing natural language search:', naturalLanguageSearch);
      
      // Use AI service for natural language processing
      const dataContext = { clients, workers, tasks };
      const aiResponse = await aiService.processNaturalLanguageQuery(naturalLanguageSearch, dataContext);
      
      console.log('AI Response:', aiResponse);
      
      let conditions: SearchCondition[] = [];
      
      if (aiResponse.success && aiResponse.data && Array.isArray(aiResponse.data)) {
        conditions = aiResponse.data;
        console.log('Using AI-generated conditions:', conditions);
      } else {
        // Fallback to pattern matching
        console.log('AI failed, using pattern matching fallback');
        conditions = parseNaturalLanguageQuery(naturalLanguageSearch);
        console.log('Pattern-based conditions:', conditions);
      }
      
      if (conditions.length === 0) {
        toast({
          title: "No search conditions found",
          description: "Could not understand the search query. Try using simpler terms like 'high priority clients' or 'workers with JavaScript skills'.",
          variant: "destructive"
        });
        return;
      }
      
      // Execute search with the conditions
    const results = executeSearch(conditions);
      console.log('Search results:', results);
      
    setSearchResults(results);

    toast({
      title: "Search completed",
        description: `Found ${results.length} result(s) for "${naturalLanguageSearch}"`,
      });
      
    } catch (error) {
      console.error('Natural language search failed:', error);
      
      // Try pattern matching as fallback
      try {
        console.log('Attempting pattern matching fallback...');
        const conditions = parseNaturalLanguageQuery(naturalLanguageSearch);
        
        if (conditions.length > 0) {
          const results = executeSearch(conditions);
          setSearchResults(results);
          
          toast({
            title: "Search completed (pattern matching)",
            description: `Found ${results.length} result(s) using pattern matching`,
          });
        } else {
          throw new Error('No patterns matched');
        }
      } catch (fallbackError) {
        console.error('Pattern matching fallback also failed:', fallbackError);
        toast({
          title: "Search failed",
          description: "Could not process your search query. Please try rephrasing or use simpler terms.",
          variant: "destructive"
        });
      }
    }
  };

  // Natural language data modification
  const handleNaturalLanguageModification = async () => {
    setIsModifying(true);
    const input = naturalLanguageModification;
    
    try {
      // First try AI-powered modification
      const allData = [...clients, ...workers, ...tasks];
      const aiResponse = await aiService.processDataModification(input, allData as unknown as Record<string, unknown>[]);
      
      let modified = false;
      
      if (aiResponse.success && aiResponse.data && !(aiResponse.data as {error?: string}).error) {
        const modification = aiResponse.data as {action: string, conditions: unknown[], changes: Record<string, unknown>, affected_count?: number};
        
        // Apply AI-suggested modifications
        if (modification.action === 'update' && modification.conditions && modification.changes) {
          // Apply the modification based on AI instructions
          modified = await applyAiModification(modification as Record<string, unknown>);
          
          if (modified) {
            toast({
              title: "AI Modification Applied",
              description: `Successfully modified ${modification.affected_count || 'some'} records using AI processing`,
            });
          }
        }
      }
      
      // Fallback to pattern matching if AI didn't work
      if (!modified) {
        modified = await applyPatternBasedModification(input.toLowerCase());
        
        if (modified) {
          toast({
            title: "Pattern-based Modification Applied",
            description: "Successfully applied modification using pattern matching (consider adding AI API keys for better results)",
          });
        }
      }

      if (modified) {
        toast({
          title: "Data modified successfully",
          description: "Your natural language command has been executed.",
        });
        setNaturalLanguageModification('');
        
        // Re-run validations after modification
        setTimeout(() => {
          runValidations();
        }, 500);
      } else {
        toast({
          title: "Command not recognized",
          description: "Please try rephrasing your modification request.",
          variant: "destructive"
        });
      }
    } catch {
      toast({
        title: "Modification failed",
        description: "An error occurred while processing your command.",
        variant: "destructive"
      });
    } finally {
      setIsModifying(false);
    }
  };

  // Helper function to apply AI-powered modifications
  const applyAiModification = async (modification: Record<string, unknown>): Promise<boolean> => {
    const { action, conditions, changes } = modification;
    const conditionsArray = conditions as Record<string, unknown>[];
    
    if (action !== 'update' || !conditionsArray || !changes) {
      return false;
    }
    
    let modified = false;
    
    // Apply modifications to clients
    if (conditionsArray.some((c: Record<string, unknown>) => c.field === 'ClientID' || c.field === 'ClientName' || c.field === 'PriorityLevel')) {
      const updatedClients = clients.map(client => {
        if (matchesConditions(client as unknown as Record<string, unknown>, conditionsArray)) {
          modified = true;
          return { ...client, ...changes };
        }
        return client;
      });
      setClients(updatedClients);
    }
    
    // Apply modifications to workers
    if (conditionsArray.some((c: Record<string, unknown>) => c.field === 'WorkerID' || c.field === 'WorkerName' || c.field === 'Skills')) {
      const updatedWorkers = workers.map(worker => {
        if (matchesConditions(worker as unknown as Record<string, unknown>, conditionsArray)) {
          modified = true;
          return { ...worker, ...changes };
        }
        return worker;
      });
      setWorkers(updatedWorkers);
    }
    
    // Apply modifications to tasks
    if (conditionsArray.some((c: Record<string, unknown>) => c.field === 'TaskID' || c.field === 'TaskName' || c.field === 'Duration')) {
      const updatedTasks = tasks.map(task => {
        if (matchesConditions(task as unknown as Record<string, unknown>, conditionsArray)) {
          modified = true;
          return { ...task, ...changes };
        }
        return task;
      });
      setTasks(updatedTasks);
    }
    
    return modified;
  };

  // Helper function to check if an item matches conditions
  const matchesConditions = (item: Record<string, unknown>, conditions: Record<string, unknown>[]): boolean => {
    return conditions.every(condition => {
      const { field, operator, value } = condition;
      const itemValue = item[field as string];
      
      switch (operator) {
        case '=':
          return itemValue === value;
        case 'contains':
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase());
        case '>':
          return Number(itemValue) > Number(value);
        case '<':
          return Number(itemValue) < Number(value);
        case '>=':
          return Number(itemValue) >= Number(value);
        case '<=':
          return Number(itemValue) <= Number(value);
        default:
          return false;
      }
    });
  };

  // Helper function for pattern-based modifications (existing logic)
  const applyPatternBasedModification = async (input: string): Promise<boolean> => {
      let modified = false;

      // Priority modifications
      if (input.includes('set priority') || input.includes('change priority')) {
        const priorityMatch = input.match(/(?:set|change)\s+priority\s+(?:of\s+)?([a-zA-Z\s]+)\s+to\s+(\d+)/);
        if (priorityMatch) {
          const clientName = priorityMatch[1].trim();
          const newPriority = parseInt(priorityMatch[2]);
          
          const updatedClients = clients.map(client => {
            if (client.ClientName.toLowerCase().includes(clientName)) {
              return { ...client, PriorityLevel: newPriority };
            }
            return client;
          });
          setClients(updatedClients);
          modified = true;
        }
      }

      // Skill additions
      if (input.includes('add skill') || input.includes('give skill')) {
        const skillMatch = input.match(/(?:add|give)\s+skill\s+([a-zA-Z]+)\s+to\s+(?:worker\s+)?([a-zA-Z\s]+)/);
        if (skillMatch) {
          const skill = skillMatch[1].trim();
          const workerName = skillMatch[2].trim();
          
          const updatedWorkers = workers.map(worker => {
            if (worker.WorkerName.toLowerCase().includes(workerName)) {
              const currentSkills = worker.Skills;
              if (!currentSkills.toLowerCase().includes(skill.toLowerCase())) {
                return { ...worker, Skills: `${currentSkills}, ${skill}` };
              }
            }
            return worker;
          });
          setWorkers(updatedWorkers);
          modified = true;
        }
      }

      // Duration modifications
      if (input.includes('set duration') || input.includes('change duration')) {
        const durationMatch = input.match(/(?:set|change)\s+duration\s+(?:of\s+)?(?:task\s+)?([a-zA-Z\d\s]+)\s+to\s+(\d+)/);
        if (durationMatch) {
          const taskIdentifier = durationMatch[1].trim();
          const newDuration = parseInt(durationMatch[2]);
          
          const updatedTasks = tasks.map(task => {
            if (task.TaskName.toLowerCase().includes(taskIdentifier) || 
                task.TaskID.toLowerCase().includes(taskIdentifier)) {
              return { ...task, Duration: newDuration };
            }
            return task;
          });
          setTasks(updatedTasks);
          modified = true;
        }
      }

      // Bulk operations
      if (input.includes('all') && input.includes('priority')) {
        const bulkPriorityMatch = input.match(/set\s+all\s+(?:client\s+)?priorities\s+to\s+(\d+)/);
        if (bulkPriorityMatch) {
          const newPriority = parseInt(bulkPriorityMatch[1]);
          const updatedClients = clients.map(client => ({
            ...client,
            PriorityLevel: newPriority
          }));
          setClients(updatedClients);
          modified = true;
        }
      }

    return modified;
  };

  const runValidations = useCallback(async () => {
    setIsValidating(true);
    setValidationProgress(0);
    const errors: ValidationError[] = [];

    // Early return if no data to validate
    if (clients.length === 0 && workers.length === 0 && tasks.length === 0) {
      setValidationErrors([]);
      setIsValidating(false);
      toast({
        title: "No data to validate",
        description: "Please upload some data first in the Data Ingestion tab.",
        variant: "destructive"
      });
      return;
    }

    // Simulate progress updates
    const updateProgress = (progress: number) => {
      setValidationProgress(progress);
    };

    // Core Validations
    updateProgress(10);
    
    // 1. Missing required columns/IDs
    clients.forEach((client, index) => {
      if (!client.ClientID) {
        errors.push({
          type: 'missing_id',
          message: 'Missing ClientID',
          entity: `Client row ${index + 1}`,
          field: 'ClientID',
          severity: 'error'
        });
      }
    });

    workers.forEach((worker, index) => {
      if (!worker.WorkerID) {
        errors.push({
          type: 'missing_id',
          message: 'Missing WorkerID',
          entity: `Worker row ${index + 1}`,
          field: 'WorkerID',
          severity: 'error'
        });
      }
    });

    tasks.forEach((task, index) => {
      if (!task.TaskID) {
        errors.push({
          type: 'missing_id',
          message: 'Missing TaskID',
          entity: `Task row ${index + 1}`,
          field: 'TaskID',
          severity: 'error'
        });
      }
    });

    updateProgress(20);

    // 2. Duplicate IDs
    const clientIds = clients.map(c => c.ClientID);
    const duplicateClientIds = clientIds.filter((id, index) => clientIds.indexOf(id) !== index);
    duplicateClientIds.forEach(id => {
      errors.push({
        type: 'duplicate_id',
        message: `Duplicate ClientID: ${id}`,
        entity: 'Clients',
        severity: 'error'
      });
    });

    const workerIds = workers.map(w => w.WorkerID);
    const duplicateWorkerIds = workerIds.filter((id, index) => workerIds.indexOf(id) !== index);
    duplicateWorkerIds.forEach(id => {
      errors.push({
        type: 'duplicate_id',
        message: `Duplicate WorkerID: ${id}`,
        entity: 'Workers',
        severity: 'error'
      });
    });

    const taskIds = tasks.map(t => t.TaskID);
    const duplicateTaskIds = taskIds.filter((id, index) => taskIds.indexOf(id) !== index);
    duplicateTaskIds.forEach(id => {
      errors.push({
        type: 'duplicate_id',
        message: `Duplicate TaskID: ${id}`,
        entity: 'Tasks',
        severity: 'error'
      });
    });

    updateProgress(30);

    // 3. Out-of-range values
    clients.forEach((client) => {
      if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
        errors.push({
          type: 'invalid_range',
          message: `PriorityLevel must be between 1-5, got ${client.PriorityLevel}`,
          entity: `Client ${client.ClientID}`,
          field: 'PriorityLevel',
          severity: 'error'
        });
      }
    });

    // 4. Task duration validation
    tasks.forEach(task => {
      if (task.Duration < 1) {
        errors.push({
          type: 'invalid_duration',
          message: `Duration must be >= 1, got ${task.Duration}`,
          entity: `Task ${task.TaskID}`,
          field: 'Duration',
          severity: 'error'
        });
      }
    });

    updateProgress(40);

    // 5. Unknown references
    clients.forEach(client => {
      if (client.RequestedTaskIDs) {
        const requestedTasks = client.RequestedTaskIDs.split(',').map(id => id.trim());
        const existingTaskIds = tasks.map(t => t.TaskID);
        requestedTasks.forEach(taskId => {
          if (taskId && !existingTaskIds.includes(taskId)) {
            errors.push({
              type: 'unknown_reference',
              message: `Referenced TaskID '${taskId}' does not exist`,
              entity: `Client ${client.ClientID}`,
              field: 'RequestedTaskIDs',
              severity: 'error'
            });
          }
        });
      }
    });

    updateProgress(50);

    // 6. Skill coverage validation
    const allRequiredSkills = new Set<string>();
    tasks.forEach(task => {
      if (task.RequiredSkills) {
        task.RequiredSkills.split(',').forEach(skill => {
          allRequiredSkills.add(skill.trim());
        });
      }
    });

    const allWorkerSkills = new Set<string>();
    workers.forEach(worker => {
      if (worker.Skills) {
        worker.Skills.split(',').forEach(skill => {
          allWorkerSkills.add(skill.trim());
        });
      }
    });

    allRequiredSkills.forEach(skill => {
      if (!allWorkerSkills.has(skill)) {
        errors.push({
          type: 'missing_skill',
          message: `No worker has required skill: ${skill}`,
          entity: 'Skills Coverage',
          severity: 'warning'
        });
      }
    });

    updateProgress(60);

    // 7. Broken JSON validation
    clients.forEach((client) => {
      if (client.AttributesJSON) {
        try {
          JSON.parse(client.AttributesJSON);
        } catch {
          errors.push({
            type: 'invalid_json',
            message: 'Invalid JSON in AttributesJSON',
            entity: `Client ${client.ClientID}`,
            field: 'AttributesJSON',
            severity: 'error'
          });
        }
      }
    });

    updateProgress(70);

    // 8. AvailableSlots validation
    workers.forEach(worker => {
      if (worker.AvailableSlots) {
        try {
          const slots = JSON.parse(worker.AvailableSlots);
          if (!Array.isArray(slots) || !slots.every(slot => typeof slot === 'number' && slot > 0)) {
            errors.push({
              type: 'invalid_slots',
              message: 'AvailableSlots must be an array of positive numbers',
              entity: `Worker ${worker.WorkerID}`,
              field: 'AvailableSlots',
              severity: 'error'
            });
          }
        } catch {
          errors.push({
            type: 'invalid_slots',
            message: 'AvailableSlots must be valid JSON array',
            entity: `Worker ${worker.WorkerID}`,
            field: 'AvailableSlots',
            severity: 'error'
          });
        }
      }
    });

    updateProgress(80);

    // 9. PreferredPhases validation
    tasks.forEach(task => {
      if (task.PreferredPhases) {
        try {
          const phases = JSON.parse(task.PreferredPhases);
          if (!Array.isArray(phases) || !phases.every(phase => typeof phase === 'number' && phase > 0)) {
            errors.push({
              type: 'invalid_phases',
              message: 'PreferredPhases must be an array of positive numbers',
              entity: `Task ${task.TaskID}`,
              field: 'PreferredPhases',
              severity: 'error'
            });
          }
        } catch {
          // Check if it's in range format like "1-3"
          const rangeMatch = task.PreferredPhases.match(/^(\d+)-(\d+)$/);
          if (!rangeMatch) {
            errors.push({
              type: 'invalid_phases',
              message: 'PreferredPhases must be valid JSON array or range format (e.g., "1-3")',
              entity: `Task ${task.TaskID}`,
              field: 'PreferredPhases',
              severity: 'error'
            });
          }
        }
      }
    });

    updateProgress(90);

    // 10. MaxConcurrent validation
    tasks.forEach(task => {
      if (task.MaxConcurrent < 1) {
        errors.push({
          type: 'invalid_concurrent',
          message: `MaxConcurrent must be >= 1, got ${task.MaxConcurrent}`,
          entity: `Task ${task.TaskID}`,
          field: 'MaxConcurrent',
          severity: 'error'
        });
      }
    });

    // 11. MaxLoadPerPhase validation
    workers.forEach(worker => {
      if (worker.MaxLoadPerPhase < 1) {
        errors.push({
          type: 'invalid_load',
          message: `MaxLoadPerPhase must be >= 1, got ${worker.MaxLoadPerPhase}`,
          entity: `Worker ${worker.WorkerID}`,
          field: 'MaxLoadPerPhase',
          severity: 'error'
        });
      }
    });

    updateProgress(85);

    // 12. Circular co-run groups detection
    try {
      const coRunRules = rules.filter(rule => rule.type === 'coRun' && rule.active);
      const taskGroups = new Map<string, string[]>();
      
      coRunRules.forEach(rule => {
        const tasks = rule.config.tasks as string[];
        if (tasks && Array.isArray(tasks)) {
          taskGroups.set(rule.id, tasks);
        }
      });

      // Check for circular dependencies
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      const detectCycle = (taskId: string, path: string[]): boolean => {
        if (recursionStack.has(taskId)) {
          const cycleStart = path.indexOf(taskId);
          const cycle = path.slice(cycleStart).concat(taskId);
          errors.push({
            type: 'circular_corun',
            message: `Circular co-run dependency detected: ${cycle.join(' → ')}`,
            entity: 'Co-run Rules',
            severity: 'error'
          });
          return true;
        }

        if (visited.has(taskId)) return false;

        visited.add(taskId);
        recursionStack.add(taskId);

        // Find all tasks that this task must run with
        for (const [, tasks] of taskGroups) {
          if (tasks.includes(taskId)) {
            for (const relatedTask of tasks) {
              if (relatedTask !== taskId) {
                if (detectCycle(relatedTask, [...path, taskId])) {
                  return true;
                }
              }
            }
          }
        }

        recursionStack.delete(taskId);
        return false;
      };

      tasks.forEach(task => {
        if (!visited.has(task.TaskID)) {
          detectCycle(task.TaskID, []);
        }
      });
    } catch {
      // Handle case where rules context is not available
    }

    updateProgress(88);

    // 15. Conflicting rules vs phase-window constraints
    try {
      const phaseWindowRules = rules.filter(rule => rule.type === 'phaseWindow' && rule.active);
      const coRunRules = rules.filter(rule => rule.type === 'coRun' && rule.active);
      const loadLimitRules = rules.filter(rule => rule.type === 'loadLimit' && rule.active);

      // Check for conflicts between co-run rules and phase windows
      coRunRules.forEach(coRunRule => {
        const coRunTasks = coRunRule.config.tasks as string[];
        if (coRunTasks && Array.isArray(coRunTasks)) {
          const taskPhaseConstraints = new Map<string, number[]>();
          
          phaseWindowRules.forEach(phaseRule => {
            const taskId = phaseRule.config.taskId as string;
            const allowedPhases = phaseRule.config.allowedPhases as number[];
            
            if (coRunTasks.includes(taskId) && allowedPhases) {
              taskPhaseConstraints.set(taskId, allowedPhases);
            }
          });

          // Check if co-run tasks have conflicting phase constraints
          if (taskPhaseConstraints.size > 1) {
            const allConstraints = Array.from(taskPhaseConstraints.values());
            const intersection = allConstraints.reduce((acc, curr) => 
              acc.filter(phase => curr.includes(phase))
            );

            if (intersection.length === 0) {
              const tasksWithConstraints = Array.from(taskPhaseConstraints.keys());
              errors.push({
                type: 'conflicting_rules',
                message: `Co-run tasks ${tasksWithConstraints.join(', ')} have conflicting phase window constraints - no common phases available`,
                entity: `Rule Conflict: ${coRunRule.name}`,
                severity: 'error'
              });
            }
          }
        }
      });

      // Check for conflicts between load limits and task requirements
      loadLimitRules.forEach(loadRule => {
        const workerGroup = loadRule.config.workerGroup as string;
        const maxSlots = loadRule.config.maxSlots as number;
        
        if (workerGroup && maxSlots) {
          const groupWorkers = workers.filter(w => w.WorkerGroup === workerGroup);
          const totalGroupCapacity = groupWorkers.reduce((sum, w) => sum + w.MaxLoadPerPhase, 0);
          
          if (maxSlots > totalGroupCapacity) {
            errors.push({
              type: 'conflicting_rules',
              message: `Load limit rule sets max ${maxSlots} slots for group '${workerGroup}', but group only has ${totalGroupCapacity} total capacity`,
              entity: `Rule Conflict: ${loadRule.name}`,
              severity: 'warning'
            });
          }
        }
      });
    } catch {
      // Handle rule conflict analysis errors
    }

    updateProgress(90);

    // 13. Overloaded workers calculation
    workers.forEach(worker => {
      try {
        const availableSlots = JSON.parse(worker.AvailableSlots);
        if (Array.isArray(availableSlots) && availableSlots.length < worker.MaxLoadPerPhase) {
          errors.push({
            type: 'overloaded_worker',
            message: `Worker has ${availableSlots.length} available slots but MaxLoadPerPhase is ${worker.MaxLoadPerPhase}`,
            entity: `Worker ${worker.WorkerID}`,
            field: 'MaxLoadPerPhase',
            severity: 'warning'
          });
        }
      } catch {
        // Skip if AvailableSlots is malformed (already handled in previous validation)
      }
    });

    updateProgress(95);

    // 14. Phase-slot saturation analysis
    const phaseAnalysis = new Map<number, { totalSlots: number; totalDuration: number }>();
    
    // Calculate total available slots per phase
    workers.forEach(worker => {
      try {
        const availableSlots = JSON.parse(worker.AvailableSlots);
        if (Array.isArray(availableSlots)) {
          availableSlots.forEach(phase => {
            if (!phaseAnalysis.has(phase)) {
              phaseAnalysis.set(phase, { totalSlots: 0, totalDuration: 0 });
            }
            phaseAnalysis.get(phase)!.totalSlots += worker.MaxLoadPerPhase;
          });
        }
      } catch {
        // Skip malformed data
      }
    });

    // Calculate total required duration per phase
    tasks.forEach(task => {
      try {
        let phases: number[] = [];
        
        // Handle JSON array format
        try {
          phases = JSON.parse(task.PreferredPhases);
        } catch {
          // Handle range format like "1-3"
          const rangeMatch = task.PreferredPhases.match(/^(\d+)-(\d+)$/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1]);
            const end = parseInt(rangeMatch[2]);
            phases = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          }
        }

        if (Array.isArray(phases)) {
          phases.forEach(phase => {
            if (!phaseAnalysis.has(phase)) {
              phaseAnalysis.set(phase, { totalSlots: 0, totalDuration: 0 });
            }
            phaseAnalysis.get(phase)!.totalDuration += task.Duration;
          });
        }
      } catch {
        // Skip malformed data
      }
    });

    // Check for phase saturation
    phaseAnalysis.forEach((analysis, phase) => {
      if (analysis.totalDuration > analysis.totalSlots) {
        errors.push({
          type: 'phase_saturation',
          message: `Phase ${phase}: Required duration (${analysis.totalDuration}) exceeds available slots (${analysis.totalSlots})`,
          entity: `Phase ${phase}`,
          severity: 'error'
        });
      } else if (analysis.totalDuration > analysis.totalSlots * 0.8) {
        errors.push({
          type: 'phase_saturation',
          message: `Phase ${phase}: High utilization - Required duration (${analysis.totalDuration}) is ${Math.round((analysis.totalDuration / analysis.totalSlots) * 100)}% of available slots`,
          entity: `Phase ${phase}`,
          severity: 'warning'
        });
      }
    });

    // AI-Powered Validation Enhancement
    try {
      if (aiService.isAvailable()) {
        updateProgress(96);
        
        // Get AI validation suggestions for each entity type
        const [clientSuggestions, workerSuggestions, taskSuggestions] = await Promise.all([
          aiService.validateDataWithAI(clients as unknown as Record<string, unknown>[], 'clients'),
          aiService.validateDataWithAI(workers as unknown as Record<string, unknown>[], 'workers'),
          aiService.validateDataWithAI(tasks as unknown as Record<string, unknown>[], 'tasks')
        ]);

        // Convert AI suggestions to validation errors
        [...clientSuggestions, ...workerSuggestions, ...taskSuggestions].forEach(suggestion => {
          errors.push({
            type: suggestion.type,
            message: `AI: ${suggestion.message}`,
            entity: suggestion.field || 'AI Analysis',
            field: suggestion.field,
            severity: suggestion.severity === 'info' ? 'warning' : suggestion.severity
          });
        });

        updateProgress(98);

        // Get AI rule suggestions for enhanced validation
        const aiRuleSuggestions = await aiService.generateRuleSuggestions({ clients, workers, tasks });
        
        // Add AI rule suggestions as validation warnings
        aiRuleSuggestions.forEach(ruleSuggestion => {
          if (ruleSuggestion.confidence > 0.7) {
            errors.push({
              type: 'ai_rule_suggestion',
              message: `AI suggests: ${ruleSuggestion.description} (${Math.round(ruleSuggestion.confidence * 100)}% confidence)`,
              entity: 'AI Rule Analysis',
              severity: 'warning'
            });
          }
        });

        updateProgress(99);
      }
    } catch (error) {
      console.warn('AI validation failed, continuing with standard validation:', error);
    }

    updateProgress(100);

    setValidationErrors(errors);
    setIsValidating(false);

    // Generate comprehensive AI suggestions based on errors
    const suggestions: AiSuggestion[] = [];
    
    const missingSkillErrors = errors.filter(e => e.type === 'missing_skill');
    if (missingSkillErrors.length > 0) {
      suggestions.push({
        type: 'add_worker_skill',
        message: 'Add missing skills to workers',
        action: 'Automatically add required skills to workers with similar qualifications',
        data: { 
          missingSkills: missingSkillErrors.map(e => e.message),
          suggestedAssignments: missingSkillErrors.map(e => {
            const skill = e.message.replace('No worker has required skill: ', '');
            const suitableWorkers = workers.filter(w => 
              w.QualificationLevel === 'expert' || w.QualificationLevel === 'advanced'
            ).slice(0, 2);
            return { skill, workers: suitableWorkers.map(w => w.WorkerID) };
          })
        }
      });
    }

    const invalidJsonErrors = errors.filter(e => e.type === 'invalid_json');
    if (invalidJsonErrors.length > 0) {
      suggestions.push({
        type: 'fix_json',
        message: 'Fix invalid JSON in client attributes',
        action: 'Auto-correct JSON syntax and validate structure',
        data: { 
          invalidJsonCount: invalidJsonErrors.length,
          fixedExamples: invalidJsonErrors.slice(0, 3).map(e => ({
            client: e.entity,
            suggestedFix: '{"budget": 50000, "timeline": "Q1", "priority": "high"}'
          }))
        }
      });
    }

    const duplicateIdErrors = errors.filter(e => e.type === 'duplicate_id');
    if (duplicateIdErrors.length > 0) {
      suggestions.push({
        type: 'fix_duplicates',
        message: 'Resolve duplicate IDs',
        action: 'Generate unique IDs with sequential numbering',
        data: { 
          duplicateCount: duplicateIdErrors.length,
          suggestedPattern: 'Auto-increment: C001, C002, C003...'
        }
      });
    }

    const phaseErrors = errors.filter(e => e.type === 'phase_saturation');
    if (phaseErrors.length > 0) {
      suggestions.push({
        type: 'rebalance_phases',
        message: 'Rebalance phase allocation',
        action: 'Redistribute tasks across phases to reduce saturation',
        data: { 
          saturatedPhases: phaseErrors.map(e => e.entity),
          suggestedRebalancing: 'Move non-critical tasks to phases 3-6'
        }
      });
    }

    const conflictErrors = errors.filter(e => e.type === 'conflicting_rules');
    if (conflictErrors.length > 0) {
      suggestions.push({
        type: 'resolve_conflicts',
        message: 'Resolve rule conflicts',
        action: 'Modify rules to eliminate conflicts or add priority ordering',
        data: { 
          conflicts: conflictErrors.length,
          suggestedResolution: 'Add precedence rules or modify phase windows'
        }
      });
    }

    const overloadedWorkers = errors.filter(e => e.type === 'overloaded_worker');
    if (overloadedWorkers.length > 0) {
      suggestions.push({
        type: 'fix_overload',
        message: 'Fix worker overload issues',
        action: 'Adjust MaxLoadPerPhase or increase available slots',
        data: { 
          overloadedCount: overloadedWorkers.length,
          suggestedFix: 'Reduce MaxLoadPerPhase to match available slots'
        }
      });
    }

    const unknownRefErrors = errors.filter(e => e.type === 'unknown_reference');
    if (unknownRefErrors.length > 0) {
      suggestions.push({
        type: 'fix_references',
        message: 'Fix unknown task references',
        action: 'Remove invalid task IDs or create missing tasks',
        data: { 
          invalidRefs: unknownRefErrors.length,
          missingTasks: unknownRefErrors.map(e => e.message.match(/'([^']+)'/)?.[1]).filter(Boolean)
        }
      });
    }

    setAiSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);

    toast({
      title: "Validation completed",
      description: `Found ${errors.length} issues (${errors.filter(e => e.severity === 'error').length} errors, ${errors.filter(e => e.severity === 'warning').length} warnings)`,
    });
  }, [clients, workers, tasks, rules, setValidationErrors, toast]);

  const applyAiSuggestion = (suggestion: AiSuggestion) => {
    try {
      switch (suggestion.type) {
        case 'add_worker_skill':
          const skillData = suggestion.data as { 
            suggestedAssignments: Array<{ skill: string; workers: string[] }> 
          };
          
          if (skillData.suggestedAssignments) {
            const updatedWorkers = [...workers];
            skillData.suggestedAssignments.forEach(assignment => {
              assignment.workers.forEach(workerId => {
                const workerIndex = updatedWorkers.findIndex(w => w.WorkerID === workerId);
                if (workerIndex !== -1) {
                  const currentSkills = updatedWorkers[workerIndex].Skills;
                  if (!currentSkills.toLowerCase().includes(assignment.skill.toLowerCase())) {
                    updatedWorkers[workerIndex].Skills = `${currentSkills}, ${assignment.skill}`;
                  }
                }
              });
            });
            setWorkers(updatedWorkers);
          }
          break;

        case 'fix_json':
          
          const updatedClients = [...clients];
          updatedClients.forEach(client => {
            try {
              JSON.parse(client.AttributesJSON);
            } catch {
              // Fix invalid JSON by providing a default structure
              client.AttributesJSON = '{"budget": 50000, "timeline": "Q1", "priority": "medium"}';
            }
          });
          setClients(updatedClients);
          break;

        case 'fix_duplicates':
          // Fix duplicate IDs by adding incremental suffixes
          const clientIds = new Set<string>();
          const workerIds = new Set<string>();
          const taskIds = new Set<string>();
          
          const fixedClients = clients.map((client) => {
            let newId = client.ClientID;
            let counter = 1;
            while (clientIds.has(newId)) {
              newId = `${client.ClientID}_${counter}`;
              counter++;
            }
            clientIds.add(newId);
            return { ...client, ClientID: newId };
          });
          
          const fixedWorkers = workers.map((worker) => {
            let newId = worker.WorkerID;
            let counter = 1;
            while (workerIds.has(newId)) {
              newId = `${worker.WorkerID}_${counter}`;
              counter++;
            }
            workerIds.add(newId);
            return { ...worker, WorkerID: newId };
          });
          
          const fixedTasks = tasks.map((task) => {
            let newId = task.TaskID;
            let counter = 1;
            while (taskIds.has(newId)) {
              newId = `${task.TaskID}_${counter}`;
              counter++;
            }
            taskIds.add(newId);
            return { ...task, TaskID: newId };
          });
          
          setClients(fixedClients);
          setWorkers(fixedWorkers);
          setTasks(fixedTasks);
          break;

        case 'fix_overload':
          const overloadUpdatedWorkers = workers.map(worker => {
            try {
              const availableSlots = JSON.parse(worker.AvailableSlots);
              if (Array.isArray(availableSlots) && availableSlots.length < worker.MaxLoadPerPhase) {
                return { ...worker, MaxLoadPerPhase: availableSlots.length };
              }
            } catch {
              // For malformed data, set a reasonable default
              return { ...worker, MaxLoadPerPhase: 3, AvailableSlots: '[1,2,3,4]' };
            }
            return worker;
          });
          setWorkers(overloadUpdatedWorkers);
          break;

        case 'fix_references':
          const referencedUpdatedClients = clients.map(client => {
            if (client.RequestedTaskIDs) {
              const requestedTasks = client.RequestedTaskIDs.split(',').map(id => id.trim());
              const existingTaskIds = tasks.map(t => t.TaskID);
              const validTasks = requestedTasks.filter(taskId => existingTaskIds.includes(taskId));
              return { ...client, RequestedTaskIDs: validTasks.join(', ') };
            }
            return client;
          });
          setClients(referencedUpdatedClients);
          break;

        case 'rebalance_phases':
          // Redistribute tasks to reduce phase saturation
          const phaseBalancedTasks = tasks.map((task, index) => {
            // Move some tasks to later phases
            if (index % 3 === 0) { // Every third task
              try {
                const phases = JSON.parse(task.PreferredPhases);
                if (Array.isArray(phases) && phases.some(p => p <= 2)) {
                  // Shift to later phases
                  const newPhases = phases.map(p => Math.min(p + 2, 6));
                  return { ...task, PreferredPhases: JSON.stringify(newPhases) };
                }
              } catch {
                // For range format, shift the range
                const rangeMatch = task.PreferredPhases.match(/^(\d+)-(\d+)$/);
                if (rangeMatch) {
                  const start = Math.min(parseInt(rangeMatch[1]) + 2, 5);
                  const end = Math.min(parseInt(rangeMatch[2]) + 2, 6);
                  return { ...task, PreferredPhases: `${start}-${end}` };
                }
              }
            }
            return task;
          });
          setTasks(phaseBalancedTasks);
          break;

        default:
          toast({
            title: "Suggestion not implemented",
            description: "This suggestion type is not yet supported.",
            variant: "destructive"
          });
          return;
      }

      toast({
        title: "AI suggestion applied successfully",
        description: suggestion.message,
      });
      
      // Remove the suggestion after applying
      setAiSuggestions(prev => prev.filter(s => s !== suggestion));
      
      // Re-run validations to show the improvements
      setTimeout(() => {
        runValidations();
      }, 500);
      
    } catch {
      toast({
        title: "Failed to apply suggestion",
        description: "An error occurred while applying the AI suggestion.",
        variant: "destructive"
      });
    }
  };

  const errorCount = validationErrors.filter(e => e.severity === 'error').length;
  const warningCount = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="space-y-6">
      {/* Natural Language Search */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Search className="h-5 w-5 mr-2" />
            Natural Language Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Input
                placeholder="e.g., 'All tasks with duration more than 2 phases' or 'Workers with javascript skills'"
                value={naturalLanguageSearch}
                onChange={(e) => setNaturalLanguageSearch(e.target.value)}
                className="flex-1 bg-slate-700 border-slate-600 text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleNaturalLanguageSearch()}
              />
              <Button onClick={handleNaturalLanguageSearch} className="bg-blue-600 hover:bg-blue-700">
                <Filter className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="mt-4">
                <h4 className="text-white font-medium mb-2">Search Results ({searchResults.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div key={index} className="p-3 bg-slate-700 rounded-lg">
                      <div className="text-sm text-slate-300">
                        {result.ClientName && `Client: ${result.ClientName} (${result.ClientID})`}
                        {result.WorkerName && `Worker: ${result.WorkerName} (${result.WorkerID})`}
                        {result.TaskName && `Task: ${result.TaskName} (${result.TaskID})`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Natural Language Data Modification */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Wand2 className="h-5 w-5 mr-2" />
            Natural Language Data Modification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-slate-400">
                Examples: &quot;Set priority of TechCorp to 5&quot;, &quot;Add skill python to Alice&quot;, &quot;Change duration of Frontend to 3&quot;, &quot;Move worker Bob to senior group&quot;
              </div>
              <textarea
                placeholder="Describe how you want to modify the data..."
                value={naturalLanguageModification}
                onChange={(e) => setNaturalLanguageModification(e.target.value)}
                className="w-full h-24 bg-slate-700 border-slate-600 text-white rounded-md p-3 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleNaturalLanguageModification();
                  }
                }}
              />
            </div>
            
            <div className="flex space-x-2">
              <Button 
                onClick={handleNaturalLanguageModification} 
                disabled={isModifying || !naturalLanguageModification.trim()}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                <Brain className="h-4 w-4 mr-2" />
                {isModifying ? 'Processing...' : 'Apply Modification'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setNaturalLanguageModification('')}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Clear
              </Button>
            </div>

            {isModifying && (
              <div className="flex items-center space-x-2 text-slate-400 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-blue-600"></div>
                <span>Processing your modification request...</span>
              </div>
            )}

            <div className="text-xs text-slate-500 space-y-1">
              <div><strong>Supported commands:</strong></div>
              <div>• Priority: &quot;set priority of [client] to [1-5]&quot;</div>
              <div>• Skills: &quot;add skill [skill] to [worker]&quot;</div>
              <div>• Duration: &quot;set duration of [task] to [number]&quot;</div>
              <div>• Phases: &quot;move [task] to phase [number]&quot;</div>
              <div>• Groups: &quot;move [worker] to [senior/junior/mid]&quot;</div>
              <div>• Load: &quot;set load of [worker] to [number]&quot;</div>
              <div>• Bulk: &quot;set all priorities to [number]&quot;</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Controls */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            <span>Data Validation</span>
            <div className="flex items-center space-x-2">
              <Badge variant={errorCount > 0 ? 'destructive' : 'secondary'} className="bg-red-500/20 text-red-400">
                {errorCount} Errors
              </Badge>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                {warningCount} Warnings
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runValidations}
              disabled={isValidating}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              {isValidating ? 'Running Validations...' : 'Run All Validations'}
            </Button>

            {isValidating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-400">
                  <span>Validating data...</span>
                  <span>{validationProgress}%</span>
                </div>
                <Progress value={validationProgress} className="w-full" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {showSuggestions && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Brain className="h-5 w-5 mr-2" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiSuggestions.map((suggestion, index) => (
                <div key={index} className="p-4 bg-slate-700 rounded-lg border border-purple-500/30">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{suggestion.message}</h4>
                      <p className="text-slate-300 text-sm mt-1">{suggestion.action}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => applyAiSuggestion(suggestion)}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Wand2 className="h-3 w-3 mr-1" />
                      Apply
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationErrors.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Validation Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {validationErrors.map((error, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border ${
                    error.severity === 'error' 
                      ? 'bg-red-500/10 border-red-500/30' 
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    <AlertCircle className={`h-4 w-4 mt-0.5 ${
                      error.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                    }`} />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        error.severity === 'error' ? 'text-red-400' : 'text-yellow-400'
                      }`}>
                        {error.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {error.entity} {error.field && `• ${error.field}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${
                      error.severity === 'error' 
                        ? 'border-red-500/30 text-red-400' 
                        : 'border-yellow-500/30 text-yellow-400'
                    }`}>
                      {error.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Errors State */}
      {validationErrors.length === 0 && !isValidating && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-white font-medium mb-2">All Validations Passed!</h3>
            <p className="text-slate-400">Your data is clean and ready for processing.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValidationTab;
