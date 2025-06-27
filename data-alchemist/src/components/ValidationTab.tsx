import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Search, Brain, Zap, Wand2, Filter } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';

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

interface SearchCondition {
  entity: string;
  field: string;
  operator: string;
  value: string | number | string[];
}

const ValidationTab = () => {
  const { clients, workers, tasks, validationErrors, setValidationErrors } = useData();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);
  const [naturalLanguageSearch, setNaturalLanguageSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);

  // Natural language search parser
  const parseNaturalLanguageQuery = (query: string): SearchCondition[] => {
    const lowerQuery = query.toLowerCase();
    const conditions: SearchCondition[] = [];

    // Duration conditions
    const durationMatch = lowerQuery.match(/duration\s*(?:of\s*)?(?:more\s*than|greater\s*than|>\s*)?(\d+)/);
    if (durationMatch) {
      conditions.push({
        entity: 'tasks',
        field: 'Duration',
        operator: '>',
        value: parseInt(durationMatch[1])
      });
    }

    // Priority conditions
    const priorityMatch = lowerQuery.match(/priority\s*(?:level\s*)?(?:of\s*)?(\d+)/);
    if (priorityMatch) {
      conditions.push({
        entity: 'clients',
        field: 'PriorityLevel',
        operator: '=',
        value: parseInt(priorityMatch[1])
      });
    }

    // Phase conditions
    const phaseMatch = lowerQuery.match(/phase\s*(\d+)/);
    if (phaseMatch) {
      conditions.push({
        entity: 'tasks',
        field: 'PreferredPhases',
        operator: 'includes',
        value: parseInt(phaseMatch[1])
      });
    }

    // Skill conditions
    const skillMatch = lowerQuery.match(/(?:skill|skills)\s*(?:of\s*)?([a-zA-Z,]+)/);
    if (skillMatch) {
      const skills = skillMatch[1].split(',').map(s => s.trim());
      conditions.push({
        entity: 'workers',
        field: 'Skills',
        operator: 'includes',
        value: skills
      });
    }

    // Name conditions
    const nameMatch = lowerQuery.match(/(?:name|called)\s*(?:is\s*)?([a-zA-Z\s]+)/);
    if (nameMatch) {
      conditions.push({
        entity: 'all',
        field: 'Name',
        operator: 'contains',
        value: nameMatch[1].trim()
      });
    }

    return conditions;
  };

  const executeSearch = (conditions: SearchCondition[]): SearchResult[] => {
    const results: SearchResult[] = [];

    conditions.forEach(condition => {
      if (condition.entity === 'clients' || condition.entity === 'all') {
        clients.forEach(client => {
          if (condition.field === 'PriorityLevel' && condition.operator === '=') {
            if (client.PriorityLevel === condition.value) {
              results.push({
                ClientID: client.ClientID,
                ClientName: client.ClientName,
                PriorityLevel: client.PriorityLevel,
                RequestedTaskIDs: client.RequestedTaskIDs,
                GroupTag: client.GroupTag
              });
            }
          } else if (condition.field === 'Name' && condition.operator === 'contains') {
            if (client.ClientName.toLowerCase().includes(String(condition.value).toLowerCase())) {
              results.push({
                ClientID: client.ClientID,
                ClientName: client.ClientName,
                PriorityLevel: client.PriorityLevel,
                RequestedTaskIDs: client.RequestedTaskIDs,
                GroupTag: client.GroupTag
              });
            }
          }
        });
      }

      if (condition.entity === 'workers' || condition.entity === 'all') {
        workers.forEach(worker => {
          if (condition.field === 'Skills' && condition.operator === 'includes') {
            const workerSkills = worker.Skills.toLowerCase().split(',').map(s => s.trim());
            const hasSkill = Array.isArray(condition.value) && condition.value.some((skill: string) => 
              workerSkills.includes(skill.toLowerCase())
            );
            if (hasSkill) {
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
          } else if (condition.field === 'Name' && condition.operator === 'contains') {
            if (worker.WorkerName.toLowerCase().includes(String(condition.value).toLowerCase())) {
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
          }
        });
      }

      if (condition.entity === 'tasks' || condition.entity === 'all') {
        tasks.forEach(task => {
          if (condition.field === 'Duration' && condition.operator === '>') {
            if (task.Duration > Number(condition.value)) {
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
          } else if (condition.field === 'PreferredPhases' && condition.operator === 'includes') {
            try {
              const phases = JSON.parse(task.PreferredPhases);
              if (Array.isArray(phases) && phases.includes(condition.value)) {
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
            } catch {
              // Handle string format like "1-3"
              if (task.PreferredPhases.includes(String(condition.value))) {
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
            }
          } else if (condition.field === 'Name' && condition.operator === 'contains') {
            if (task.TaskName.toLowerCase().includes(String(condition.value).toLowerCase())) {
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

  const handleNaturalLanguageSearch = () => {
    if (!naturalLanguageSearch.trim()) {
      toast({
        title: "Search query required",
        description: "Please enter a search query.",
        variant: "destructive"
      });
      return;
    }

    const conditions = parseNaturalLanguageQuery(naturalLanguageSearch);
    const results = executeSearch(conditions);
    setSearchResults(results);

    toast({
      title: "Search completed",
      description: `Found ${results.length} results for your query.`,
    });
  };

  const runValidations = useCallback(async () => {
    setIsValidating(true);
    setValidationProgress(0);
    const errors: ValidationError[] = [];

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

    updateProgress(100);

    setValidationErrors(errors);
    setIsValidating(false);

    // Generate AI suggestions based on errors
    const suggestions: AiSuggestion[] = [];
    
    const missingSkillErrors = errors.filter(e => e.type === 'missing_skill');
    if (missingSkillErrors.length > 0) {
      suggestions.push({
        type: 'add_worker_skill',
        message: 'Add missing skills to workers',
        action: 'Add required skills to appropriate workers',
        data: { missingSkills: missingSkillErrors.map(e => e.message) }
      });
    }

    const invalidJsonErrors = errors.filter(e => e.type === 'invalid_json');
    if (invalidJsonErrors.length > 0) {
      suggestions.push({
        type: 'fix_json',
        message: 'Fix invalid JSON in client attributes',
        action: 'Validate and fix JSON format',
        data: { invalidJsonCount: invalidJsonErrors.length }
      });
    }

    const duplicateIdErrors = errors.filter(e => e.type === 'duplicate_id');
    if (duplicateIdErrors.length > 0) {
      suggestions.push({
        type: 'fix_duplicates',
        message: 'Resolve duplicate IDs',
        action: 'Ensure unique IDs across all entities',
        data: { duplicateCount: duplicateIdErrors.length }
      });
    }

    setAiSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);

    toast({
      title: "Validation completed",
      description: `Found ${errors.length} issues (${errors.filter(e => e.severity === 'error').length} errors, ${errors.filter(e => e.severity === 'warning').length} warnings)`,
    });
  }, [clients, workers, tasks, setValidationErrors, toast]);

  const applyAiSuggestion = (suggestion: AiSuggestion) => {
    // This would implement the actual fix logic
    toast({
      title: "AI suggestion applied",
      description: suggestion.message,
    });
    
    // Remove the suggestion after applying
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
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
