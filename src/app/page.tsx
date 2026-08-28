'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PostRecord, PageRecord, DashboardStats, PostStatus } from '@/lib/types';
import { Header } from '@/components/Header';
import { DashboardOverview } from '@/components/DashboardOverview';
import { PostsExplorer } from '@/components/PostsExplorer';
import { PagesView } from '@/components/PagesView';
import { PostDetailModal } from '@/components/PostDetailModal';
import { CreatePostModal } from '@/components/CreatePostModal';
import { SettingsModal } from '@/components/SettingsModal';
import { CollectorGuideModal } from '@/components/CollectorGuideModal';
import { Sparkles, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pages' | 'explorer' | 'selected'>('dashboard');
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostRecord | null>(null);
  
  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCollectorGuideOpen, setIsCollectorGuideOpen] = useState(false);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Posts, Pages & Dashboard Stats
  const fetchData = useCallback(async () => {
    try {
      const [postsRes, statsRes, pagesRes] = await Promise.all([
        fetch('/api/posts'),
        fetch('/api/stats'),
        fetch('/api/pages')
      ]);

      const postsData = await postsRes.json();
      const statsData = await statsRes.json();
      const pagesData = await pagesRes.json();

      if (postsData.success) setPosts(postsData.posts || []);
      if (statsData.success) setStats(statsData.stats || null);
      if (pagesData.success) setPages(pagesData.pages || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      showToast('Failed to load data from database', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle CSV File Upload Import
  const handleImportCsv = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      showToast('Importing CSV posts...', 'info');
      const res = await fetch('/api/import', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'CSV imported successfully!');
        await fetchData();
      } else {
        showToast(data.error || 'CSV import failed', 'error');
      }
    } catch (err) {
      showToast('Failed to upload CSV file', 'error');
    }
  };

  // Update Post Status
  const handleUpdateStatus = async (postId: number, newStatus: PostStatus) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
        );
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost((prev) => prev ? { ...prev, status: newStatus } : null);
        }
        showToast(`Post #${postId} marked as ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  // Save Notes
  const handleSaveNotes = async (postId: number, notes: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manual_notes: notes })
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, manual_notes: notes } : p))
        );
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost((prev) => prev ? { ...prev, manual_notes: notes } : null);
        }
      }
    } catch (err) {
      showToast('Failed to save notes', 'error');
    }
  };

  // Ingest New Post
  const handleCreatePost = async (postData: any) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const data = await res.json();
      if (data.success && data.post) {
        showToast(`Ingested post successfully! AI Score: ${data.post.ad_score}/100`);
        await fetchData();
      } else {
        showToast(data.error || 'Failed to ingest post', 'error');
      }
    } catch (err) {
      showToast('Failed to connect to server', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-Analyze Specific Post
  const handleReanalyze = async (postId: number) => {
    setIsReanalyzing(true);
    try {
      const res = await fetch(`/api/posts/${postId}/analyze`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success && data.post) {
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? data.post : p))
        );
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost(data.post);
        }
        showToast(`Re-analyzed! New Ad Score: ${data.post.ad_score}/100`);
        fetchData();
      } else {
        showToast(data.error || 'Failed to re-analyze post', 'error');
      }
    } catch (err) {
      showToast('Re-analysis error', 'error');
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Batch AI Analyze
  const handleBatchAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/posts/analyze-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reanalyzeAll: false })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Analyzed ${data.analyzed_count} posts`);
        await fetchData();
      } else {
        showToast(data.error || 'Batch analysis failed', 'error');
      }
    } catch (err) {
      showToast('Failed to start batch analysis', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ——— Page CRUD Handlers ———
  const handleAddPage = async (name: string, url: string, categories: string[]) => {
    try {
      const res = await fetch('/api/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, categories })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Page "${name}" added!`);
        await fetchData();
      } else {
        showToast(data.error || 'Failed to add page', 'error');
      }
    } catch {
      showToast('Failed to add page', 'error');
    }
  };

  const handleUpdatePage = async (
    pageId: number,
    updates: { name?: string; url?: string; categories?: string[] }
  ) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Page settings saved!');
        await fetchData();
      } else {
        showToast(data.error || 'Failed to save page', 'error');
      }
    } catch {
      showToast('Failed to save page', 'error');
    }
  };

  const handleDeletePage = async (pageId: number) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Page and its posts deleted.');
        await fetchData();
      } else {
        showToast(data.error || 'Failed to delete page', 'error');
      }
    } catch {
      showToast('Failed to delete page', 'error');
    }
  };

  const selectedPostsCount = posts.filter((p) => p.status === 'Selected').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      
      {/* Top Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCollectorGuide={() => setIsCollectorGuideOpen(true)}
        onImportCsv={handleImportCsv}
        onBatchAnalyze={handleBatchAnalyze}
        isAnalyzing={isAnalyzing}
        totalPosts={posts.length}
        selectedCount={selectedPostsCount}
        pagesCount={pages.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        
        {/* Tab 1: Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <DashboardOverview
            stats={stats}
            isLoading={isLoading}
            onSelectPost={(post) => setSelectedPost(post)}
            onUpdateStatus={handleUpdateStatus}
            onViewAllPosts={() => setActiveTab('explorer')}
          />
        )}

        {/* Tab 2: Pages — per-page isolated views */}
        {activeTab === 'pages' && (
          <PagesView
            pages={pages}
            posts={posts}
            isLoading={isLoading}
            onSelectPost={(post) => setSelectedPost(post)}
            onUpdateStatus={handleUpdateStatus}
            onAddPage={handleAddPage}
            onUpdatePage={handleUpdatePage}
            onDeletePage={handleDeletePage}
          />
        )}

        {/* Tab 3: All Posts Explorer */}
        {activeTab === 'explorer' && (
          <PostsExplorer
            posts={posts}
            isLoading={isLoading}
            onSelectPost={(post) => setSelectedPost(post)}
            onUpdateStatus={handleUpdateStatus}
            initialStatusFilter="All"
          />
        )}

        {/* Tab 4: Selected Ad Candidates */}
        {activeTab === 'selected' && (
          <div className="space-y-4">
            <div className="rounded-2xl glass-panel p-5 flex items-center justify-between border-l-4 border-l-emerald-500">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Selected Paid Ad Campaign Candidates</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  High-converting posts pre-screened and marked as winners for Facebook Ads launch.
                </p>
              </div>
              <button
                onClick={() => window.open('/api/export?format=csv&status=Selected', '_blank')}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition-all"
              >
                Export Selected CSV
              </button>
            </div>

            <PostsExplorer
              posts={posts}
              isLoading={isLoading}
              onSelectPost={(post) => setSelectedPost(post)}
              onUpdateStatus={handleUpdateStatus}
              initialStatusFilter="Selected"
            />
          </div>
        )}
      </main>

      {/* Post Detail Modal */}
      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onUpdateStatus={handleUpdateStatus}
        onSaveNotes={handleSaveNotes}
        onReanalyze={handleReanalyze}
        isReanalyzing={isReanalyzing}
      />

      {/* Ingest / Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreatePost}
        isSubmitting={isSubmitting}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      {/* Extension Collector Guide Modal */}
      <CollectorGuideModal
        isOpen={isCollectorGuideOpen}
        onClose={() => setIsCollectorGuideOpen(false)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 rounded-2xl bg-slate-900 border border-slate-700 px-4 py-3 shadow-2xl text-xs font-semibold text-slate-100 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {toast.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="h-4 w-4 text-indigo-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <p>PostSnag Intelligence System • Built with Next.js &amp; Better-SQLite3</p>
      </footer>
    </div>
  );
}
