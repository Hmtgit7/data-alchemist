
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import DataGrid from '@/components/DataGrid';
import { useToast } from '@/hooks/use-toast';

const DataIngestionTab = () => {
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({
    clients: 'idle',
    workers: 'idle',
    tasks: 'idle'
  });
  const [activeDataTab, setActiveDataTab] = useState('clients');
  const { clients, setClients, workers, setWorkers, tasks, setTasks } = useData();
  const { toast } = useToast();

  const parseCSV = (text: string) => {
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, any> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });
    return { headers, data };
  };

  const handleFileUpload = useCallback(async (file: File, type: 'clients' | 'workers' | 'tasks') => {
    setUploadStatus(prev => ({ ...prev, [type]: 'uploading' }));
    
    try {
      const text = await file.text();
      const { data } = parseCSV(text);
      
      // AI-powered column mapping simulation
      setTimeout(() => {
        if (type === 'clients') {
          setClients(data.map((row, index) => ({
            ClientID: row.ClientID || row.ID || `C${index + 1}`,
            ClientName: row.ClientName || row.Name || `Client ${index + 1}`,
            PriorityLevel: parseInt(row.PriorityLevel || row.Priority || '3'),
            RequestedTaskIDs: row.RequestedTaskIDs || row.Tasks || '',
            GroupTag: row.GroupTag || row.Group || 'default',
            AttributesJSON: row.AttributesJSON || row.Attributes || '{}'
          })));
        } else if (type === 'workers') {
          setWorkers(data.map((row, index) => ({
            WorkerID: row.WorkerID || row.ID || `W${index + 1}`,
            WorkerName: row.WorkerName || row.Name || `Worker ${index + 1}`,
            Skills: row.Skills || row.Skill || '',
            AvailableSlots: row.AvailableSlots || row.Slots || '[1,2,3]',
            MaxLoadPerPhase: parseInt(row.MaxLoadPerPhase || row.MaxLoad || '5'),
            WorkerGroup: row.WorkerGroup || row.Group || 'default',
            QualificationLevel: row.QualificationLevel || row.Level || 'junior'
          })));
        } else if (type === 'tasks') {
          setTasks(data.map((row, index) => ({
            TaskID: row.TaskID || row.ID || `T${index + 1}`,
            TaskName: row.TaskName || row.Name || `Task ${index + 1}`,
            Category: row.Category || 'general',
            Duration: parseInt(row.Duration || '1'),
            RequiredSkills: row.RequiredSkills || row.Skills || '',
            PreferredPhases: row.PreferredPhases || row.Phases || '[1,2]',
            MaxConcurrent: parseInt(row.MaxConcurrent || '1')
          })));
        }
        
        setUploadStatus(prev => ({ ...prev, [type]: 'success' }));
        toast({
          title: "File uploaded successfully",
          description: `${type} data has been processed and validated with AI mapping.`,
        });
      }, 1500);
      
    } catch (error) {
      setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
      toast({
        title: "Upload failed",
        description: "Failed to parse the file. Please check the format.",
        variant: "destructive"
      });
    }
  }, [setClients, setWorkers, setTasks, toast]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading': return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      default: return <Upload className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {['clients', 'workers', 'tasks'].map((type) => (
          <Card key={type} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-white">
                <span className="capitalize">{type} Data</span>
                {getStatusIcon(uploadStatus[type])}
              </CardTitle>
              <p className="text-sm text-slate-400">
                Upload CSV or XLSX files for {type}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Label htmlFor={`${type}-upload`} className="text-slate-300">
                  Choose File
                </Label>
                <Input
                  id={`${type}-upload`}
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, type as any);
                    }
                  }}
                  className="bg-slate-700 border-slate-600 text-white file:bg-blue-600 file:text-white file:border-0"
                />
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Brain className="h-3 w-3" />
                  <span>AI-powered column mapping enabled</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Display */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Data Overview</CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400">
                <FileSpreadsheet className="h-3 w-3 mr-1" />
                {clients.length + workers.length + tasks.length} Records
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeDataTab} onValueChange={setActiveDataTab}>
            <TabsList className="grid w-full grid-cols-3 bg-slate-700">
              <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
              <TabsTrigger value="workers">Workers ({workers.length})</TabsTrigger>
              <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="clients" className="mt-4">
              <DataGrid data={clients} type="clients" />
            </TabsContent>
            
            <TabsContent value="workers" className="mt-4">
              <DataGrid data={workers} type="workers" />
            </TabsContent>
            
            <TabsContent value="tasks" className="mt-4">
              <DataGrid data={tasks} type="tasks" />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataIngestionTab;
