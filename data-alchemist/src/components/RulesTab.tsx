import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Brain, Lightbulb, Settings, Sparkles, Zap } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';
import aiService from '@/lib/ai/ai-service';

interface RuleConfig {
  [key: string]: string | number | string[] | number[] | undefined;
}

interface AiSuggestion {
  type: string;
  name: string;
  description: string;
  confidence: number;
  rationale: string;
  config?: RuleConfig;
}

const RulesTab = () => {
  const { rules, addRule, removeRule, clients, workers, tasks } = useData();
  const { toast } = useToast();
  const [selectedRuleType, setSelectedRuleType] = useState('');
  const [ruleConfig, setRuleConfig] = useState<RuleConfig>({});
  const [naturalLanguageRule, setNaturalLanguageRule] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiServiceAvailable, setAiServiceAvailable] = useState(false);

  // Check AI service availability on mount
  useEffect(() => {
    const checkAI = async () => {
      setAiServiceAvailable(aiService.isAvailable());
    };
    checkAI();
  }, []);

  const ruleTypes = [
    { value: 'coRun', label: 'Co-Run Tasks', description: 'Tasks that must run together' },
    { value: 'slotRestriction', label: 'Slot Restriction', description: 'Limit slots for groups' },
    { value: 'loadLimit', label: 'Load Limit', description: 'Maximum load per worker group' },
    { value: 'phaseWindow', label: 'Phase Window', description: 'Restrict tasks to specific phases' },
    { value: 'precedence', label: 'Precedence', description: 'Task ordering requirements' },
    { value: 'skillMatch', label: 'Skill Match', description: 'Enforce skill requirements' }
  ];

  const generateAiSuggestions = async () => {
    setIsGeneratingAI(true);
    
    try {
      let suggestions: AiSuggestion[] = [];

      // Check if we have enough data to generate suggestions
      if (clients.length === 0 && workers.length === 0 && tasks.length === 0) {
        toast({
          title: "No data available",
          description: "Please upload some data first in the Data Ingestion tab to generate rule suggestions.",
          variant: "destructive"
        });
        setIsGeneratingAI(false);
        return;
      }
      
      // Try AI-powered suggestions first
      if (aiServiceAvailable) {
        const aiSuggestions = await aiService.generateRuleSuggestions({ clients, workers, tasks });
        
        suggestions = aiSuggestions.map(aiSuggestion => ({
          type: aiSuggestion.type,
          name: aiSuggestion.name,
          description: aiSuggestion.description,
          confidence: aiSuggestion.confidence,
          rationale: aiSuggestion.rationale,
          config: aiSuggestion.config as RuleConfig
        }));

        if (suggestions.length > 0) {
          toast({
            title: "AI Rule Suggestions Generated",
            description: `Generated ${suggestions.length} intelligent rule suggestions using ${aiService.getAvailableServices().join(', ')}`,
          });
        }
      }
      
      // Fallback to pattern-based analysis if no AI suggestions or AI not available
      if (suggestions.length === 0) {
        suggestions = generatePatternBasedSuggestions();
        
        toast({
          title: "Pattern-based Suggestions Generated",
          description: `Generated ${suggestions.length} rule suggestions using data analysis (consider adding AI API keys for better results)`,
        });
      }
      
      setAiSuggestions(suggestions);
      
    } catch (error) {
      console.error('AI suggestion generation failed:', error);
      
      // Fallback to pattern-based suggestions
      const suggestions = generatePatternBasedSuggestions();
      setAiSuggestions(suggestions);
      
      toast({
        title: "Fallback Suggestions Generated",
        description: "Using pattern-based analysis due to AI service error",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Pattern-based suggestion generation (existing logic)
  const generatePatternBasedSuggestions = (): AiSuggestion[] => {
    const suggestions: AiSuggestion[] = [];

    // 1. Co-run recommendations based on shared skills and clients
    const taskAnalysis = new Map<string, { requiredSkills: string[], clients: string[] }>();
    
    tasks.forEach(task => {
      const skills = task.RequiredSkills ? task.RequiredSkills.split(',').map(s => s.trim()) : [];
      const requestingClients = clients.filter(c => 
        c.RequestedTaskIDs && c.RequestedTaskIDs.includes(task.TaskID)
      ).map(c => c.ClientID);
      
      taskAnalysis.set(task.TaskID, { requiredSkills: skills, clients: requestingClients });
    });

    // Find tasks with similar skills or shared clients
    const taskPairs: Array<{tasks: string[], sharedSkills: number, sharedClients: number}> = [];
    const taskIds = Array.from(taskAnalysis.keys());
    
    for (let i = 0; i < taskIds.length; i++) {
      for (let j = i + 1; j < taskIds.length; j++) {
        const task1 = taskAnalysis.get(taskIds[i])!;
        const task2 = taskAnalysis.get(taskIds[j])!;
        
        const sharedSkills = task1.requiredSkills.filter(skill => 
          task2.requiredSkills.includes(skill)
        ).length;
        
        const sharedClients = task1.clients.filter(client => 
          task2.clients.includes(client)
        ).length;

        if (sharedSkills >= 2 || sharedClients >= 2) {
          taskPairs.push({
            tasks: [taskIds[i], taskIds[j]],
            sharedSkills,
            sharedClients
          });
        }
      }
    }

    if (taskPairs.length > 0) {
      const bestPair = taskPairs.sort((a, b) => 
        (b.sharedSkills + b.sharedClients) - (a.sharedSkills + a.sharedClients)
      )[0];
      
      suggestions.push({
        type: 'coRun',
        name: `Co-run Tasks ${bestPair.tasks.join(' & ')}`,
        description: `Tasks ${bestPair.tasks.join(' and ')} should run together`,
        confidence: Math.min(0.95, 0.6 + (bestPair.sharedSkills + bestPair.sharedClients) * 0.1),
        rationale: `Share ${bestPair.sharedSkills} skills and ${bestPair.sharedClients} clients`,
        config: { tasks: bestPair.tasks }
      });
    }

    // 2. Load limit recommendations based on worker capacity analysis
    const workerGroups = ['senior', 'junior', 'mid'];
    workerGroups.forEach(group => {
      const groupWorkers = workers.filter(w => w.WorkerGroup === group);
      if (groupWorkers.length > 0) {
        const avgLoad = groupWorkers.reduce((sum, w) => sum + w.MaxLoadPerPhase, 0) / groupWorkers.length;
        const maxLoad = Math.max(...groupWorkers.map(w => w.MaxLoadPerPhase));
        
        if (maxLoad > avgLoad * 1.5) {
          suggestions.push({
        type: 'loadLimit',
            name: `Limit ${group} worker overload`,
            description: `Set maximum load for ${group} workers to ${Math.ceil(avgLoad)}`,
            confidence: 0.88,
            rationale: `Some ${group} workers have ${maxLoad} load vs average ${avgLoad.toFixed(1)}`,
            config: { workerGroup: group, maxSlots: Math.ceil(avgLoad) }
          });
        }
      }
    });

    // 3. Phase window recommendations based on priority analysis
    const highPriorityClients = clients.filter(c => c.PriorityLevel >= 4);
    const highPriorityTasks = new Set<string>();
    
    highPriorityClients.forEach(client => {
      if (client.RequestedTaskIDs) {
        client.RequestedTaskIDs.split(',').forEach(taskId => {
          highPriorityTasks.add(taskId.trim());
        });
      }
    });

    if (highPriorityTasks.size > 0) {
      const criticalTasks = Array.from(highPriorityTasks).slice(0, 3);
      suggestions.push({
        type: 'phaseWindow',
        name: 'Prioritize critical tasks in early phases',
        description: `Schedule high-priority tasks (${criticalTasks.join(', ')}) in phases 1-2`,
        confidence: 0.82,
        rationale: `${highPriorityClients.length} high-priority clients require these tasks`,
        config: { taskId: criticalTasks[0], allowedPhases: [1, 2] }
      });
    }

    // 4. Skill matching recommendations
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

    const missingSkills = Array.from(allRequiredSkills).filter(skill => 
      !allWorkerSkills.has(skill)
    );

    if (missingSkills.length > 0) {
      suggestions.push({
        type: 'skillMatch',
        name: 'Address skill gaps',
        description: `Add missing skills: ${missingSkills.slice(0, 3).join(', ')}`,
        confidence: 0.95,
        rationale: `${missingSkills.length} required skills are missing from worker pool`,
        config: { missingSkills: missingSkills.slice(0, 3) }
      });
    }

    // 5. Phase saturation analysis
    const phaseLoad = new Map<number, number>();
    tasks.forEach(task => {
      try {
        let phases: number[] = [];
        try {
          phases = JSON.parse(task.PreferredPhases);
        } catch {
          const rangeMatch = task.PreferredPhases.match(/^(\d+)-(\d+)$/);
          if (rangeMatch) {
            const start = parseInt(rangeMatch[1]);
            const end = parseInt(rangeMatch[2]);
            phases = Array.from({ length: end - start + 1 }, (_, i) => start + i);
          }
        }
        
        phases.forEach(phase => {
          phaseLoad.set(phase, (phaseLoad.get(phase) || 0) + task.Duration);
        });
      } catch {
        // Skip malformed data
      }
    });

    const overloadedPhases = Array.from(phaseLoad.entries())
      .filter(([, load]) => load > 10) // Threshold for overload
      .sort((a, b) => b[1] - a[1]);

    if (overloadedPhases.length > 0) {
      const [phase, load] = overloadedPhases[0];
      suggestions.push({
        type: 'phaseWindow',
        name: `Rebalance phase ${phase} workload`,
        description: `Phase ${phase} is overloaded with ${load} duration units`,
        confidence: 0.86,
        rationale: `Phase ${phase} has significantly higher load than others`,
        config: { redistributeFrom: phase, targetPhases: [phase + 1, phase + 2] }
      });
    }

    // 6. Precedence recommendations based on task dependencies
    const taskCategories = new Map<string, string[]>();
    tasks.forEach(task => {
      const category = task.Category;
      if (!taskCategories.has(category)) {
        taskCategories.set(category, []);
      }
      taskCategories.get(category)!.push(task.TaskID);
    });

    if (taskCategories.has('architecture') && taskCategories.has('development')) {
      suggestions.push({
        type: 'precedence',
        name: 'Architecture before development',
        description: 'Ensure architecture tasks complete before development tasks',
        confidence: 0.90,
        rationale: 'Architecture tasks should logically precede development work',
        config: { 
          before: taskCategories.get('architecture')![0], 
          after: taskCategories.get('development')![0] 
        }
      });
    }

    return suggestions;
  };

  const processNaturalLanguageRule = async () => {
    if (!naturalLanguageRule.trim()) return;

    // Check if we have data to work with
    if (clients.length === 0 && workers.length === 0 && tasks.length === 0) {
      toast({
        title: "No data available",
        description: "Please upload some data first in the Data Ingestion tab to create rules.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingAI(true);
    
    try {
      let ruleType = '';
      let config: RuleConfig = {};
      let ruleName = '';
      let ruleDescription = '';

      // Try AI-powered rule interpretation first
      if (aiServiceAvailable) {
        const aiResponse = await aiService.processNaturalLanguageQuery(
          `Convert this business rule to a structured rule: "${naturalLanguageRule}"`,
          { clients, workers, tasks }
        );

        if (aiResponse.success && aiResponse.data) {
          // AI successfully interpreted the rule
          const ruleData = (aiResponse.data as Array<Record<string, unknown>>)?.[0]; // Take first interpretation
          if (ruleData) {
            ruleType = (ruleData.type as string) || 'coRun';
            config = { 
              name: `AI Rule: ${naturalLanguageRule}`,
              ...(ruleData.config as Record<string, unknown>)
            };
            ruleName = `AI-Generated: ${ruleData.name || ruleType}`;
            ruleDescription = `AI interpretation: ${naturalLanguageRule}`;
            
            toast({
              title: "AI Rule Interpretation",
              description: `Rule interpreted using ${aiService.getAvailableServices().join(', ')} with ${Math.round((aiResponse.confidence || 0.8) * 100)}% confidence`,
            });
          }
        }
      }

      // Fallback to pattern matching if AI didn't work
      if (!ruleType) {
        const input = naturalLanguageRule.toLowerCase();

        if (input.includes('together') || input.includes('same time')) {
          ruleType = 'coRun';
          const taskMatches = input.match(/t\d+/g);
          config = {
            tasks: taskMatches || [],
            name: 'Natural Language Co-run Rule'
          };
          ruleName = 'Co-run Rule';
          ruleDescription = `Pattern-based interpretation: "${naturalLanguageRule}"`;
        } else if (input.includes('maximum') || input.includes('limit')) {
          ruleType = 'loadLimit';
          const numberMatch = input.match(/(\d+)/);
          config = {
            maxSlots: numberMatch ? parseInt(numberMatch[1]) : 3,
            workerGroup: 'default',
            name: 'Natural Language Load Limit'
          };
          ruleName = 'Load Limit Rule';
          ruleDescription = `Pattern-based interpretation: "${naturalLanguageRule}"`;
        } else if (input.includes('phase') || input.includes('period')) {
          ruleType = 'phaseWindow';
          const phaseMatches = input.match(/phase[s]?\s*(\d+)/g);
          config = {
            allowedPhases: phaseMatches ? phaseMatches.map(p => parseInt(p.match(/\d+/)?.[0] || '1')) : [1, 2],
            taskId: 'all',
            name: 'Natural Language Phase Window'
          };
          ruleName = 'Phase Window Rule';
          ruleDescription = `Pattern-based interpretation: "${naturalLanguageRule}"`;
        }

        if (ruleType) {
          toast({
            title: "Pattern-based Rule Creation",
            description: "Using pattern matching (consider adding AI API keys for better results)",
          });
        }
      }

      if (ruleType) {
        const newRule = {
          id: `rule-${Date.now()}`,
          type: ruleType,
          name: ruleName || config.name as string,
          description: ruleDescription,
          config,
          active: true
        };

        addRule(newRule);
        setNaturalLanguageRule('');
        toast({
          title: "Rule created successfully",
          description: `Created ${ruleType} rule from natural language input.`,
        });
      } else {
        toast({
          title: "Unable to interpret",
          description: "Please try rephrasing your rule or use the manual rule builder.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Natural language rule processing failed:', error);
      toast({
        title: "Rule processing failed",
        description: "An error occurred while interpreting your rule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const createManualRule = () => {
    if (!selectedRuleType) return;

    const newRule = {
      id: `rule-${Date.now()}`,
      type: selectedRuleType,
      name: ruleConfig.name as string || `${selectedRuleType} Rule`,
      description: ruleConfig.description as string || 'Manual rule configuration',
      config: ruleConfig,
      active: true
    };

    addRule(newRule);
    setSelectedRuleType('');
    setRuleConfig({});
    toast({
      title: "Rule added",
      description: "New business rule has been configured successfully.",
    });
  };

  const acceptAiSuggestion = (suggestion: AiSuggestion) => {
    const newRule = {
      id: `rule-${Date.now()}`,
      type: suggestion.type,
      name: suggestion.name,
      description: suggestion.description,
      config: suggestion.config || {},
      active: true
    };

    addRule(newRule);
    setAiSuggestions(prev => prev.filter(s => s !== suggestion));
    toast({
      title: "AI suggestion applied",
      description: suggestion.name,
    });
  };

  return (
    <div className="space-y-6">
      {/* AI Suggestions */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Lightbulb className="h-5 w-5 mr-2" />
            AI Rule Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button 
                onClick={generateAiSuggestions}
                disabled={isGeneratingAI}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating...
                  </>
                ) : (
                  <>
                    {aiServiceAvailable ? <Sparkles className="h-4 w-4 mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                    Generate AI Suggestions
                  </>
                )}
              </Button>
              
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={aiServiceAvailable ? "default" : "secondary"}
                  className={aiServiceAvailable ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-600 text-slate-400"}
                >
                  {aiServiceAvailable ? (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      AI Enhanced
                    </>
                  ) : (
                    <>
                      <Settings className="h-3 w-3 mr-1" />
                      Pattern Mode
                    </>
                  )}
                </Badge>
                {aiServiceAvailable && (
                  <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                    {aiService.getAvailableServices().join(', ')}
                  </Badge>
                )}
              </div>
            </div>

            {aiSuggestions.map((suggestion, index) => (
              <div key={index} className="p-4 bg-slate-700 rounded-lg border border-purple-500/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{suggestion.name}</h4>
                    <p className="text-slate-300 text-sm mt-1">{suggestion.description}</p>
                    <p className="text-slate-400 text-xs mt-2">{suggestion.rationale}</p>
                    <Badge variant="secondary" className="mt-2 bg-purple-500/20 text-purple-400">
                      {Math.round(suggestion.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => acceptAiSuggestion(suggestion)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Apply
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAiSuggestions(prev => prev.filter(s => s !== suggestion))}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Natural Language Rule Input */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Brain className="h-5 w-5 mr-2" />
            Natural Language Rule Creator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Describe your rule in plain English</Label>
              <Textarea
                placeholder="e.g., 'Tasks T1 and T2 should always run together' or 'Limit senior workers to maximum 3 tasks per phase'"
                value={naturalLanguageRule}
                onChange={(e) => setNaturalLanguageRule(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-2"
              />
            </div>
            <Button 
              onClick={processNaturalLanguageRule}
              disabled={!naturalLanguageRule.trim() || isGeneratingAI}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isGeneratingAI ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Processing...
                </>
              ) : (
                <>
                  {aiServiceAvailable ? <Sparkles className="h-4 w-4 mr-2" /> : <Brain className="h-4 w-4 mr-2" />}
                  {aiServiceAvailable ? 'Create Rule with AI' : 'Create Rule'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Manual Rule Builder */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Settings className="h-5 w-5 mr-2" />
            Manual Rule Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Rule Type</Label>
              <Select value={selectedRuleType} onValueChange={setSelectedRuleType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select rule type" />
                </SelectTrigger>
                <SelectContent>
                  {ruleTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-slate-400">{type.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRuleType && (
              <div className="space-y-3">
                <div>
                  <Label className="text-slate-300">Rule Name</Label>
                  <Input
                    placeholder="Enter rule name"
                    value={String(ruleConfig.name || '')}
                    onChange={(e) => setRuleConfig({...ruleConfig, name: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {selectedRuleType === 'coRun' && (
                  <div>
                    <Label className="text-slate-300">Task IDs (comma separated)</Label>
                    <Input
                      placeholder="T1, T2, T3"
                      value={Array.isArray(ruleConfig.tasks) ? ruleConfig.tasks.join(', ') : ''}
                      onChange={(e) => setRuleConfig({
                        ...ruleConfig, 
                        tasks: e.target.value.split(',').map(t => t.trim())
                      })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                )}

                {selectedRuleType === 'loadLimit' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="workerGroup">Worker Group</Label>
                      <Input
                        id="workerGroup"
                        value={String(ruleConfig.workerGroup || '')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxSlots">Max Slots</Label>
                      <Input
                        id="maxSlots"
                        value={String(ruleConfig.maxSlots || '')}
                      />
                    </div>
                  </div>
                )}

                <Button 
                  onClick={createManualRule}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Rules */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Active Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <p className="text-slate-400 text-center py-6">No rules configured yet. Create your first rule above.</p>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="p-4 bg-slate-700 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-white font-medium">{rule.name}</h4>
                        <Badge variant="secondary">{rule.type}</Badge>
                        <Switch
                          checked={rule.active}
                          onCheckedChange={() => {
                            // Update rule active status
                          }}
                        />
                      </div>
                      <p className="text-slate-300 text-sm mt-1">{rule.description}</p>
                      <div className="mt-2 text-xs text-slate-400">
                        Config: {JSON.stringify(rule.config, null, 2)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeRule(rule.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RulesTab;
