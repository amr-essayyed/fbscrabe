'use client';

import React, { useState } from 'react';
import { X, PlusCircle, Sparkles } from 'lucide-react';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (postData: any) => Promise<void>;
  isSubmitting: boolean;
}

export function CreatePostModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting
}: CreatePostModalProps) {
  if (!isOpen) return null;

  const [formData, setFormData] = useState({
    page_name: '',
    page_url: '',
    facebook_url: '',
    text: '',
    media_url: '',
    media_type: 'image',
    reactions: 0,
    comments: 0,
    shares: 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'reactions' || name === 'comments' || name === 'shares' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim()) return;
    await onSubmit(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl glass-panel border border-slate-700 shadow-2xl overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Ingest Facebook Post</h3>
              <p className="text-xs text-slate-400">Manual entry with instant AI Ad Potential analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Page Name</label>
              <input
                type="text"
                name="page_name"
                value={formData.page_name}
                onChange={handleChange}
                placeholder="e.g. Acme Fitness"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Page URL</label>
              <input
                type="url"
                name="page_url"
                value={formData.page_url}
                onChange={handleChange}
                placeholder="https://facebook.com/acmefitness"
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Facebook Post URL</label>
            <input
              type="url"
              name="facebook_url"
              value={formData.facebook_url}
              onChange={handleChange}
              placeholder="https://facebook.com/acmefitness/posts/123456"
              className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Post Copy Text <span className="text-rose-400">*</span>
            </label>
            <textarea
              name="text"
              required
              rows={4}
              value={formData.text}
              onChange={handleChange}
              placeholder="Paste the full Facebook post copy text here..."
              className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">Media URL (Image / Video)</label>
              <input
                type="url"
                name="media_url"
                value={formData.media_url}
                onChange={handleChange}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Media Type</label>
              <select
                name="media_type"
                value={formData.media_type}
                onChange={handleChange}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="none">None</option>
              </select>
            </div>
          </div>

          {/* Organic Metrics Inputs */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Reactions / Likes</label>
              <input
                type="number"
                name="reactions"
                min="0"
                value={formData.reactions}
                onChange={handleChange}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Comments</label>
              <input
                type="number"
                name="comments"
                min="0"
                value={formData.comments}
                onChange={handleChange}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Shares</label>
              <input
                type="number"
                name="shares"
                min="0"
                value={formData.shares}
                onChange={handleChange}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs font-mono text-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.text.trim()}
              className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition-all"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isSubmitting ? 'Ingesting & Analyzing...' : 'Save & AI Analyze'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
