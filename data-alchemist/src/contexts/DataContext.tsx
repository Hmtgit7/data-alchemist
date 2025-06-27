import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Client {
  ClientID: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string;
  GroupTag: string;
  AttributesJSON: string;
}

export interface Worker {
  WorkerID: string;
  WorkerName: string;
  Skills: string;
  AvailableSlots: string;
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: string;
}

export interface Task {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string;
  PreferredPhases: string;
  MaxConcurrent: number;
}

export interface DataRow {
  [key: string]: string | number | boolean;
}

export interface ValidationError {
  type: string;
  message: string;
  entity: string;
  field?: string;
  severity: 'error' | 'warning';
}

export interface Rule {
  id: string;
  type: string;
  name: string;
  description: string;
  config: Record<string, unknown>;
  active: boolean;
}

interface DataContextType {
  clients: Client[];
  setClients: (clients: Client[]) => void;
  workers: Worker[];
  setWorkers: (workers: Worker[]) => void;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  validationErrors: ValidationError[];
  setValidationErrors: (errors: ValidationError[]) => void;
  rules: Rule[];
  setRules: (rules: Rule[]) => void;
  addRule: (rule: Rule) => void;
  removeRule: (id: string) => void;
  priorities: Record<string, number>;
  setPriorities: (priorities: Record<string, number>) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [priorities, setPriorities] = useState<Record<string, number>>({
    fulfillment: 5,
    fairness: 3,
    priority: 4,
    efficiency: 3,
    workload: 2
  });
  const [searchQuery, setSearchQuery] = useState('');

  const addRule = (rule: Rule) => {
    setRules(prev => [...prev, rule]);
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(rule => rule.id !== id));
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        setClients,
        workers,
        setWorkers,
        tasks,
        setTasks,
        validationErrors,
        setValidationErrors,
        rules,
        setRules,
        addRule,
        removeRule,
        priorities,
        setPriorities,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
