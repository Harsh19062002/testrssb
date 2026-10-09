'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon, Camera } from 'lucide-react';
import { ActiveTab } from '@/types';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isProcessing: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelect,
  activeTab,
  onTabChange,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Tab Switcher: Photo vs PDF */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Upload File from Device</h2>
        </div>

        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => onTabChange('photo')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'photo'
                ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Photo
          </button>

          <button
            onClick={() => onTabChange('pdf')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'pdf'
                ? 'bg-white dark:bg-zinc-700 text-red-600 dark:text-red-400 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            PDF File
          </button>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[0.99]'
            : 'border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 bg-zinc-50/50 dark:bg-zinc-800/30'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept={activeTab === 'photo' ? 'image/jpeg,image/png,image/webp' : 'application/pdf'}
          className="hidden"
        />

        {/* Mobile native camera trigger input */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm text-zinc-600 dark:text-zinc-300">
            {activeTab === 'photo' ? <ImageIcon className="w-8 h-8 text-blue-500" /> : <FileText className="w-8 h-8 text-red-500" />}
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">
              Click to browse or drag & drop {activeTab === 'photo' ? 'Photo' : 'PDF Document'}
            </p>
            <p className="text-[11px] text-zinc-400 mt-1">
              {activeTab === 'photo' ? 'Supports JPG, PNG, WEBP files' : 'Supports standard PDF files'}
            </p>
          </div>
        </div>
      </div>

      {/* Mobile Camera Direct Button */}
      {activeTab === 'photo' && (
        <div className="pt-1 text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              cameraInputRef.current?.click();
            }}
            disabled={isProcessing}
            className="inline-flex items-center gap-2 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-3.5 py-2 rounded-xl transition-colors"
          >
            <Camera className="w-4 h-4 text-blue-500" />
            Direct Mobile Camera Snap
          </button>
        </div>
      )}
    </div>
  );
};
