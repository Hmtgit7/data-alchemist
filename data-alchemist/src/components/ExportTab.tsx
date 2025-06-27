import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Download, FileText, Package, AlertCircle } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/hooks/use-toast';

interface DataRow {
  [key: string]: string | number | boolean;
}

const ExportTab = () => {
  const { clients, workers, tasks, rules, priorities, validationErrors } = useData();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const hasErrors = validationErrors.filter(e => e.severity === 'error').length > 0;
  const totalRecords = clients.length + workers.length + tasks.length;
  const totalRules = rules.filter(r => r.active).length;

  const convertToCSV = (data: DataRow[]) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          typeof row[header] === 'string' && row[header].includes(',') 
            ? `"${row[header]}"` 
            : row[header]
        ).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const downloadFile = (content: string, filename: string, type: string = 'text/csv') => {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const generateRulesJSON = () => {
    return JSON.stringify({
      version: '1.0',
      generatedAt: new Date().toISOString(),
      configuration: {
        priorities,
        rules: rules.filter(r => r.active).map(rule => ({
          id: rule.id,
          type: rule.type,
          name: rule.name,
          description: rule.description,
          config: rule.config,
          active: rule.active
        }))
      },
      metadata: {
        totalClients: clients.length,
        totalWorkers: workers.length,
        totalTasks: tasks.length,
        totalRules: totalRules,
        validationStatus: hasErrors ? 'errors_present' : 'clean'
      }
    }, null, 2);
  };

  const exportAll = async () => {
    if (hasErrors) {
      toast({
        title: "Export blocked",
        description: "Please fix all validation errors before exporting.",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate export process with progress
      const steps = [
        { name: 'Cleaning client data', progress: 20 },
        { name: 'Cleaning worker data', progress: 40 },
        { name: 'Cleaning task data', progress: 60 },
        { name: 'Generating rules configuration', progress: 80 },
        { name: 'Finalizing export package', progress: 100 }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 800));
        setExportProgress(step.progress);
      }

      // Generate and download files
      const clientsCSV = convertToCSV(clients as unknown as DataRow[]);
      const workersCSV = convertToCSV(workers as unknown as DataRow[]);
      const tasksCSV = convertToCSV(tasks as unknown as DataRow[]);
      const rulesJSON = generateRulesJSON();

      // Download individual files
      downloadFile(clientsCSV, 'clients_clean.csv');
      downloadFile(workersCSV, 'workers_clean.csv');
      downloadFile(tasksCSV, 'tasks_clean.csv');
      downloadFile(rulesJSON, 'rules_config.json', 'application/json');

      toast({
        title: "Export completed",
        description: "All files have been downloaded successfully.",
      });

    } catch {
      toast({
        title: "Export failed",
        description: "An error occurred during export. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const exportSingleFile = (type: 'clients' | 'workers' | 'tasks' | 'rules') => {
    try {
      switch (type) {
        case 'clients':
          const clientsCSV = convertToCSV(clients as unknown as DataRow[]);
          downloadFile(clientsCSV, 'clients_clean.csv');
          break;
        case 'workers':
          const workersCSV = convertToCSV(workers as unknown as DataRow[]);
          downloadFile(workersCSV, 'workers_clean.csv');
          break;
        case 'tasks':
          const tasksCSV = convertToCSV(tasks as unknown as DataRow[]);
          downloadFile(tasksCSV, 'tasks_clean.csv');
          break;
        case 'rules':
          const rulesJSON = generateRulesJSON();
          downloadFile(rulesJSON, 'rules_config.json', 'application/json');
          break;
      }

      toast({
        title: "File exported",
        description: `${type} data has been downloaded.`,
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Failed to export file. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Export Status */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Export Readiness</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                totalRecords > 0 ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                {totalRecords > 0 ? <CheckCircle className="h-6 w-6 text-white" /> : <AlertCircle className="h-6 w-6 text-slate-400" />}
              </div>
              <p className="text-2xl font-bold text-white">{totalRecords}</p>
              <p className="text-slate-400 text-sm">Data Records</p>
            </div>

            <div className="text-center">
              <div className={`h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                totalRules > 0 ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                {totalRules > 0 ? <CheckCircle className="h-6 w-6 text-white" /> : <AlertCircle className="h-6 w-6 text-slate-400" />}
              </div>
              <p className="text-2xl font-bold text-white">{totalRules}</p>
              <p className="text-slate-400 text-sm">Active Rules</p>
            </div>

            <div className="text-center">
              <div className={`h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                !hasErrors ? 'bg-emerald-500' : 'bg-red-500'
              }`}>
                {!hasErrors ? <CheckCircle className="h-6 w-6 text-white" /> : <AlertCircle className="h-6 w-6 text-white" />}
              </div>
              <p className="text-2xl font-bold text-white">
                {validationErrors.filter(e => e.severity === 'error').length}
              </p>
              <p className="text-slate-400 text-sm">Validation Errors</p>
            </div>

            <div className="text-center">
              <div className={`h-12 w-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                !hasErrors && totalRecords > 0 ? 'bg-emerald-500' : 'bg-slate-600'
              }`}>
                <Package className="h-6 w-6 text-white" />
              </div>
              <p className="text-2xl font-bold text-white">
                {!hasErrors && totalRecords > 0 ? 'Ready' : 'Not Ready'}
              </p>
              <p className="text-slate-400 text-sm">Export Status</p>
            </div>
          </div>

          {hasErrors && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <p className="text-red-400 font-medium">Export Blocked</p>
              </div>
              <p className="text-red-300 text-sm mt-1">
                Please resolve all validation errors in the Validation tab before exporting.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Export Progress */}
      {isExporting && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-medium">Exporting data...</p>
                <p className="text-slate-400">{exportProgress}%</p>
              </div>
              <Progress value={exportProgress} className="w-full" />
              <p className="text-slate-400 text-sm">
                Processing and cleaning data for downstream allocation tools
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Individual File Exports */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Individual File Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="h-8 w-8 text-blue-400" />
                  <Badge variant="secondary">{clients.length} records</Badge>
                </div>
                <h3 className="text-white font-medium mb-2">Clients Data</h3>
                <p className="text-slate-400 text-sm mb-3">Clean client information with validated priority levels</p>
                <Button 
                  onClick={() => exportSingleFile('clients')}
                  disabled={clients.length === 0 || isExporting}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="h-8 w-8 text-emerald-400" />
                  <Badge variant="secondary">{workers.length} records</Badge>
                </div>
                <h3 className="text-white font-medium mb-2">Workers Data</h3>
                <p className="text-slate-400 text-sm mb-3">Validated worker profiles with skills and availability</p>
                <Button 
                  onClick={() => exportSingleFile('workers')}
                  disabled={workers.length === 0 || isExporting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="h-8 w-8 text-purple-400" />
                  <Badge variant="secondary">{tasks.length} records</Badge>
                </div>
                <h3 className="text-white font-medium mb-2">Tasks Data</h3>
                <p className="text-slate-400 text-sm mb-3">Task definitions with requirements and constraints</p>
                <Button 
                  onClick={() => exportSingleFile('tasks')}
                  disabled={tasks.length === 0 || isExporting}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-slate-700 border-slate-600">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <FileText className="h-8 w-8 text-yellow-400" />
                  <Badge variant="secondary">{totalRules} rules</Badge>
                </div>
                <h3 className="text-white font-medium mb-2">Rules Config</h3>
                <p className="text-slate-400 text-sm mb-3">Business rules and priority configuration</p>
                <Button 
                  onClick={() => exportSingleFile('rules')}
                  disabled={totalRules === 0 || isExporting}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Complete Export */}
      <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Complete Export Package
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-slate-300">
              Export all cleaned data files and rules configuration as a complete package ready for downstream allocation tools.
            </p>
            
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span>Includes: clients_clean.csv, workers_clean.csv, tasks_clean.csv, rules_config.json</span>
            </div>
            
            <Button 
              onClick={exportAll}
              disabled={hasErrors || totalRecords === 0 || isExporting}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
              size="lg"
            >
              <Download className="h-5 w-5 mr-2" />
              {isExporting ? 'Exporting...' : 'Export Complete Package'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportTab;
