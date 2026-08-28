'use client';

import React, { useState } from 'react';
import { PageRecord, PostRecord, PostStatus } from '@/lib/types';
import { PostsExplorer } from './PostsExplorer';
import { PageSettingsModal } from './PageSettingsModal';
import {
  Globe,
  Settings2,
  Layers,
  PlusCircle,
  Tag,
  FileText,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  BarChart2,
  Zap
} from 'lucide-react';

interface PagesViewProps {
  pages: PageRecord[];
  posts: PostRecord[];
  isLoading: boolean;
  onSelectPost: (post: PostRecord) => void;
  onUpdateStatus: (postId: number, status: PostStatus) => void;
  onAddPage: (name: string, url: string, categories: string[]) => Promise<void>;
  onUpdatePage: (pageId: number, updates: { name?: string; url?: string; categories?: string[] }) => Promise<void>;
  onDeletePage: (pageId: number) => Promise<void>;
}

export function PagesView({
  pages,
  posts,
  isLoading,
  onSelectPost,
  onUpdateStatus,
  onAddPage,
  onUpdatePage,
  onDeletePage
}: PagesViewProps) {
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null);
  const [settingsPage, setSettingsPage] = useState<PageRecord | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [categorizeToast, setCategorizeToast] = useState<{ message: string; ok: boolean } | null>(null);

  const selectedPage = pages.find((p) => p.id === selectedPageId) || null;
  const pagePosts = selectedPageId
    ? posts.filter((p) => p.page_id === selectedPageId)
    : [];

  const openSettings = (page: PageRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingsPage(page);
    setIsSettingsOpen(true);
  };

  const handleCategorize = async () => {
    if (!selectedPageId) return;
    setIsCategorizing(true);
    setCategorizeToast(null);
    try {
      const res = await fetch(`/api/pages/${selectedPageId}/categorize`, { method: 'POST' });
      const data = await res.json();
      setCategorizeToast({ message: data.message || data.error || 'Done', ok: data.success });
      setTimeout(() => setCategorizeToast(null), 4000);
    } catch {
      setCategorizeToast({ message: 'Failed to categorize posts', ok: false });
      setTimeout(() => setCategorizeToast(null), 4000);
    } finally {
      setIsCategorizing(false);
    }
  };

  const handleAddPage = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setIsAdding(true);
    try {
      await onAddPage(newName.trim(), newUrl.trim(), []);
      setNewName('');
      setNewUrl('');
      setShowAddForm(false);
    } finally {
      setIsAdding(false);
    }
  };

  const getPageStats = (pageId: number) => {
    const pagePosts = posts.filter((p) => p.page_id === pageId);
    return {
      total: pagePosts.length,
      selected: pagePosts.filter((p) => p.status === 'Selected').length,
      unreviewed: pagePosts.filter((p) => p.status === 'Unreviewed').length,
      avgScore: pagePosts.length
        ? Math.round(pagePosts.reduce((s, p) => s + (p.ad_score || 0), 0) / pagePosts.length)
        : 0
    };
  };

  return (
    <div className="flex gap-6 h-full">

      {/* ——— Left Sidebar: Page List ——— */}
      <div className="w-72 shrink-0 flex flex-col gap-3">

        {/* Sidebar Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Globe className="h-4 w-4 text-indigo-400" />
            <span>Tracked Pages</span>
          </h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-all"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Add Page</span>
          </button>
        </div>

        {/* Add Page Form */}
        {showAddForm && (
          <div className="rounded-xl glass-panel p-4 space-y-3 border border-indigo-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
            <p className="text-[11px] font-semibold text-slate-400">New Facebook Page</p>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="Page name..."
            />
            <input
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddPage(); }}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
              placeholder="https://facebook.com/page"
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddPage}
                disabled={isAdding || !newName.trim() || !newUrl.trim()}
                className="flex-1 rounded-lg bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add Page'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewName(''); setNewUrl(''); }}
                className="rounded-lg bg-slate-800 px-2 py-1.5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Page Cards */}
        <div className="flex flex-col gap-2">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            ))
          ) : pages.length === 0 ? (
            <div className="rounded-xl glass-panel p-5 text-center space-y-2">
              <Globe className="mx-auto h-7 w-7 text-slate-600" />
              <p className="text-xs text-slate-400">No pages tracked yet.</p>
              <p className="text-[11px] text-slate-600">Use the extension or import CSV to collect posts.</p>
            </div>
          ) : (
            pages.map((page) => {
              const stats = getPageStats(page.id);
              const isActive = selectedPageId === page.id;
              return (
                <button
                  key={page.id}
                  onClick={() => setSelectedPageId(isActive ? null : page.id)}
                  className={`group relative w-full text-left rounded-xl p-4 border transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/15 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                      : 'glass-panel hover:border-slate-600 hover:bg-slate-800/60'
                  }`}
                >
                  {/* Page Name & Settings */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <div className={`h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isActive ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {page.name[0].toUpperCase()}
                        </div>
                        <span className="truncate text-xs font-bold text-white">{page.name}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-1 pl-7">
                        {page.url.replace('https://www.facebook.com/', 'fb.com/')}
                      </p>
                    </div>
                    <button
                      onClick={(e) => openSettings(page, e)}
                      className="shrink-0 rounded-lg p-1 text-slate-500 opacity-0 group-hover:opacity-100 hover:bg-slate-700 hover:text-slate-200 transition-all"
                      title="Page settings"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pl-7">
                    <span className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span>{stats.total} posts</span>
                    </span>
                    <span className="flex items-center space-x-1 text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{stats.selected}</span>
                    </span>
                    <span className="flex items-center space-x-1 text-amber-400">
                      <Clock className="h-3 w-3" />
                      <span>{stats.unreviewed}</span>
                    </span>
                    {stats.total > 0 && (
                      <span className="flex items-center space-x-1 text-purple-400 ml-auto">
                        <BarChart2 className="h-3 w-3" />
                        <span>{stats.avgScore}</span>
                      </span>
                    )}
                  </div>

                  {/* Custom Categories Badge */}
                  {page.categories && page.categories.length > 0 && (
                    <div className="mt-2.5 pl-7 flex items-center space-x-1">
                      <Tag className="h-3 w-3 text-purple-400 shrink-0" />
                      <span className="text-[10px] text-purple-300 truncate">
                        {page.categories.slice(0, 3).join(' · ')}
                        {page.categories.length > 3 && ` +${page.categories.length - 3}`}
                      </span>
                    </div>
                  )}

                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <ChevronRight className="h-4 w-4 text-indigo-400" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ——— Right Panel: Posts for Selected Page ——— */}
      <div className="flex-1 min-w-0">
        {!selectedPageId ? (
          <div className="flex flex-col items-center justify-center h-80 rounded-2xl glass-panel border border-dashed border-slate-700/60 space-y-3">
            <Layers className="h-12 w-12 text-slate-700" />
            <h3 className="text-sm font-bold text-slate-400">Select a page to view its posts</h3>
            <p className="text-xs text-slate-600 text-center max-w-xs">
              Click any page in the sidebar to browse its scraped posts in isolation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Page Header Bar */}
            <div className="rounded-2xl glass-panel px-5 py-4 flex items-center justify-between border-l-4 border-l-indigo-500">
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-indigo-600/30">
                  {selectedPage?.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{selectedPage?.name}</h2>
                  <a
                    href={selectedPage?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-400 hover:underline"
                  >
                    {selectedPage?.url}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {selectedPage && selectedPage.categories && selectedPage.categories.length > 0 && (
                  <div className="hidden sm:flex items-center space-x-1.5 rounded-full bg-purple-900/30 border border-purple-700/40 px-3 py-1.5">
                    <Tag className="h-3 w-3 text-purple-400" />
                    <span className="text-[11px] text-purple-300 font-semibold">
                      {selectedPage.categories.length} AI {selectedPage.categories.length === 1 ? 'category' : 'categories'}
                    </span>
                  </div>
                )}
                <button
                  onClick={(e) => selectedPage && openSettings(selectedPage, e)}
                  className="flex items-center space-x-1.5 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  <span>Settings</span>
                </button>

                {/* Re-categorize button */}
                <button
                  onClick={handleCategorize}
                  disabled={isCategorizing || !selectedPage?.categories?.length}
                  title={
                    !selectedPage?.categories?.length
                      ? 'Configure AI categories in Page Settings first'
                      : `Re-categorize all posts using: ${selectedPage.categories.join(', ')}`
                  }
                  className={`flex items-center space-x-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedPage?.categories?.length
                      ? 'bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 disabled:opacity-60'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Zap className={`h-3.5 w-3.5 ${isCategorizing ? 'animate-pulse' : ''}`} />
                  <span>{isCategorizing ? 'Categorizing...' : 'AI Categorize Posts'}</span>
                </button>

                <button
                  onClick={() => window.open(`/api/export?format=csv&page_id=${selectedPageId}`, '_blank')}
                  className="flex items-center space-x-1.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-all"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {/* Categorize result toast */}
            {categorizeToast && (
              <div className={`rounded-xl px-4 py-3 text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200 ${
                categorizeToast.ok
                  ? 'bg-purple-900/40 border border-purple-600/40 text-purple-200'
                  : 'bg-rose-900/40 border border-rose-600/40 text-rose-300'
              }`}>
                <Zap className="h-3.5 w-3.5 shrink-0" />
                <span>{categorizeToast.message}</span>
              </div>
            )}

            {/* Posts Explorer for this page */}
            <PostsExplorer
              posts={pagePosts}
              isLoading={isLoading}
              onSelectPost={onSelectPost}
              onUpdateStatus={onUpdateStatus}
              initialStatusFilter="All"
            />
          </div>
        )}
      </div>

      {/* Page Settings Modal */}
      <PageSettingsModal
        page={settingsPage}
        isOpen={isSettingsOpen}
        onClose={() => { setIsSettingsOpen(false); setSettingsPage(null); }}
        onSave={onUpdatePage}
        onDelete={onDeletePage}
      />
    </div>
  );
}
