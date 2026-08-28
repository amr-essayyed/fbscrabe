'use client';

import React, { useState, useMemo } from 'react';
import { PostRecord, PostStatus, PostCategory } from '@/lib/types';
import { PostCard } from './PostCard';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Grid, 
  List, 
  X, 
  Sparkles,
  Layers,
  CheckCircle2,
  ExternalLink,
  Flame,
  ThumbsUp,
  MessageSquare,
  Share2
} from 'lucide-react';

interface PostsExplorerProps {
  posts: PostRecord[];
  isLoading: boolean;
  onSelectPost: (post: PostRecord) => void;
  onUpdateStatus: (postId: number, newStatus: PostStatus) => void;
  initialStatusFilter?: string;
}

export function PostsExplorer({
  posts,
  isLoading,
  onSelectPost,
  onUpdateStatus,
  initialStatusFilter = 'All'
}: PostsExplorerProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusFilter);
  const [sortBy, setSortBy] = useState<'ad_score' | 'engagement' | 'date' | 'comments' | 'shares'>('ad_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categories: PostCategory[] = [
    'Product',
    'Promotion / Offer',
    'Educational',
    'Testimonial',
    'Customer Story',
    'Brand / Awareness',
    'Announcement',
    'Event',
    'Question / Engagement',
    'Other'
  ];

  // Client-side filtering & sorting for instant UI response
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      // Category filter
      if (selectedCategory !== 'All' && post.category !== selectedCategory) {
        return false;
      }
      // Status filter
      if (selectedStatus !== 'All' && post.status !== selectedStatus) {
        return false;
      }
      // Search term
      if (search.trim() !== '') {
        const term = search.toLowerCase();
        const textMatch = post.text?.toLowerCase().includes(term);
        const pageMatch = post.page_name?.toLowerCase().includes(term);
        const notesMatch = post.manual_notes?.toLowerCase().includes(term);
        if (!textMatch && !pageMatch && !notesMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortBy) {
        case 'ad_score':
          valA = a.ad_score || 0;
          valB = b.ad_score || 0;
          break;
        case 'engagement':
          valA = (a.reactions || 0) + (a.comments || 0) * 2 + (a.shares || 0) * 3;
          valB = (b.reactions || 0) + (b.comments || 0) * 2 + (b.shares || 0) * 3;
          break;
        case 'comments':
          valA = a.comments || 0;
          valB = b.comments || 0;
          break;
        case 'shares':
          valA = a.shares || 0;
          valB = b.shares || 0;
          break;
        case 'date':
        default:
          valA = new Date(a.date || a.created_at || 0).getTime();
          valB = new Date(b.date || b.created_at || 0).getTime();
          break;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [posts, search, selectedCategory, selectedStatus, sortBy, sortOrder]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Filter Bar */}
      <div className="rounded-2xl glass-panel p-4 space-y-4">
        
        {/* Row 1: Search & Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search copy, page, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-10 pr-9 py-2 text-xs font-medium text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort & View Mode Switches */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-800 rounded-xl p-1">
              <span className="text-[11px] text-slate-400 pl-2 font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="ad_score" className="bg-slate-900">Ad Score</option>
                <option value="engagement" className="bg-slate-900">Engagement</option>
                <option value="date" className="bg-slate-900">Date Scraped</option>
                <option value="shares" className="bg-slate-900">Virality / Shares</option>
                <option value="comments" className="bg-slate-900">Comments</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title={`Sort ${sortOrder.toUpperCase()}`}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Grid / List Switcher */}
            <div className="flex items-center rounded-xl bg-slate-900/90 border border-slate-800 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`rounded-lg p-1.5 transition-colors ${
                  viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`rounded-lg p-1.5 transition-colors ${
                  viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Status & Category Quick Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Unreviewed', 'Selected', 'Review Later', 'Rejected'].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === st
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1 text-xs font-medium text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-slate-200">{filteredPosts.length}</strong> of{' '}
          <strong className="text-slate-200">{posts.length}</strong> total posts
        </span>
        {(search || selectedCategory !== 'All' || selectedStatus !== 'All') && (
          <button
            onClick={() => {
              setSearch('');
              setSelectedCategory('All');
              setSelectedStatus('All');
            }}
            className="text-indigo-400 hover:underline font-medium"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Posts Cards Grid or List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-2xl glass-panel p-12 text-center space-y-3">
          <Layers className="mx-auto h-10 w-10 text-slate-600" />
          <h3 className="text-sm font-bold text-slate-300">No matching posts found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or category filter to discover more scraped Facebook posts.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onSelectPost={onSelectPost}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filteredPosts.map((post) => (
            <div
              key={post.id}
              onClick={() => onSelectPost(post)}
              className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl glass-panel p-4 gap-4 hover:border-indigo-500/40 cursor-pointer transition-all"
            >
              <div className="flex items-start space-x-3.5 min-w-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 font-bold border border-slate-700">
                  {(post.page_name || 'FB')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-white truncate">
                      {post.page_name || 'Facebook Page'}
                    </span>
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {post.category || 'Other'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 mt-1">
                    {post.text}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800">
                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span className="flex items-center space-x-1">
                    <ThumbsUp className="h-3.5 w-3.5 text-blue-400" />
                    <span>{post.reactions}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{post.comments}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Share2 className="h-3.5 w-3.5 text-purple-400" />
                    <span>{post.shares}</span>
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-xs font-bold score-pill-good">
                    <Flame className="h-3 w-3" />
                    <span>{post.ad_score || 0}</span>
                  </div>

                  <select
                    value={post.status || 'Unreviewed'}
                    onChange={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(post.id, e.target.value as PostStatus);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-xs font-medium text-slate-300 focus:outline-none"
                  >
                    <option value="Unreviewed">Unreviewed</option>
                    <option value="Selected">Selected</option>
                    <option value="Review Later">Review Later</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
