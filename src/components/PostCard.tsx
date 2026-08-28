'use client';

import React from 'react';
import { PostRecord, PostStatus } from '@/lib/types';
import { 
  ThumbsUp, 
  MessageSquare, 
  Share2, 
  ExternalLink, 
  Sparkles, 
  Tag, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Image as ImageIcon,
  Flame,
  Zap
} from 'lucide-react';

interface PostCardProps {
  post: PostRecord;
  onSelectPost: (post: PostRecord) => void;
  onUpdateStatus: (postId: number, newStatus: PostStatus) => void;
}

export function PostCard({ post, onSelectPost, onUpdateStatus }: PostCardProps) {
  const score = post.ad_score || 0;

  // Determine pill style based on score
  let scoreClass = 'score-pill-poor';
  let scoreLabel = 'Low Potential';
  if (score >= 85) {
    scoreClass = 'score-pill-excellent';
    scoreLabel = 'High Ad Winner';
  } else if (score >= 70) {
    scoreClass = 'score-pill-good';
    scoreLabel = 'Good Candidate';
  } else if (score >= 50) {
    scoreClass = 'score-pill-average';
    scoreLabel = 'Average';
  }

  const getStatusBadge = (status: PostStatus) => {
    switch (status) {
      case 'Selected':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Review Later':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation();
    onUpdateStatus(post.id, e.target.value as PostStatus);
  };

  return (
    <div 
      onClick={() => onSelectPost(post)}
      className="group relative flex flex-col justify-between rounded-2xl glass-panel glass-panel-hover p-5 cursor-pointer transition-all duration-200"
    >
      {/* Top Bar: Page Info & Score Pill */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 font-bold border border-slate-700">
              {(post.page_name || 'FB')[0].toUpperCase()}
            </div>
            <div className="truncate">
              <div className="flex items-center space-x-1.5">
                <span className="font-semibold text-sm text-slate-100 truncate">
                  {post.page_name || 'Facebook Page'}
                </span>
                {post.facebook_url && (
                  <a
                    href={post.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <span className="text-xs text-slate-400 block">
                {post.date ? new Date(post.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently Scraped'}
              </span>
            </div>
          </div>

          {/* Ad Potential Score */}
          <div className={`flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-bold ${scoreClass}`}>
            <Flame className="h-3.5 w-3.5" />
            <span>{score}</span>
            <span className="hidden sm:inline text-[10px] opacity-80">/ 100</span>
          </div>
        </div>

        {/* Media Thumbnail (If Present) */}
        {post.media_url && (
          <div className="relative mb-3.5 h-44 w-full overflow-hidden rounded-xl bg-slate-900 border border-slate-800">
            <img 
              src={post.media_url} 
              alt="Post creative"
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute top-2 right-2 rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300 backdrop-blur-sm border border-slate-800">
              {post.media_type || 'Media'}
            </div>
          </div>
        )}

        {/* Post Copy Snippet */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed line-clamp-3 mb-4 font-normal">
          {post.text}
        </p>

        {/* Highlighted Characteristics Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span className="inline-flex items-center space-x-1 rounded-md bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/60">
            <Tag className="h-3 w-3 text-indigo-400" />
            <span>{post.category || 'Other'}</span>
          </span>

          {post.characteristics?.has_offer && (
            <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
              Offer / Promo
            </span>
          )}

          {post.characteristics?.has_social_proof && (
            <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-400 border border-blue-500/20">
              Social Proof
            </span>
          )}

          {post.characteristics?.has_cta && (
            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-400 border border-purple-500/20">
              CTA Included
            </span>
          )}

          {post.characteristics?.has_strong_hook && (
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-400 border border-amber-500/20">
              Hook
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer: Engagement Stats & Actions */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Organic Engagement counters */}
        <div className="flex items-center space-x-3 text-xs text-slate-400">
          <span className="flex items-center space-x-1" title="Reactions / Likes">
            <ThumbsUp className="h-3.5 w-3.5 text-blue-400" />
            <span>{post.reactions >= 1000 ? `${(post.reactions/1000).toFixed(1)}k` : post.reactions}</span>
          </span>
          <span className="flex items-center space-x-1" title="Comments">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
            <span>{post.comments >= 1000 ? `${(post.comments/1000).toFixed(1)}k` : post.comments}</span>
          </span>
          <span className="flex items-center space-x-1" title="Shares">
            <Share2 className="h-3.5 w-3.5 text-purple-400" />
            <span>{post.shares >= 1000 ? `${(post.shares/1000).toFixed(1)}k` : post.shares}</span>
          </span>
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center space-x-2">
          <select
            value={post.status || 'Unreviewed'}
            onChange={handleStatusChange}
            onClick={(e) => e.stopPropagation()}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold border transition-colors cursor-pointer focus:outline-none ${getStatusBadge(post.status)}`}
          >
            <option value="Unreviewed" className="bg-slate-900 text-slate-200">Unreviewed</option>
            <option value="Selected" className="bg-slate-900 text-emerald-400">Selected</option>
            <option value="Review Later" className="bg-slate-900 text-amber-400">Review Later</option>
            <option value="Rejected" className="bg-slate-900 text-rose-400">Rejected</option>
          </select>
        </div>
      </div>
    </div>
  );
}
