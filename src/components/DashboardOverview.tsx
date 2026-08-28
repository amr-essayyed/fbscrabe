'use client';

import React from 'react';
import { DashboardStats, PostRecord, PostStatus } from '@/lib/types';
import { PostCard } from './PostCard';
import { 
  Flame, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  Award, 
  Sparkles, 
  ArrowRight,
  PieChart,
  BarChart3
} from 'lucide-react';

interface DashboardOverviewProps {
  stats: DashboardStats | null;
  isLoading: boolean;
  onSelectPost: (post: PostRecord) => void;
  onUpdateStatus: (postId: number, newStatus: PostStatus) => void;
  onViewAllPosts: () => void;
}

export function DashboardOverview({
  stats,
  isLoading,
  onSelectPost,
  onUpdateStatus,
  onViewAllPosts
}: DashboardOverviewProps) {
  if (isLoading || !stats) {
    return (
      <div className="space-y-6 py-8 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-900/60 border border-slate-800" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-slate-900/60 border border-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      
      {/* Hero / KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scraped */}
        <div className="relative overflow-hidden rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Scraped</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{stats.total_posts}</span>
            <span className="text-xs text-slate-400">posts in database</span>
          </div>
          <div className="mt-2 text-[11px] text-indigo-400 font-medium">
            +{stats.posts_this_week} added in last 7 days
          </div>
        </div>

        {/* Selected Candidates */}
        <div className="relative overflow-hidden rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Selected Ad Candidates</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-emerald-400">{stats.selected_count}</span>
            <span className="text-xs text-slate-400">ready for campaign</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400 font-medium">
            {stats.total_posts > 0 ? Math.round((stats.selected_count / stats.total_posts) * 100) : 0}% selection rate
          </div>
        </div>

        {/* Avg Ad Score */}
        <div className="relative overflow-hidden rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Ad Score</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-amber-400">{stats.avg_ad_score}</span>
            <span className="text-xs text-slate-400">/ 100 benchmark</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-400 font-medium">
            Rule + OpenRouter AI Scoring Engine
          </div>
        </div>

        {/* Avg Organic Engagement */}
        <div className="relative overflow-hidden rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Avg Engagement</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-white">{stats.avg_engagement.toLocaleString()}</span>
            <span className="text-xs text-slate-400">actions / post</span>
          </div>
          <div className="mt-2 text-[11px] text-purple-400 font-medium">
            Likes + Comments + Shares
          </div>
        </div>
      </div>

      {/* Section 1: Best Candidates for Paid Ads */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Top High-Potential Paid Ad Candidates</h2>
          </div>
          <button
            onClick={onViewAllPosts}
            className="flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>View All Explorer</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {stats.best_candidates && stats.best_candidates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {stats.best_candidates.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onSelectPost={onSelectPost}
                onUpdateStatus={onUpdateStatus}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl glass-panel p-8 text-center text-slate-400">
            No high-potential candidates analyzed yet. Try batch analyzing posts!
          </div>
        )}
      </div>

      {/* Section 2: Category Breakdown & Engagement Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Category Breakdown (1 col) */}
        <div className="rounded-2xl glass-panel p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <PieChart className="h-5 w-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Content Category Distribution</h3>
            </div>
            
            <div className="space-y-3">
              {stats.top_categories?.map((cat) => {
                const percentage = stats.total_posts > 0 ? Math.round((cat.count / stats.total_posts) * 100) : 0;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">{cat.category}</span>
                      <span className="text-slate-400 font-mono">{cat.count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
            <span>Primary Categories</span>
            <span className="text-indigo-400 font-semibold">{stats.top_categories?.length || 0} active</span>
          </div>
        </div>

        {/* Top Organic Performers (2 cols) */}
        <div className="lg:col-span-2 rounded-2xl glass-panel p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Viral & Organic Engagement Leaders</h3>
            </div>
            <span className="text-xs text-slate-400">Ranked by Virality Score</span>
          </div>

          <div className="space-y-3">
            {stats.top_performing?.slice(0, 4).map((post, idx) => (
              <div 
                key={post.id}
                onClick={() => onSelectPost(post)}
                className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3.5 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800/70 cursor-pointer transition-all"
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {post.page_name || 'Facebook Page'}
                      </span>
                      <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400">
                        {post.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5 max-w-md">
                      {post.text}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4 shrink-0 text-xs font-mono">
                  <div className="text-right">
                    <span className="block font-bold text-emerald-400">
                      {(post.reactions + post.comments * 2 + post.shares * 3).toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-slate-400">eng points</span>
                  </div>
                  <div className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-amber-400 border border-slate-700">
                    {post.ad_score} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
