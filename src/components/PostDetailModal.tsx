'use client';

import React, { useState } from 'react';
import { PostRecord, PostStatus } from '@/lib/types';
import { 
  X, 
  Flame, 
  ExternalLink, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Zap, 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  Check, 
  AlertTriangle,
  Lightbulb,
  FileText,
  Save,
  Tag
} from 'lucide-react';

interface PostDetailModalProps {
  post: PostRecord | null;
  onClose: () => void;
  onUpdateStatus: (postId: number, newStatus: PostStatus) => void;
  onSaveNotes: (postId: number, notes: string) => void;
  onReanalyze: (postId: number) => Promise<void>;
  isReanalyzing: boolean;
}

export function PostDetailModal({
  post,
  onClose,
  onUpdateStatus,
  onSaveNotes,
  onReanalyze,
  isReanalyzing
}: PostDetailModalProps) {
  if (!post) return null;

  const [notes, setNotes] = useState(post.manual_notes || '');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  const ai = post.ai_analysis;
  const characteristics = post.characteristics || {};
  const score = post.ad_score || 0;

  const handleNotesBlur = () => {
    if (notes !== post.manual_notes) {
      setIsSavingNotes(true);
      onSaveNotes(post.id, notes);
      setTimeout(() => setIsSavingNotes(false), 500);
    }
  };

  const getScoreColor = (val: number = 0) => {
    if (val >= 8) return 'bg-emerald-500 text-emerald-400';
    if (val >= 6) return 'bg-blue-500 text-blue-400';
    if (val >= 4) return 'bg-amber-500 text-amber-400';
    return 'bg-rose-500 text-rose-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-5xl rounded-3xl glass-panel border border-slate-700/60 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 font-bold border border-indigo-500/30">
              {(post.page_name || 'FB')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white">{post.page_name || 'Facebook Post Detail'}</h3>
                {post.facebook_url && (
                  <a
                    href={post.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    <span>View on FB</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <span className="text-xs text-slate-400">
                Category: <strong className="text-slate-200">{post.category || 'Other'}</strong> • Scraped: {post.date ? new Date(post.date).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Reanalyze Button */}
            <button
              onClick={() => onReanalyze(post.id)}
              disabled={isReanalyzing}
              className="flex items-center space-x-1.5 rounded-xl bg-purple-600/20 border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-600/30 transition-all disabled:opacity-50"
            >
              <Zap className={`h-3.5 w-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span>{isReanalyzing ? 'Reanalyzing...' : 'Re-Analyze AI'}</span>
            </button>

            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Post Copy, Media & Notes (5 cols) */}
          <div className="lg:col-span-5 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-800 lg:pr-6 pb-6 lg:pb-0">
            
            {/* Media Preview */}
            {post.media_url && (
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 max-h-64">
                <img
                  src={post.media_url}
                  alt="Post creative preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Post Content */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Post Text Copy</label>
              <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap select-text max-h-60 overflow-y-auto">
                {post.text}
              </div>
            </div>

            {/* Organic Metrics */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5 text-center">
                <ThumbsUp className="mx-auto h-4 w-4 text-blue-400 mb-1" />
                <span className="block text-sm font-bold text-white">{post.reactions}</span>
                <span className="text-[10px] text-slate-400">Reactions</span>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5 text-center">
                <MessageSquare className="mx-auto h-4 w-4 text-emerald-400 mb-1" />
                <span className="block text-sm font-bold text-white">{post.comments}</span>
                <span className="text-[10px] text-slate-400">Comments</span>
              </div>
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5 text-center">
                <Share2 className="mx-auto h-4 w-4 text-purple-400 mb-1" />
                <span className="block text-sm font-bold text-white">{post.shares}</span>
                <span className="text-[10px] text-slate-400">Shares</span>
              </div>
            </div>

            {/* Manual Notes Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1">
                  <FileText className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Manual Notes</span>
                </label>
                {isSavingNotes && <span className="text-[10px] text-emerald-400">Saving...</span>}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={3}
                placeholder="Add creative notes, hook ideas, or media direction..."
                className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Right Column: AI Ad Evaluation Breakdown (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Score & Rating Hero Card */}
            <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-4">
              <div>
                <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI Direct Response Ad Score</span>
                <div className="flex items-baseline space-x-2 mt-1">
                  <span className="text-4xl font-extrabold text-white">{score}</span>
                  <span className="text-sm font-bold text-indigo-300">/ 100</span>
                  <span className="ml-3 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-3 py-0.5 text-xs font-bold text-indigo-300">
                    {ai?.rating || 'Evaluated'} Rating
                  </span>
                </div>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Flame className="h-7 w-7" />
              </div>
            </div>

            {/* 8-Criteria Metrics Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Copywriting & Ad Criteria Breakdown</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { label: 'Hook Strength', score: ai?.hook_strength },
                  { label: 'Product Focus', score: ai?.product_visibility },
                  { label: 'Value Prop', score: ai?.value_proposition },
                  { label: 'Emotional Appeal', score: ai?.emotional_appeal },
                  { label: 'Social Proof', score: ai?.social_proof },
                  { label: 'Offer Strength', score: ai?.offer_strength },
                  { label: 'CTA Clarity', score: ai?.cta_clarity },
                  { label: 'Conversion', score: ai?.conversion_potential }
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-slate-900/80 border border-slate-800 p-2.5 space-y-1.5">
                    <div className="flex justify-between items-center text-[11px] font-medium text-slate-300">
                      <span className="truncate">{item.label}</span>
                      <span className="font-bold text-white">{item.score || 0}/10</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getScoreColor(item.score).split(' ')[0]}`}
                        style={{ width: `${((item.score || 0) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Detected Characteristics Pills */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Detected Conversion Triggers</h4>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(characteristics).map(([key, val]) => {
                  if (!val) return null;
                  const formatted = key.replace('has_', '').replace('_', ' ');
                  return (
                    <span 
                      key={key} 
                      className="inline-flex items-center space-x-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20"
                    >
                      <Check className="h-3 w-3" />
                      <span className="capitalize">{formatted}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="rounded-2xl bg-emerald-950/20 border border-emerald-500/20 p-4 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Key Strengths</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {ai?.strengths?.map((s, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  )) || <li>Solid structure and readability.</li>}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="rounded-2xl bg-rose-950/20 border border-rose-500/20 p-4 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Improvement Areas</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  {ai?.weaknesses?.map((w, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{w}</span>
                    </li>
                  )) || <li>Add explicit lander CTA URL.</li>}
                </ul>
              </div>
            </div>

            {/* Suggested Ad Copy Angle & Recommendation */}
            <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <Lightbulb className="h-4 w-4" />
                <span>Suggested Ad Angle & Optimization</span>
              </div>
              <p className="text-xs text-slate-200">
                <strong className="text-amber-300">Ad Strategy Angle:</strong> {ai?.suggested_angle || 'Problem → Solution → Social Proof'}
              </p>
              <p className="text-xs text-slate-300">
                <strong className="text-indigo-400">Creative Improvement:</strong> {ai?.suggested_improvement || 'Append direct landing page link.'}
              </p>
            </div>

          </div>

        </div>

        {/* Modal Footer: Quick Decision Status Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <span className="text-xs font-semibold text-slate-400">
            Set Post Decision Status:
          </span>
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => onUpdateStatus(post.id, 'Selected')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                post.status === 'Selected'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 text-emerald-400 hover:bg-emerald-600/20 border border-emerald-500/30'
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark Selected Ad</span>
            </button>

            <button
              onClick={() => onUpdateStatus(post.id, 'Review Later')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                post.status === 'Review Later'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-slate-800 text-amber-400 hover:bg-amber-600/20 border border-amber-500/30'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Review Later</span>
            </button>

            <button
              onClick={() => onUpdateStatus(post.id, 'Rejected')}
              className={`flex-1 sm:flex-none flex items-center justify-center space-x-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                post.status === 'Rejected'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800 text-rose-400 hover:bg-rose-600/20 border border-rose-500/30'
              }`}
            >
              <XCircle className="h-4 w-4" />
              <span>Reject</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
