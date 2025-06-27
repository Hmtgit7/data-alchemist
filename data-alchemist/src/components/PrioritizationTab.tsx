import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Target, TrendingUp, BarChart3, Settings, Shuffle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';

const PrioritizationTab = () => {
  const { priorities, setPriorities } = useData();
  const [selectedPreset, setSelectedPreset] = useState('');

  const priorityItems = [
    {
      key: 'fulfillment',
      label: 'Task Fulfillment',
      description: 'Prioritize completing requested tasks',
      icon: '✅',
      weight: priorities.fulfillment
    },
    {
      key: 'fairness',
      label: 'Fair Distribution',
      description: 'Ensure equal workload distribution',
      icon: '⚖️',
      weight: priorities.fairness
    },
    {
      key: 'priority',
      label: 'Client Priority',
      description: 'Respect client priority levels',
      icon: '⭐',
      weight: priorities.priority
    },
    {
      key: 'efficiency',
      label: 'Resource Efficiency',
      description: 'Maximize resource utilization',
      icon: '⚡',
      weight: priorities.efficiency
    },
    {
      key: 'workload',
      label: 'Workload Balance',
      description: 'Prevent worker overload',
      icon: '🔄',
      weight: priorities.workload
    }
  ];

  const presets: Record<string, { name: string; description: string; weights: Record<string, number> }> = {
    maximize_fulfillment: {
      name: 'Maximize Fulfillment',
      description: 'Focus on completing as many tasks as possible',
      weights: { fulfillment: 5, fairness: 2, priority: 3, efficiency: 4, workload: 3 }
    },
    fair_distribution: {
      name: 'Fair Distribution',
      description: 'Ensure equal opportunities for all workers',
      weights: { fulfillment: 3, fairness: 5, priority: 2, efficiency: 3, workload: 4 }
    },
    priority_first: {
      name: 'Priority First',
      description: 'Prioritize high-value clients',
      weights: { fulfillment: 4, fairness: 2, priority: 5, efficiency: 3, workload: 3 }
    },
    efficiency_focused: {
      name: 'Efficiency Focused',
      description: 'Maximize resource utilization',
      weights: { fulfillment: 3, fairness: 3, priority: 3, efficiency: 5, workload: 2 }
    }
  };

  const updateWeight = (key: string, value: number[]) => {
    setPriorities({
      ...priorities,
      [key]: value[0]
    });
  };

  const applyPreset = (presetKey: string) => {
    if (presets[presetKey]) {
      setPriorities(presets[presetKey].weights);
      setSelectedPreset(presetKey);
    }
  };

  const randomizeWeights = () => {
    const randomWeights: Record<string, number> = {};
    priorityItems.forEach(item => {
      randomWeights[item.key] = Math.floor(Math.random() * 5) + 1;
    });
    setPriorities(randomWeights);
    setSelectedPreset('');
  };

  // Prepare data for charts
  const barChartData = priorityItems.map(item => ({
    name: item.label,
    weight: item.weight,
    icon: item.icon
  }));

  const radarData = priorityItems.map(item => ({
    criteria: item.label.split(' ')[0],
    value: item.weight,
    fullMark: 5
  }));

  const totalWeight = Object.values(priorities).reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = priorityItems.map(item => ({
    ...item,
    percentage: Math.round((item.weight / totalWeight) * 100)
  }));

  return (
    <div className="space-y-6">
      {/* Preset Selection */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Target className="h-5 w-5 mr-2" />
            Priority Presets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(presets).map(([key, preset]) => (
              <Card 
                key={key} 
                className={`cursor-pointer transition-all ${
                  selectedPreset === key 
                    ? 'bg-blue-600/20 border-blue-500' 
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600'
                }`}
                onClick={() => applyPreset(key)}
              >
                <CardContent className="p-4">
                  <h3 className="text-white font-medium mb-2">{preset.name}</h3>
                  <p className="text-slate-400 text-sm">{preset.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-center mt-4">
            <Button 
              onClick={randomizeWeights}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Randomize Weights
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weight Configuration */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Settings className="h-5 w-5 mr-2" />
            Priority Weight Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {priorityItems.map((item) => (
              <div key={item.key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white flex items-center">
                      <span className="mr-2 text-lg">{item.icon}</span>
                      {item.label}
                    </Label>
                    <p className="text-slate-400 text-sm">{item.description}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                      {normalizedWeights.find(w => w.key === item.key)?.percentage}%
                    </Badge>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {item.weight}/5
                    </Badge>
                  </div>
                </div>
                
                <Slider
                  value={[item.weight]}
                  onValueChange={(value) => updateWeight(item.key, value)}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <BarChart3 className="h-5 w-5 mr-2" />
              Weight Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F3F4F6'
                  }}
                />
                <Bar dataKey="weight" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <TrendingUp className="h-5 w-5 mr-2" />
              Priority Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis dataKey="criteria" stroke="#9CA3AF" />
                <PolarRadiusAxis stroke="#9CA3AF" />
                <Radar
                  name="Priority"
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.3}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Configuration Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{totalWeight}</p>
              <p className="text-slate-400 text-sm">Total Weight</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {Math.max(...Object.values(priorities))}
              </p>
              <p className="text-slate-400 text-sm">Highest Priority</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {(Object.values(priorities).reduce((a, b) => a + b, 0) / Object.values(priorities).length).toFixed(1)}
              </p>
              <p className="text-slate-400 text-sm">Average Weight</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-slate-700 rounded-lg">
            <h3 className="text-white font-medium mb-2">Current Configuration Impact:</h3>
            <p className="text-slate-300 text-sm">
              Your current settings will {priorities.fulfillment >= 4 ? 'strongly prioritize task completion' : 'balance task completion with other factors'}, 
              {priorities.fairness >= 4 ? ' ensure fair distribution across workers' : ' allow flexible worker allocation'}, 
              and {priorities.priority >= 4 ? ' heavily weight client priority levels' : ' consider client priorities among other factors'}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrioritizationTab;
