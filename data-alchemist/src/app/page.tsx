"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Upload, Database, Settings, Download, Sparkles, Brain, Search, Menu } from "lucide-react";
import DataIngestionTab from "@/components/DataIngestionTab";
import ValidationTab from "@/components/ValidationTab";
import RulesTab from "@/components/RulesTab";
import PrioritizationTab from "@/components/PrioritizationTab";
import ExportTab from "@/components/ExportTab";
import { DataProvider } from "@/contexts/DataContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Home = () => {
  const [activeTab, setActiveTab] = useState<"ingestion" | "validation" | "rules" | "prioritization" | "export">("ingestion");

  const progressSteps: Record<"ingestion" | "validation" | "rules" | "prioritization" | "export", number> = {
    ingestion: 20,
    validation: 40,
    rules: 60,
    prioritization: 80,
    export: 100,
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as "ingestion" | "validation" | "rules" | "prioritization" | "export");
  };

  const tabItems = [
    { value: "ingestion", label: "Data Ingestion", icon: Upload },
    { value: "validation", label: "Validation", icon: Database },
    { value: "rules", label: "Rules", icon: Settings },
    { value: "prioritization", label: "Priorities", icon: Search },
    { value: "export", label: "Export", icon: Download },
  ];

  return (
    <DataProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-2xl font-bold text-white">Data Alchemist</h1>
                  <p className="text-slate-400 text-xs sm:text-sm hidden sm:block">AI-Powered Resource Allocation Configurator</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">AI Enabled</span>
                  <span className="sm:hidden">AI</span>
                </Badge>
                <div className="text-right hidden sm:block">
                  <div className="text-sm text-slate-400">Progress</div>
                  <Progress value={progressSteps[activeTab]} className="w-24 h-2" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 sm:space-y-6">
            {/* Mobile Tab Navigation */}
            <div className="sm:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full bg-slate-800/50 border-slate-700 text-white">
                    <Menu className="h-4 w-4 mr-2" />
                    {tabItems.find((t) => t.value === activeTab)?.label}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-slate-900 border-slate-700">
                  <div className="grid grid-cols-1 gap-2 py-4">
                    {tabItems.map((tab) => (
                      <Button
                        key={tab.value}
                        variant={activeTab === tab.value ? "default" : "ghost"}
                        className={`justify-start ${
                          activeTab === tab.value
                            ? "bg-blue-600 text-white"
                            : "text-slate-300 hover:text-white hover:bg-slate-800"
                        }`}
                        onClick={() => setActiveTab(tab.value as "ingestion" | "validation" | "rules" | "prioritization" | "export")}
                      >
                        <tab.icon className="h-4 w-4 mr-2" />
                        {tab.label}
                      </Button>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Tab Navigation */}
            <TabsList className="hidden sm:grid w-full grid-cols-5 bg-slate-800/50 backdrop-blur-sm border border-slate-700">
              {tabItems.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  onClick={() => setActiveTab(tab.value as "ingestion" | "validation" | "rules" | "prioritization" | "export")}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  <span className="hidden lg:inline">{tab.label}</span>
                  <span className="lg:hidden">{tab.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Progress Bar for Mobile */}
            <div className="sm:hidden">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-400">Progress</span>
                <span className="text-sm text-slate-400">{progressSteps[activeTab]}%</span>
              </div>
              <Progress value={progressSteps[activeTab]} className="w-full h-2" />
            </div>

            {/* Tab Content */}
            <TabsContent value="ingestion">
              <DataIngestionTab />
            </TabsContent>

            <TabsContent value="validation">
              <ValidationTab />
            </TabsContent>

            <TabsContent value="rules">
              <RulesTab />
            </TabsContent>

            <TabsContent value="prioritization">
              <PrioritizationTab />
            </TabsContent>

            <TabsContent value="export">
              <ExportTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </DataProvider>
  );
};

export default Home;
