'use client';

import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Cpu, Code2, Copy, Check, Info } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('google/gemini-2.0-flash-001');
  const [customCategories, setCustomCategories] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.settings) {
          setApiKey(data.settings.openrouter_api_key || '');
          setModel(data.settings.openrouter_model || 'google/gemini-2.0-flash-001');
          setCustomCategories(data.settings.custom_categories || '');
        }
      })
      .catch((err) => console.error('Failed to load settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openrouter_api_key: apiKey,
          openrouter_model: model,
          custom_categories: customCategories
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const webhookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/posts/ingest` : 'http://localhost:3000/api/posts/ingest';
  
  const snippetCode = `fetch("${webhookUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    page_name: "Acme Brand",
    facebook_url: "https://facebook.com/acme/posts/101",
    text: "🔥 20% OFF Compression Shorts today only with code POWER20!",
    reactions: 1420,
    comments: 215,
    shares: 89
  })
});`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(snippetCode);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl glass-panel border border-slate-700 shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Settings & Integration Webhooks</h3>
              <p className="text-xs text-slate-400">OpenRouter AI keys & Scraper Ingest Webhook API</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* AI Settings Form */}
          <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-slate-900/70 border border-slate-800 p-4">
            <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
              <Key className="h-4 w-4 text-purple-400" />
              <span>OpenRouter AI Configuration</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                OpenRouter API Key (Optional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs font-mono text-slate-200 focus:border-purple-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500 flex items-center space-x-1">
                <Info className="h-3 w-3 text-purple-400 shrink-0" />
                <span>Leave empty to use PostSnag's instant built-in Direct Response Rule Engine.</span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center space-x-1">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                <span>AI Model Selection</span>
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none cursor-pointer"
              >
                <option value="google/gemini-2.0-flash-001">Google Gemini 2.0 Flash (Fastest & High Precision)</option>
                <option value="anthropic/claude-3.5-sonnet">Anthropic Claude 3.5 Sonnet (Best Copy Analysis)</option>
                <option value="openai/gpt-4o-mini">OpenAI GPT-4o Mini (Balanced)</option>
                <option value="deepseek/deepseek-r1">DeepSeek R1 (Reasoning)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Custom Categories (comma separated)
              </label>
              <input
                type="text"
                value={customCategories}
                onChange={(e) => setCustomCategories(e.target.value)}
                placeholder="e.g. Fitness, SaaS, E-commerce, Real Estate"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-xs font-sans text-slate-200 focus:border-purple-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-500 flex items-center space-x-1">
                <Info className="h-3 w-3 text-purple-400 shrink-0" />
                <span>Override the default PostSnag categories for AI analysis.</span>
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              {saveSuccess ? (
                <span className="text-xs font-semibold text-emerald-400 flex items-center space-x-1">
                  <Check className="h-3.5 w-3.5" />
                  <span>Settings Saved!</span>
                </span>
              ) : <span />}

              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition-all"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          {/* Web Extension & Scraper Integration Snippet */}
          <div className="space-y-3 rounded-2xl bg-slate-900/70 border border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <span>Browser Extension & Ingestion API</span>
              </div>
              <button
                onClick={copyToClipboard}
                className="flex items-center space-x-1 rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              >
                {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Send scraped posts directly from Chrome extensions, Python scrapers, or Puppeteer into PostSnag:
            </p>

            <div className="relative rounded-xl bg-slate-950 p-3.5 border border-slate-800">
              <pre className="text-[11px] font-mono text-emerald-300 overflow-x-auto whitespace-pre">
                {snippetCode}
              </pre>
            </div>

            <div className="text-[11px] text-slate-500">
              • Automatic SHA-256 deduplication prevents double-ingestion of identical posts.<br />
              • CORS preflight headers are enabled by default for seamless cross-origin extension requests.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
