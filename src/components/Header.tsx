'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  PlusCircle, 
  Download, 
  Settings, 
  Zap, 
  LayoutDashboard, 
  Layers, 
  CheckCircle2, 
  ChevronDown,
  Upload,
  Puzzle,
  FileSpreadsheet,
  FileJson,
  Globe
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'pages' | 'explorer' | 'selected';
  setActiveTab: (tab: 'dashboard' | 'pages' | 'explorer' | 'selected') => void;
  onOpenCreateModal: () => void;
  onOpenSettings: () => void;
  onOpenCollectorGuide: () => void;
  onImportCsv: (file: File) => void;
  onBatchAnalyze: () => void;
  isAnalyzing: boolean;
  totalPosts: number;
  selectedCount: number;
  pagesCount: number;
}

export function Header({
  activeTab,
  setActiveTab,
  onOpenCreateModal,
  onOpenSettings,
  onOpenCollectorGuide,
  onImportCsv,
  onBatchAnalyze,
  isAnalyzing,
  totalPosts,
  selectedCount,
  pagesCount
}: HeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = (format: 'csv' | 'json') => {
    setShowExportMenu(false);
    window.open(`/api/export?format=${format}`, '_blank');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportCsv(file);
      e.target.value = '';
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">PostSnag</h1>
              <span className="inline-flex items-center rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                AI Ad Intelligence
              </span>
            </div>
            <p className="text-xs text-slate-400">Meta Paid Ad Scoring & Scrape Analyzer</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('pages')}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'pages'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Pages</span>
            <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
              {pagesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'explorer'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>All Posts</span>
            <span className="ml-1 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300">
              {totalPosts}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('selected')}
            className={`flex items-center space-x-2 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
              activeTab === 'selected'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Selected Ads</span>
            <span className="ml-1 rounded-full bg-emerald-950 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-800/50">
              {selectedCount}
            </span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onOpenCollectorGuide}
            className="hidden sm:flex items-center space-x-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-all"
            title="Install or view Chrome Extension Collector instructions"
          >
            <Puzzle className="h-3.5 w-3.5 text-indigo-400" />
            <span>Extension Collector</span>
          </button>

          <button
            onClick={onBatchAnalyze}
            disabled={isAnalyzing}
            className="hidden lg:flex items-center space-x-1.5 rounded-lg bg-purple-600/20 px-3 py-1.5 text-xs font-semibold text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition-all disabled:opacity-50"
            title="Batch AI Analyze unanalyzed or pending posts"
          >
            <Zap className={`h-3.5 w-3.5 text-purple-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing...' : 'Batch AI Analyze'}</span>
          </button>

          <button
            onClick={onOpenCreateModal}
            className="flex items-center space-x-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Ingest Post</span>
          </button>

          {/* Export / Import Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center space-x-1 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Data</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-slate-900 border border-slate-800 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <label className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer">
                  <Upload className="h-4 w-4 text-sky-400" />
                  <span>Import CSV Backup</span>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
                <div className="my-1 border-t border-slate-800" />
                <button
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                  <span>Export as CSV</span>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="flex w-full items-center space-x-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  <FileJson className="h-4 w-4 text-indigo-400" />
                  <span>Export as JSON</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={onOpenSettings}
            className="rounded-lg bg-slate-900 border border-slate-800 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
            title="Open Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Nav bar */}
      <div className="flex md:hidden border-t border-slate-800/60 bg-slate-950 px-4 py-2 justify-around">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center space-x-1 text-xs font-medium ${
            activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Dashboard</span>
        </button>

        <button
          onClick={() => setActiveTab('pages')}
          className={`flex items-center space-x-1 text-xs font-medium ${
            activeTab === 'pages' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Globe className="h-4 w-4" />
          <span>Pages</span>
        </button>

        <button
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center space-x-1 text-xs font-medium ${
            activeTab === 'explorer' ? 'text-indigo-400' : 'text-slate-400'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>All ({totalPosts})</span>
        </button>

        <button
          onClick={() => setActiveTab('selected')}
          className={`flex items-center space-x-1 text-xs font-medium ${
            activeTab === 'selected' ? 'text-emerald-400' : 'text-slate-400'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Selected ({selectedCount})</span>
        </button>
      </div>
    </header>
  );
}

