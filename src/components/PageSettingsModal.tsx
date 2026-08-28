'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PageRecord } from '@/lib/types';
import { X, Tag, Plus, Trash2, Globe, Type, Save, AlertTriangle } from 'lucide-react';

const DEFAULT_CATEGORY_PRESETS = [
  'Product', 'Promotion / Offer', 'Educational', 'Testimonial',
  'Customer Story', 'Brand / Awareness', 'Announcement', 'Event',
  'Entertainment', 'Question / Engagement', 'Other'
];

interface PageSettingsModalProps {
  page: PageRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (pageId: number, updates: { name?: string; url?: string; categories?: string[] }) => Promise<void>;
  onDelete: (pageId: number) => Promise<void>;
}

export function PageSettingsModal({ page, isOpen, onClose, onSave, onDelete }: PageSettingsModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (page) {
      setName(page.name);
      setUrl(page.url);
      setCategories(page.categories || []);
      setConfirmDelete(false);
    }
  }, [page]);

  if (!isOpen || !page) return null;

  const togglePreset = (cat: string) => {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addCustomCategory = () => {
    const trimmed = customInput.trim();
    if (trimmed && !categories.includes(trimmed)) {
      setCategories((prev) => [...prev, trimmed]);
    }
    setCustomInput('');
    inputRef.current?.focus();
  };

  const removeCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(page.id, { name, url, categories });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(page.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700/80 shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Page Settings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure AI categories &amp; page details</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Page Name */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 mb-2">
              <Type className="h-3.5 w-3.5 text-indigo-400" />
              <span>Page Name</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="e.g. My Brand Page"
            />
          </div>

          {/* Page URL */}
          <div>
            <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300 mb-2">
              <Globe className="h-3.5 w-3.5 text-sky-400" />
              <span>Facebook Page URL</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
              placeholder="https://www.facebook.com/yourpage"
            />
          </div>

          {/* AI Categories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                <Tag className="h-3.5 w-3.5 text-purple-400" />
                <span>AI Classification Categories</span>
              </label>
              {categories.length > 0 && (
                <span className="text-[10px] text-slate-500">{categories.length} selected</span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              When posts from this page are analyzed, the AI will classify them into <strong className="text-slate-400">only</strong> these categories.
              Leave empty to use the default set.
            </p>

            {/* Preset Toggles */}
            <div className="flex flex-wrap gap-2 mb-3">
              {DEFAULT_CATEGORY_PRESETS.map((cat) => {
                const active = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => togglePreset(cat)}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all border ${
                      active
                        ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-300 shadow-sm shadow-indigo-500/20'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Custom Category Input */}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory(); } }}
                className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors"
                placeholder="Add custom category..."
              />
              <button
                onClick={addCustomCategory}
                disabled={!customInput.trim()}
                className="rounded-xl bg-purple-600/20 border border-purple-500/30 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-600/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Selected custom tags (non-preset) */}
            {categories.filter((c) => !DEFAULT_CATEGORY_PRESETS.includes(c)).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {categories
                  .filter((c) => !DEFAULT_CATEGORY_PRESETS.includes(c))
                  .map((cat) => (
                    <span
                      key={cat}
                      className="flex items-center space-x-1 rounded-full bg-purple-900/40 border border-purple-700/50 px-2.5 py-1 text-[11px] font-semibold text-purple-300"
                    >
                      <span>{cat}</span>
                      <button onClick={() => removeCategory(cat)} className="ml-0.5 hover:text-white transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className={`flex items-center space-x-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              confirmDelete
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 hover:bg-rose-500'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            {confirmDelete ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Page</span>
              </>
            )}
          </button>

          {/* Save */}
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !name.trim() || !url.trim()}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
