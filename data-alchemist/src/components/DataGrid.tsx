import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit2, Save, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useData } from '@/contexts/DataContext';
import { DataRow, Client, Worker, Task } from '../contexts/DataContext';

interface DataGridProps {
  data: DataRow[];
  type: 'clients' | 'workers' | 'tasks';
}

const DataGrid: React.FC<DataGridProps> = ({ data, type }) => {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const { setClients, setWorkers, setTasks } = useData();

  const getColumns = () => {
    if (data.length === 0) return [];
    return Object.keys(data[0]);
  };

  const startEdit = (rowIndex: number, column: string, currentValue: string | number | boolean) => {
    setEditingCell(`${rowIndex}-${column}`);
    setEditValue(String(currentValue));
  };

  const saveEdit = (rowIndex: number, column: string) => {
    const newData = [...data];
    let processedValue: string | number = editValue;

    // Type conversion based on column
    if (column.includes('Level') || column.includes('Duration') || column.includes('MaxLoad') || column.includes('MaxConcurrent')) {
      processedValue = parseInt(editValue) || 0;
    }

    newData[rowIndex] = { ...newData[rowIndex], [column]: processedValue };

    handleDataUpdate(newData, type);

    setEditingCell(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const hasValidationError = (rowIndex: number, column: string) => {
    const value = data[rowIndex][column];
    if (column === 'PriorityLevel' && (typeof value === 'number' && (value < 1 || value > 5))) return true;
    if (column === 'Duration' && (typeof value === 'number' && value < 1)) return true;
    if (!value && column.includes('ID')) return true;
    return false;
  };

  const columns = getColumns();

  const handleDataUpdate = (newData: DataRow[], type: string) => {
    if (type === 'clients') setClients(newData as unknown as Client[]);
    else if (type === 'workers') setWorkers(newData as unknown as Worker[]);
    else if (type === 'tasks') setTasks(newData as unknown as Task[]);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-sm sm:text-base">No data uploaded yet. Please upload a CSV or XLSX file above.</p>
      </div>
    );
  }

  // Mobile Card View
  const MobileCardView = () => (
    <div className="space-y-4">
      {data.map((row, rowIndex) => (
        <Card key={rowIndex} className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-white text-sm">
                {type.charAt(0).toUpperCase() + type.slice(1)} {rowIndex + 1}
              </CardTitle>
              <Badge 
                variant={hasValidationError(rowIndex, '') ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {hasValidationError(rowIndex, '') ? 'Error' : 'Valid'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {columns.map((column) => {
              const cellKey = `${rowIndex}-${column}`;
              const isEditing = editingCell === cellKey;
              const hasError = hasValidationError(rowIndex, column);
              
              return (
                <div key={column} className="flex flex-col space-y-1">
                  <label className="text-xs text-slate-400 font-medium">{column}</label>
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="bg-slate-600 border-slate-500 text-white h-8 text-sm flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(rowIndex, column);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => saveEdit(rowIndex, column)}
                        className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEdit}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group bg-slate-700/30 p-2 rounded">
                      <span className={`text-sm ${hasError ? 'text-red-400' : 'text-slate-300'} flex-1 break-all`}>
                        {String(row[column])}
                      </span>
                      <div className="flex items-center space-x-1 ml-2">
                        {hasError && (
                          <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEdit(rowIndex, column, row[column])}
                          className="h-6 w-6 p-0 opacity-70 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex justify-between items-center">
        <div className="text-slate-400 text-sm">
          {data.length} {type} loaded
        </div>
        <div className="sm:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileView(!isMobileView)}
            className="bg-slate-700 border-slate-600 text-slate-300"
          >
            {isMobileView ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
            {isMobileView ? 'Table' : 'Cards'}
          </Button>
        </div>
      </div>

      {/* Mobile Card View */}
      {(isMobileView || window.innerWidth < 640) && <MobileCardView />}

      {/* Desktop Table View */}
      {(!isMobileView && window.innerWidth >= 640) && (
        <div className="rounded-lg border border-slate-600 overflow-hidden">
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader className="bg-slate-700 sticky top-0">
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column} className="text-slate-200 font-medium text-xs sm:text-sm">
                      {column}
                    </TableHead>
                  ))}
                  <TableHead className="text-slate-200 w-16 sm:w-20 text-xs sm:text-sm">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex} className="hover:bg-slate-700/50">
                    {columns.map((column) => {
                      const cellKey = `${rowIndex}-${column}`;
                      const isEditing = editingCell === cellKey;
                      const hasError = hasValidationError(rowIndex, column);
                      
                      return (
                        <TableCell key={column} className="text-slate-300 relative p-2 sm:p-3">
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="bg-slate-600 border-slate-500 text-white h-8 text-xs sm:text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(rowIndex, column);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => saveEdit(rowIndex, column)}
                                className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-emerald-400 hover:text-emerald-300"
                              >
                                <Save className="h-2 w-2 sm:h-3 sm:w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                className="h-6 w-6 sm:h-8 sm:w-8 p-0 text-red-400 hover:text-red-300"
                              >
                                <X className="h-2 w-2 sm:h-3 sm:w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between group">
                              <span className={`text-xs sm:text-sm truncate max-w-32 sm:max-w-none ${hasError ? 'text-red-400' : ''}`} title={String(row[column])}>
                                {String(row[column])}
                              </span>
                              <div className="flex items-center space-x-1">
                                {hasError && (
                                  <AlertTriangle className="h-3 w-3 text-red-400" />
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEdit(rowIndex, column, row[column])}
                                  className="h-5 w-5 sm:h-6 sm:w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Edit2 className="h-2 w-2 sm:h-3 sm:w-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="p-2 sm:p-3">
                      <Badge 
                        variant={hasValidationError(rowIndex, '') ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {hasValidationError(rowIndex, '') ? 'Error' : 'Valid'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataGrid;
