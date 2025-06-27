
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Brain, Lightbulb, Settings } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';

const RulesTab = () => {
  const { rules, addRule, removeRule, tasks, workers, clients } = useData();
  const { toast } = useToast();
  const [selectedRuleType, setSelectedRuleType] = useState('');
  const [ruleConfig, setRuleConfig] = useState<any>({});
  const [naturalLanguageRule, setNaturalLanguageRule] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  const ruleTypes = [
    { value: 'coRun', label: 'Co-Run Tasks', description: 'Tasks that must run together' },
    { value: 'slotRestriction', label: 'Slot Restriction', description: 'Limit slots for groups' },
    { value: 'loadLimit', label: 'Load Limit', description: 'Maximum load per worker group' },
    { value: 'phaseWindow', label: 'Phase Window', description: 'Restrict tasks to specific phases' },
    { value: 'precedence', label: 'Precedence', description: 'Task ordering requirements' },
    { value: 'skillMatch', label: 'Skill Match', description: 'Enforce skill requirements' }
  ];

  const generateAiSuggestions = () => {
    const suggestions = [
      {
        type: 'coRun',
        name: 'Related Tasks Co-execution',
        description: 'Tasks T1 and T2 always run together based on historical patterns',
        confidence: 0.85,
        rationale: 'These tasks share similar resource requirements and are often requested together'
      },
      {
        type: 'loadLimit',
        name: 'Senior Worker Load Balance',
        description: 'Limit senior workers to maximum 3 tasks per phase',
        confidence: 0.92,
        rationale: 'Senior workers are overallocated in current data, causing bottlenecks'
      },
      {
        type: 'phaseWindow',
        name: 'Critical Tasks Early Phases',
        description: 'High priority tasks should be scheduled in phases 1-2',
        confidence: 0.78,
        rationale: 'Priority level 4-5 tasks show better completion rates in early phases'
      }
    ];
    setAiSuggestions(suggestions);
  };

  const processNaturalLanguageRule = () => {
    const input = naturalLanguageRule.toLowerCase();
    let ruleType = '';
    let config: any = {};

    if (input.includes('together') || input.includes('same time')) {
      ruleType = 'coRun';
      // Extract task IDs from natural language
      const taskMatches = input.match(/t\d+/g);
      config = {
        tasks: taskMatches || [],
        name: 'Natural Language Co-run Rule'
      };
    } else if (input.includes('maximum') || input.includes('limit')) {
      ruleType = 'loadLimit';
      const numberMatch = input.match(/(\d+)/);
      config = {
        maxSlots: numberMatch ? parseInt(numberMatch[1]) : 3,
        workerGroup: 'default',
        name: 'Natural Language Load Limit'
      };
    } else if (input.includes('phase') || input.includes('period')) {
      ruleType = 'phaseWindow';
      const phaseMatches = input.match(/phase[s]?\s*(\d+)/g);
      config = {
        allowedPhases: phaseMatches ? phaseMatches.map(p => parseInt(p.match(/\d+/)[0])) : [1, 2],
        taskId: 'all',
        name: 'Natural Language Phase Window'
      };
    }

    if (ruleType) {
      const newRule = {
        id: `rule-${Date.now()}`,
        type: ruleType,
        name: config.name,
        description: `Created from: "${naturalLanguageRule}"`,
        config,
        active: true
      };

      addRule(newRule);
      setNaturalLanguageRule('');
      toast({
        title: "Rule created successfully",
        description: `AI has interpreted your request and created a ${ruleType} rule.`,
      });
    } else {
      toast({
        title: "Unable to interpret",
        description: "Please try rephrasing your rule or use the manual rule builder.",
        variant: "destructive"
      });
    }
  };

  const createManualRule = () => {
    if (!selectedRuleType) return;

    const newRule = {
      id: `rule-${Date.now()}`,
      type: selectedRuleType,
      name: ruleConfig.name || `${selectedRuleType} Rule`,
      description: ruleConfig.description || 'Manual rule configuration',
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

  const acceptAiSuggestion = (suggestion: any) => {
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
            <Button 
              onClick={generateAiSuggestions}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              Generate AI Suggestions
            </Button>

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
              disabled={!naturalLanguageRule.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              Create Rule with AI
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
                    value={ruleConfig.name || ''}
                    onChange={(e) => setRuleConfig({...ruleConfig, name: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {selectedRuleType === 'coRun' && (
                  <div>
                    <Label className="text-slate-300">Task IDs (comma separated)</Label>
                    <Input
                      placeholder="T1, T2, T3"
                      value={ruleConfig.tasks?.join(', ') || ''}
                      onChange={(e) => setRuleConfig({
                        ...ruleConfig, 
                        tasks: e.target.value.split(',').map(t => t.trim())
                      })}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                )}

                {selectedRuleType === 'loadLimit' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-300">Worker Group</Label>
                      <Input
                        placeholder="senior, junior, etc."
                        value={ruleConfig.workerGroup || ''}
                        onChange={(e) => setRuleConfig({...ruleConfig, workerGroup: e.target.value})}
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Max Slots</Label>
                      <Input
                        type="number"
                        placeholder="3"
                        value={ruleConfig.maxSlots || ''}
                        onChange={(e) => setRuleConfig({...ruleConfig, maxSlots: parseInt(e.target.value)})}
                        className="bg-slate-700 border-slate-600 text-white"
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
                          onCheckedChange={(checked) => {
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
