'use client';

import React from 'react';
import { History, ExternalLink, CheckCircle, XCircle, Clock, FileText, Image as ImageIcon } from 'lucide-react';
import { UploadHistoryItem } from '@/types';

interface UploadHistoryProps {
  items: UploadHistoryItem[];
  onClearHistory: () => void;
}

export const UploadHistory: React.FC<UploadHistoryProps> = ({ items, onClearHistory }) => {
  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Upload & Sync Log</h2>
        </div>

        <button
          onClick={onClearHistory}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          Clear History
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium">
              <th className="pb-2">Type</th>
              <th className="pb-2">File Name</th>
              <th className="pb-2">Original -&gt; Compressed</th>
              <th className="pb-2">Reduction</th>
              <th className="pb-2">Time</th>
              <th className="pb-2 text-right">Status / Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                <td className="py-3 pr-2">
                  {item.fileType === 'photo' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-300">
                      <ImageIcon className="w-3 h-3" /> Photo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300">
                      <FileText className="w-3 h-3" /> PDF
                    </span>
                  )}
                </td>

                <td className="py-3 pr-2 font-mono text-zinc-800 dark:text-zinc-200 max-w-[160px] truncate">
                  {item.fileName}
                </td>

                <td className="py-3 pr-2 text-zinc-600 dark:text-zinc-400">
                  <span className="line-through text-zinc-400 mr-1">{item.originalSize}</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">{item.compressedSize}</span>
                </td>

                <td className="py-3 pr-2 font-bold text-emerald-600 dark:text-emerald-400">
                  -{item.reductionPercentage}%
                </td>

                <td className="py-3 pr-2 text-zinc-400">
                  {item.timestamp}
                </td>

                <td className="py-3 text-right">
                  {item.status === 'success' && item.driveUrl ? (
                    <a
                      href={item.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      View in Drive <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px]" title={item.errorMessage}>
                      <XCircle className="w-3.5 h-3.5 text-amber-500" />
                      Failed
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
