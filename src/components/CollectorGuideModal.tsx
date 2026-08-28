'use client';

import React from 'react';
import { X, Puzzle, Download, CheckCircle2, Play, Globe, ArrowRight, ShieldCheck } from 'lucide-react';

interface CollectorGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CollectorGuideModal({ isOpen, onClose }: CollectorGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Puzzle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Browser Collector Setup</h2>
              <p className="text-xs text-slate-400">Install Manifest V3 Extension to scrape visible Facebook posts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Safety Notice */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 flex items-start space-x-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-200">100% Safe & Compliant Collector</p>
              <p className="mt-0.5 text-emerald-400/90">
                This collector operates in your logged-in Chrome browser session, parsing only publicly rendered post elements as you scroll. It does not bypass logins, CAPTCHAs, or rate limits.
              </p>
            </div>
          </div>

          {/* Installation Steps */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Installation Steps (Chrome / Edge / Brave)</h3>

            <div className="grid gap-3">
              <div className="flex items-start space-x-3.5 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shrink-0">
                  1
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Locate the Extension Folder</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    The Chrome Extension source files are already generated in your project folder at:
                  </p>
                  <code className="mt-2 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-indigo-300 border border-slate-800 font-mono">
                    c:\Dev\fbscrape\extension
                  </code>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shrink-0">
                  2
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Enable Developer Mode in Chrome</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Open Chrome and navigate to <code className="text-slate-200 font-mono">chrome://extensions</code> in your address bar. Turn on the <strong>Developer Mode</strong> toggle in the top-right corner.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shrink-0">
                  3
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Load Unpacked Extension</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Click the <strong>"Load unpacked"</strong> button in the top left, and select the <code className="text-slate-200 font-mono">extension</code> folder from your project.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 rounded-2xl bg-slate-950/60 p-4 border border-slate-800/80">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-600 text-xs font-bold text-white shrink-0">
                  4
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-white">Collect Facebook Posts</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Open any Facebook Page in Chrome (e.g. <code className="text-slate-200 font-mono">facebook.com/acmefitness</code>). Click the PostSnag extension icon or the on-page floating widget to start collecting posts or trigger <strong>Auto-Scroll & Collect</strong>.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-indigo-950/30 p-4 border border-indigo-800/40 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Play className="h-5 w-5 text-indigo-400" />
              <div>
                <p className="text-xs font-semibold text-indigo-200">Local Backend Connection</p>
                <p className="text-[11px] text-slate-400">Target server default: http://localhost:3000</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/30"
            >
              Got It
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
