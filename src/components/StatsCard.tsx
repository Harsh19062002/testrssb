'use client';

import React from 'react';
import { Download, CloudUpload, Zap, FileText, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { CompressedResult } from '@/types';

interface StatsCardProps {
  result: CompressedResult | null;
  onUploadToGoogle: () => void;
  isUploading: boolean;
  appsScriptUrl: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  result,
  onUploadToGoogle,
  isUploading,
  appsScriptUrl,
}) => {
  if (!result) return null;

  const { stats, file, previewUrl, fileType } = result;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-md space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Compression Complete
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono truncate max-w-sm">
            {file.name}
          </p>
        </div>

        {/* Reduction pill */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-extrabold text-sm px-3 py-1 rounded-full flex items-center gap-1">
          <span>🔥 {stats.reductionPercentage}% Smaller</span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/50">
          <p className="text-[11px] text-zinc-400 font-medium">Original Size</p>
          <p className="text-sm font-bold text-zinc-700 dark:text-zinc-200 mt-1 line-through opacity-70">
            {stats.originalSizeFormatted}
          </p>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Compressed Size</p>
          <p className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">
            {stats.compressedSizeFormatted}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/50">
          <p className="text-[11px] text-zinc-400 font-medium">Bytes Saved</p>
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
            {Math.round((stats.originalBytes - stats.compressedBytes) / 1024)} KB
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-800/60 p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-700/50">
          <p className="text-[11px] text-zinc-400 font-medium flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" /> Speed
          </p>
          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mt-1 font-mono">
            {stats.timeTakenMs} ms
          </p>
        </div>
      </div>

      {/* Preview Box */}
      <div className="bg-zinc-100 dark:bg-zinc-950 rounded-xl p-3 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-h-[160px] max-h-[300px] overflow-hidden">
        {fileType === 'photo' ? (
          <img
            src={previewUrl}
            alt="Compressed result preview"
            className="max-h-[260px] object-contain rounded-lg shadow-sm"
          />
        ) : (
          <div className="text-center p-6 space-y-2">
            <FileText className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">PDF Document Compressed</p>
            <p className="text-[11px] text-zinc-400">{file.name} ({stats.compressedSizeFormatted})</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          onClick={handleDownload}
          className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium text-xs px-4 py-3 rounded-xl transition-all"
        >
          <Download className="w-4 h-4" />
          Download Compressed File
        </button>

        <button
          onClick={onUploadToGoogle}
          disabled={isUploading || !appsScriptUrl}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 font-medium text-xs px-5 py-3 rounded-xl text-white shadow-lg transition-all ${appsScriptUrl
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/20'
            : 'bg-zinc-400 cursor-not-allowed opacity-60'
            }`}
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Saving to Drive & Sheets...
            </>
          ) : (
            <>
              <CloudUpload className="w-4 h-4" />
              {appsScriptUrl ? 'Save to Google Drive & Sheet' : 'Set Apps Script URL First'}
            </>
          )}
        </button>
      </div>

    </div>
  );
};
