import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, Brain, CheckCircle, AlertCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import DataGrid from '@/components/DataGrid';
import { useToast } from '@/hooks/use-toast';
import aiService from '@/lib/ai/ai-service';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type { Client, Worker, Task } from '@/contexts/DataContext';

interface DataRow {
  [key: string]: string | number | boolean;
}

interface ColumnMapping {
  [key: string]: string;
}

const DataIngestionTab = () => {
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({
    clients: 'idle',
    workers: 'idle',
    tasks: 'idle'
  });
  const [activeDataTab, setActiveDataTab] = useState('clients');
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMapping>>({});
  const { clients, setClients, workers, setWorkers, tasks, setTasks } = useData();
  const { toast } = useToast();



  // AI-powered column mapping logic with enhanced intelligence
  const generateColumnMapping = useCallback(async (headers: string[], type: 'clients' | 'workers' | 'tasks'): Promise<ColumnMapping> => {
    const mapping: ColumnMapping = {};
    
    const expectedColumns = {
      clients: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'],
      workers: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'],
      tasks: ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent']
    };

    const expected = expectedColumns[type];
    
    // Try AI-powered mapping first if available
    if (aiService.isAvailable()) {
      try {
        const aiResponse = await aiService.processNaturalLanguageQuery(
          `Map these CSV headers to standard ${type} fields: ${headers.join(', ')}. Expected fields: ${expected.join(', ')}. Return the best mapping.`,
          { headers, expectedColumns: expected, type }
        );

        if (aiResponse.success && aiResponse.data) {
          // AI provided a mapping
          const aiMapping = (aiResponse.data as Array<{mapping?: ColumnMapping}>)?.[0]?.mapping || {};
          Object.assign(mapping, aiMapping);
          
          // Fill in any AI-missed mappings with pattern matching
          const unmappedExpected = expected.filter(col => !mapping[col]);
          if (unmappedExpected.length > 0) {
            const patternMapping = generatePatternBasedMapping(headers, unmappedExpected);
            Object.assign(mapping, patternMapping);
          }
          
          return mapping;
        }
      } catch (error) {
        console.warn('AI column mapping failed, falling back to pattern matching:', error);
      }
    }
    
    // Fallback to pattern-based mapping
    return generatePatternBasedMapping(headers, expected);
  }, []);

  // Pattern-based column mapping (original logic)
  const generatePatternBasedMapping = (headers: string[], expectedColumns: string[]): ColumnMapping => {
    const mapping: ColumnMapping = {};
    
    expectedColumns.forEach(expectedCol => {
      // Direct match
      const directMatch = headers.find(h => h.toLowerCase() === expectedCol);
      if (directMatch) {
        mapping[expectedCol] = directMatch;
        return;
      }

      // Fuzzy matching
      const fuzzyMatches = headers.filter(h => {
        const hLower = h.toLowerCase();
        return hLower.includes(expectedCol) || expectedCol.includes(hLower) || 
               hLower.replace(/[^a-z]/g, '') === expectedCol.replace(/[^a-z]/g, '');
      });

      if (fuzzyMatches.length > 0) {
        mapping[expectedCol] = fuzzyMatches[0];
        return;
      }

      // Common variations
      const variations: Record<string, string[]> = {
        ClientID: ['id', 'client_id', 'client id', 'cid', 'clientid'],
        ClientName: ['name', 'client_name', 'client name', 'company', 'clientname'],
        PriorityLevel: ['priority', 'priority_level', 'level', 'importance', 'prioritylevel'],
        RequestedTaskIDs: ['tasks', 'task_ids', 'task ids', 'requested_tasks', 'requestedtaskids'],
        GroupTag: ['group', 'group_tag', 'category', 'tag', 'grouptag'],
        AttributesJSON: ['attributes', 'attributes_json', 'metadata', 'properties', 'attributesjson'],
        WorkerID: ['id', 'worker_id', 'employee_id', 'emp_id', 'workerid'],
        WorkerName: ['name', 'worker_name', 'employee_name', 'emp_name', 'workername'],
        Skills: ['skill', 'skill_set', 'capabilities', 'expertise', 'skills'],
        AvailableSlots: ['slots', 'available_slots', 'availability', 'phases', 'availableslots'],
        MaxLoadPerPhase: ['max_load', 'maxload', 'capacity', 'workload', 'maxloadperphase'],
        WorkerGroup: ['group', 'worker_group', 'team', 'department', 'workergroup'],
        QualificationLevel: ['level', 'qualification', 'experience', 'seniority', 'qualificationlevel'],
        TaskID: ['id', 'task_id', 'job_id', 'work_id', 'taskid'],
        TaskName: ['name', 'task_name', 'job_name', 'title', 'taskname'],
        Category: ['type', 'category', 'classification', 'domain'],
        Duration: ['time', 'duration', 'length', 'period'],
        RequiredSkills: ['skills', 'required_skills', 'prerequisites', 'expertise', 'requiredskills'],
        PreferredPhases: ['phases', 'preferred_phases', 'timeline', 'schedule', 'preferredphases'],
        MaxConcurrent: ['concurrent', 'max_concurrent', 'parallel', 'simultaneous', 'maxconcurrent']
      };

      const variationsForCol = variations[expectedCol] || [];
      for (const variation of variationsForCol) {
        const match = headers.find(h => h.toLowerCase() === variation);
        if (match) {
          mapping[expectedCol] = match;
          break;
        }
      }
    });

    return mapping;
  };

  const parseFile = async (file: File): Promise<{ headers: string[], data: DataRow[] }> => {
    if (file.name.endsWith('.xlsx')) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            
            if (jsonData.length < 2) {
              reject(new Error('File must have at least headers and one data row'));
              return;
            }

            const headers = (jsonData[0] as string[]).map(h => String(h || ''));
            const dataRows = jsonData.slice(1).map((row: unknown) => {
              const dataRow: DataRow = {};
              headers.forEach((header, index) => {
                let value = (row as unknown[])[index];
                if (typeof value === 'object' || typeof value === 'undefined') {
                  value = '';
                }
                dataRow[header] = value as string | number | boolean;
              });
              return dataRow;
            });

            resolve({ headers, data: dataRows });
          } catch (error) {
            reject(error);
          }
        };
        reader.readAsArrayBuffer(file);
      });
    } else {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error('CSV parsing error'));
              return;
            }
            const headers = Object.keys(results.data[0] || {});
            const data = results.data as DataRow[];
            resolve({ headers, data });
          },
          error: (error) => {
            reject(error);
          }
        });
      });
    }
  };

  const handleFileUpload = useCallback(async (file: File, type: 'clients' | 'workers' | 'tasks') => {
    setUploadStatus(prev => ({ ...prev, [type]: 'uploading' }));
    
    try {
      const { headers, data } = await parseFile(file);
      
      // Generate AI-enhanced column mapping
      const mapping = await generateColumnMapping(headers, type);
      console.log(`Generated mapping for ${type}:`, mapping);
      console.log(`Original headers:`, headers);
      console.log(`Sample original data:`, data[0]);
      setColumnMappings(prev => ({ ...prev, [type]: mapping }));

      // Transform data using the mapping
      const transformedData = data.map((row, index) => {
        const transformed: DataRow = {};
        
        Object.entries(mapping).forEach(([expectedCol, actualCol]) => {
          let value = row[actualCol] || '';
          
          // Type conversion and validation
          if (expectedCol.includes('Level') || expectedCol.includes('Duration') || 
              expectedCol.includes('MaxLoad') || expectedCol.includes('MaxConcurrent')) {
            value = parseInt(String(value)) || 0;
          }
          
          transformed[expectedCol] = value;
        });

        if (index === 0) {
          console.log(`Sample transformed ${type} data:`, transformed);
        }
        return transformed;
      });

      // Set the data based on type
      if (type === 'clients') {
        setClients(transformedData as unknown as Client[]);
      } else if (type === 'workers') {
        setWorkers(transformedData as unknown as Worker[]);
      } else if (type === 'tasks') {
        setTasks(transformedData as unknown as Task[]);
      }
      
      setUploadStatus(prev => ({ ...prev, [type]: 'success' }));
      toast({
        title: "File uploaded successfully",
        description: `${type} data has been processed with AI column mapping.`,
      });
      
    } catch {
      setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
      toast({
        title: "Upload failed",
        description: "Failed to parse the file. Please check the format.",
        variant: "destructive"
      });
    }
  }, [setClients, setWorkers, setTasks, toast, generateColumnMapping]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading': return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />;
      default: return <Upload className="h-4 w-4 text-slate-400" />;
    }
  };

  const getMappingStatus = (type: string) => {
    const mapping = columnMappings[type];
    if (!mapping) return 0;
    const expectedColumns = type === 'clients' ? 6 : type === 'workers' ? 7 : 7;
    const mappedColumns = Object.keys(mapping).length;
    return Math.round((mappedColumns / expectedColumns) * 100);
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
              {columnMappings[type] && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">AI Mapping</span>
                    <span className="text-emerald-400">{getMappingStatus(type)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1 mt-1">
                    <div 
                      className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${getMappingStatus(type)}%` }}
                    />
                  </div>
                </div>
              )}
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
                      handleFileUpload(file, type as 'clients' | 'workers' | 'tasks');
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
              {clients.length > 0 ? (
                <DataGrid data={clients as unknown as DataRow[]} type="clients" />
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">No client data uploaded yet.</p>
                  <p className="text-sm text-slate-500 mt-2">Upload a CSV or XLSX file to get started.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="workers" className="mt-4">
              {workers.length > 0 ? (
                <DataGrid data={workers as unknown as DataRow[]} type="workers" />
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">No worker data uploaded yet.</p>
                  <p className="text-sm text-slate-500 mt-2">Upload a CSV or XLSX file to get started.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="tasks" className="mt-4">
              {tasks.length > 0 ? (
                <DataGrid data={tasks as unknown as DataRow[]} type="tasks" />
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">No task data uploaded yet.</p>
                  <p className="text-sm text-slate-500 mt-2">Upload a CSV or XLSX file to get started.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DataIngestionTab;
