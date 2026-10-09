'use client';

import React from 'react';
import { Sliders, Gauge, Maximize2, FileType } from 'lucide-react';
import { CompressionOptions } from '@/types';

interface CompressionControlsProps {
  options: CompressionOptions;
  onChange: (options: CompressionOptions) => void;
}

export const CompressionControls: React.FC<CompressionControlsProps> = ({ options, onChange }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Compression Engine Settings</h2>
        </div>
        <span className="text-xs text-purple-600 dark:text-purple-400 font-mono bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md">
          {Math.round(options.quality * 100)}% Quality
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Quality Slider */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-purple-500" /> Image Quality
            </span>
            <span className="font-mono text-purple-600 font-bold">{Math.round(options.quality * 100)}%</span>
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={options.quality}
            onChange={(e) => onChange({ ...options, quality: parseFloat(e.target.value) })}
            className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
          />
        </div>

        {/* Max Resolution Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-blue-500" /> Max Resolution (px)
          </label>
          <select
            value={options.maxWidthOrHeight}
            onChange={(e) => onChange({ ...options, maxWidthOrHeight: parseInt(e.target.value) })}
            className="w-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value={800}>800px (Mobile / Web Fast)</option>
            <option value={1200}>1200px (Standard HD - Recommended)</option>
            <option value={1600}>1600px (High Clarity)</option>
            <option value={2400}>2400px (Ultra Detailed)</option>
          </select>
        </div>

        {/* Image Format Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <FileType className="w-3.5 h-3.5 text-emerald-500" /> Output Format
          </label>
          <select
            value={options.outputFormat}
            onChange={(e) => onChange({ ...options, outputFormat: e.target.value as any })}
            className="w-full text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="image/jpeg">JPEG (Universal Compatibility)</option>
            <option value="image/webp">WebP (Highest Compression Ratio)</option>
            <option value="image/png">PNG (Lossless)</option>
          </select>
        </div>
      </div>
    </div>
  );
};
