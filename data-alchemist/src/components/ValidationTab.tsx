import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Search, Brain, Zap, Wand2 } from 'lucide-react';
import { useData } from '@/contexts/DataContext';

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
  const { clients, workers, tasks, validationErrors, setValidationErrors } = useData();
  const [isValidating, setIsValidating] = useState(false);
  const [naturalLanguageSearch, setNaturalLanguageSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const runValidations = useCallback(async () => {
    setIsValidating(true);
    const errors: ValidationError[] = [];

    // Core Validations
    
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

    // 7. Broken JSON validation - handle each entity type separately
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

    // 8. Worker availability validation
    workers.forEach(worker => {
      if (worker.AvailableSlots) {
        try {
          const slots = JSON.parse(worker.AvailableSlots);
          if (!Array.isArray(slots)) {
            errors.push({
              type: 'invalid_slots',
              message: 'AvailableSlots must be an array',
              entity: `Worker ${worker.WorkerID}`,
              field: 'AvailableSlots',
              severity: 'error'
            });
          }
        } catch {
          errors.push({
            type: 'invalid_slots',
            message: 'Invalid JSON in AvailableSlots',
            entity: `Worker ${worker.WorkerID}`,
            field: 'AvailableSlots',
            severity: 'error'
          });
        }
      }
    });

    // Generate AI suggestions based on data patterns
    const suggestions: AiSuggestion[] = [];
    
    // Suggest co-run rules for frequently paired tasks
    const taskPairs = new Map<string, number>();
    clients.forEach(client => {
      if (client.RequestedTaskIDs) {
        const tasks = client.RequestedTaskIDs.split(',').map(id => id.trim());
        if (tasks.length > 1) {
          tasks.forEach((task1, i) => {
            tasks.slice(i + 1).forEach(task2 => {
              const pair = [task1, task2].sort().join('-');
              taskPairs.set(pair, (taskPairs.get(pair) || 0) + 1);
            });
          });
        }
      }
    });

    taskPairs.forEach((count, pair) => {
      if (count >= 2) {
        suggestions.push({
          type: 'co_run_suggestion',
          message: `Tasks ${pair.replace('-', ' and ')} are requested together ${count} times. Consider adding a Co-run rule.`,
          action: 'Add Co-run Rule',
          data: { tasks: pair.split('-') }
        });
      }
    });

    // Suggest load limits for overloaded workers
    workers.forEach(worker => {
      if (worker.MaxLoadPerPhase && worker.MaxLoadPerPhase > 10) {
        suggestions.push({
          type: 'load_limit_suggestion',
          message: `Worker ${worker.WorkerID} has high MaxLoadPerPhase (${worker.MaxLoadPerPhase}). Consider setting load limits.`,
          action: 'Set Load Limit',
          data: { worker: worker.WorkerID, currentLoad: worker.MaxLoadPerPhase }
        });
      }
    });

    setAiSuggestions(suggestions);

    // Simulate AI validation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setValidationErrors(errors);
    setIsValidating(false);
  }, [clients, workers, tasks, setValidationErrors]);

  const handleNaturalLanguageSearch = () => {
    // Enhanced AI-powered natural language search
    const query = naturalLanguageSearch.toLowerCase();
    let results: SearchResult[] = [];

    if (query.includes('duration') && query.includes('more than')) {
      const durationMatch = query.match(/more than (\d+)/);
      if (durationMatch) {
        const threshold = parseInt(durationMatch[1]);
        results = tasks.filter(task => task.Duration > threshold) as unknown as SearchResult[];
      }
    } else if (query.includes('priority') && (query.includes('high') || query.includes('4') || query.includes('5'))) {
      results = clients.filter(client => client.PriorityLevel >= 4) as unknown as SearchResult[];
    } else if (query.includes('skills') && query.includes('javascript')) {
      results = workers.filter(worker => 
        worker.Skills && worker.Skills.toLowerCase().includes('javascript')
      ) as unknown as SearchResult[];
    } else if (query.includes('available') && query.includes('phase')) {
      const phaseMatch = query.match(/phase (\d+)/);
      if (phaseMatch) {
        results = workers.filter(worker => {
          if (worker.AvailableSlots) {
            const slots = parseInt(worker.AvailableSlots.toString());
            return !isNaN(slots) && slots > 0;
          }
          return false;
        }) as unknown as SearchResult[];
      }
    } else if (query.includes('errors') || query.includes('problems')) {
      // Return entities with validation errors
      results = [
        ...clients.filter((_, index) => validationErrors.some(e => e.entity.includes(`Client`) || e.entity.includes(`row ${index + 1}`))),
        ...workers.filter((_, index) => validationErrors.some(e => e.entity.includes(`Worker`) || e.entity.includes(`row ${index + 1}`))),
        ...tasks.filter((_, index) => validationErrors.some(e => e.entity.includes(`Task`) || e.entity.includes(`row ${index + 1}`)))
      ] as unknown as SearchResult[];
    } else {
      // Generic search across all entities
      const searchTerm = query;
      results = [
        ...clients.filter(c => 
          Object.values(c).some(v => 
            String(v).toLowerCase().includes(searchTerm)
          )
        ),
        ...workers.filter(w => 
          Object.values(w).some(v => 
            String(v).toLowerCase().includes(searchTerm)
          )
        ),
        ...tasks.filter(t => 
          Object.values(t).some(v => 
            String(v).toLowerCase().includes(searchTerm)
          )
        )
      ] as unknown as SearchResult[];
    }

    setSearchResults(results);
  };

  const applyAiSuggestion = (suggestion: AiSuggestion) => {
    // This would integrate with the Rules tab to automatically create rules
    console.log('Applying AI suggestion:', suggestion);
  };

  useEffect(() => {
    if (clients.length > 0 || workers.length > 0 || tasks.length > 0) {
      runValidations();
    }
  }, [clients, workers, tasks, runValidations]);

  const errorsByType = validationErrors.reduce((acc, error) => {
    acc[error.type] = (acc[error.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalErrors = validationErrors.filter(e => e.severity === 'error').length;
  const totalWarnings = validationErrors.filter(e => e.severity === 'warning').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Validation Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white">{totalErrors}</p>
                <p className="text-sm text-red-400">Errors</p>
              </div>
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white">{totalWarnings}</p>
                <p className="text-sm text-yellow-400">Warnings</p>
              </div>
              <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {Math.round(((clients.length + workers.length + tasks.length - totalErrors) / Math.max(clients.length + workers.length + tasks.length, 1)) * 100)}%
                </p>
                <p className="text-sm text-emerald-400">Data Quality</p>
              </div>
              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions Card */}
      {aiSuggestions.length > 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-white text-sm sm:text-base">
                <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                AI Rule Recommendations
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="text-slate-400 text-xs sm:text-sm"
              >
                {showSuggestions ? 'Hide' : 'Show'} ({aiSuggestions.length})
              </Button>
            </div>
          </CardHeader>
          {showSuggestions && (
            <CardContent>
              <div className="space-y-3">
                {aiSuggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-slate-700/50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{suggestion.message}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => applyAiSuggestion(suggestion)}
                        className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm self-start sm:self-auto"
                      >
                        {suggestion.action}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Natural Language Search */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white text-sm sm:text-base">
            <Brain className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            AI-Powered Natural Language Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Input
              placeholder="Search with natural language: 'All tasks with duration more than 2 phases'"
              value={naturalLanguageSearch}
              onChange={(e) => setNaturalLanguageSearch(e.target.value)}
              className="bg-slate-700 border-slate-600 text-white text-sm flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleNaturalLanguageSearch()}
            />
            <Button 
              onClick={handleNaturalLanguageSearch}
              className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
            >
              <Search className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Search
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-slate-400">Found {searchResults.length} results:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {searchResults.slice(0, 6).map((result, index) => (
                  <div key={index} className="p-3 bg-slate-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm truncate">
                        {result.ClientName || result.WorkerName || result.TaskName || result.ClientID || result.WorkerID || result.TaskID}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {result.ClientID ? 'Client' : result.WorkerID ? 'Worker' : 'Task'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Results */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
            <CardTitle className="text-white text-sm sm:text-base">Validation Results</CardTitle>
            <Button 
              onClick={runValidations} 
              disabled={isValidating}
              className="bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm"
            >
              {isValidating ? (
                <>
                  <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Validating...
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                  Run Validation
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isValidating && (
            <div className="space-y-3">
              <Progress value={66} className="w-full" />
              <p className="text-sm text-slate-400">Running AI-enhanced validations...</p>
            </div>
          )}
          
          {!isValidating && validationErrors.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 sm:h-12 sm:w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-emerald-400 font-medium">All validations passed!</p>
              <p className="text-slate-400 text-sm">Your data is ready for rule configuration.</p>
            </div>
          )}

          {!isValidating && validationErrors.length > 0 && (
            <div className="space-y-4">
              {Object.entries(errorsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                  <span className="text-white capitalize text-sm">{type.replace('_', ' ')}</span>
                  <Badge variant={validationErrors.find(e => e.type === type)?.severity === 'error' ? 'destructive' : 'secondary'}>
                    {count}
                  </Badge>
                </div>
              ))}
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="p-3 bg-slate-700/50 rounded border-l-4 border-red-500">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between space-y-2 sm:space-y-0">
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm">{error.message}</p>
                        <p className="text-slate-400 text-xs">{error.entity}</p>
                      </div>
                      <Badge variant={error.severity === 'error' ? 'destructive' : 'secondary'} className="text-xs self-start">
                        {error.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidationTab;
