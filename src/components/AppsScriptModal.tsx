'use     client';

import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, HelpCircle, Key, FileCode } from 'lucide-react';
import { DEFAULT_APPS_SCRIPT_CODE } from '@/lib/googleAppsScript';
interface AppsScriptModalProps {

  isOpen: boolean;
  onClose: () => void;
  webAppUrl: string;
  onSaveUrl: (url: string) => void;
}

export const AppsScriptModal: React.FC<AppsScriptModalProps> = ({
  isOpen,
  onClose,
  webAppUrl,
  onSaveUrl,
}) => {
  const [inputUrl, setInputUrl] = useState(webAppUrl);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'url' | 'script'>('url');

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(DEFAULT_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveUrl(inputUrl.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Google Apps Script Configuration</h3>
              <p className="text-xs text-zinc-500">Connect Google Drive & Sheets for automatic file storage</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Nav Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-5 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('url')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'url'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
          >
            1. Enter Web App URL
          </button>
          <button
            onClick={() => setActiveTab('script')}
            className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${activeTab === 'script'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
          >
            2. Get Google Apps Script Code
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'url' ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                  Google Apps Script Web App Deployment URL
                </label>
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="w-full text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  Paste the deployment URL from your Google Apps Script project. Files will automatically be stored in your Google Drive and appended to your Google Sheet!
                </p>
              </div>

              {/* Step-by-step setup guide */}
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 space-y-2 text-xs">
                <h4 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-blue-600" /> Quick Setup Instructions (2 mins):
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                  <li>Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="underline font-semibold">Google Sheets</a> and click <strong>Extensions -&gt; Apps Script</strong>.</li>
                  <li>Click the <strong>"Get Google Apps Script Code"</strong> tab above and copy the script.</li>
                  <li>Paste the script into Apps Script and click <strong>Deploy -&gt; New deployment</strong>.</li>
                  <li>Choose type: <strong>Web App</strong>, Execute as: <strong>Me</strong>, Who has access: <strong>Anyone</strong>.</li>
                  <li>Click <strong>Deploy</strong> and paste the resulting Web App URL here!</li>
                </ol>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-medium px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs font-medium px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  Save Web App URL
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-blue-500" /> Apps Script Backend Code
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied Code!' : 'Copy Script Code'}
                </button>
              </div>

              <pre className="text-[11px] font-mono bg-zinc-950 text-zinc-200 p-4 rounded-xl overflow-x-auto max-h-[340px] border border-zinc-800 leading-relaxed">
                {DEFAULT_APPS_SCRIPT_CODE}
              </pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
