'use client';

import React, { useState, useRef, useEffect, useCallback, DragEvent } from 'react';
import {
  Image as ImageIcon, FileText, Camera, FolderOpen,
  Settings, CheckCircle2, X, Copy, Check, HelpCircle,
  FileCode, Key, Loader2, ExternalLink, CloudUpload, UploadCloud,
  User, AlertCircle,
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { compressPhoto, compressPDF } from '@/lib/compression';
import { sendToGoogleAppsScript, DEFAULT_APPS_SCRIPT_CODE, DEFAULT_WEB_APP_URL } from '@/lib/googleAppsScript';
import { CompressionOptions, CompressedResult, UploadHistoryItem } from '@/types';

/**
 * Embed a JPEG/PNG blob into a single-page PDF so the PDF card
 * can also accept webcam snapshots.
 */
async function imageBlobToPDF(blob: Blob, name: string): Promise<File> {
  const arrayBuffer = await blob.arrayBuffer();
  const pdfDoc = await PDFDocument.create();
  const isJpeg = blob.type === 'image/jpeg' || name.toLowerCase().endsWith('.jpg');
  const embeddedImage = isJpeg
    ? await pdfDoc.embedJpg(arrayBuffer)
    : await pdfDoc.embedPng(arrayBuffer);
  const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
  page.drawImage(embeddedImage, { x: 0, y: 0, width: embeddedImage.width, height: embeddedImage.height });
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  const pdfName = name.replace(/\.[^/.]+$/, '') + '.pdf';
  return new File([bytes.buffer as ArrayBuffer], pdfName, { type: 'application/pdf' });
}

const DEFAULT_OPTIONS: CompressionOptions = {
  quality: 0.88,
  maxWidthOrHeight: 2400,
  outputFormat: 'image/jpeg',
};

// ─── Webcam Modal ─────────────────────────────────────────────────────────────
function WebcamModal({ onCapture, onClose }: {
  onCapture: (blob: Blob, name: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const startStream = useCallback(async (deviceId?: string) => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setReady(false);
    setError('');
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = ms;
      if (videoRef.current) { videoRef.current.srcObject = ms; }
      setReady(true);
      const all = await navigator.mediaDevices.enumerateDevices();
      const cams = all.filter(d => d.kind === 'videoinput');
      setDevices(cams);
      if (!deviceId && cams[0]) setSelectedId(cams[0].deviceId);
    } catch (e: any) {
      setError(e.name === 'NotAllowedError' ? 'Camera permission denied.' : 'Cannot access camera device.');
    }
  }, []);

  useEffect(() => {
    startStream();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const handleDeviceChange = (id: string) => { setSelectedId(id); startStream(id); };

  const snap = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      if (!blob) return;
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      streamRef.current?.getTracks().forEach(t => t.stop());
      onCapture(blob, `photo_${ts}.jpg`);
    }, 'image/jpeg', 0.97);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Camera className="w-4 h-4 text-blue-400" /> Camera
            {devices.length > 1 && (
              <select
                value={selectedId}
                onChange={e => handleDeviceChange(e.target.value)}
                className="ml-2 text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg px-2 py-1 focus:outline-none"
              >
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
                ))}
              </select>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative aspect-video bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400 text-sm">
              <Camera className="w-8 h-8 opacity-30" /><p>{error}</p>
            </div>
          )}
          {ready && (
            <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" /> LIVE
            </div>
          )}
        </div>

        <div className="px-5 py-4 flex justify-end">
          <button
            onClick={snap}
            disabled={!ready}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold text-sm px-6 py-2.5 rounded-xl transition-colors"
          >
            <Camera className="w-4 h-4" /> Capture Photo
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Setup Modal ──────────────────────────────────────────────────────────────
function SetupModal({ isOpen, onClose, url, onSave }: {
  isOpen: boolean; onClose: () => void; url: string; onSave: (u: string) => void;
}) {
  const [input, setInput] = useState(url);
  const [tab, setTab] = useState<'url' | 'script'>('url');
  const [copied, setCopied] = useState(false);
  useEffect(() => setInput(url), [url]);
  if (!isOpen) return null;
  const copy = () => { navigator.clipboard.writeText(DEFAULT_APPS_SCRIPT_CODE); setCopied(true); setTimeout(() => setCopied(false), 2500); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl"><Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /></div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Google Apps Script Setup</h3>
              <p className="text-xs text-zinc-500">Connect Google Drive & Sheets</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-5">
          {(['url', 'script'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-2.5 px-4 text-xs font-semibold border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'}`}>
              {t === 'url' ? '1. Enter Web App URL' : '2. Get Apps Script Code'}
            </button>
          ))}
        </div>
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {tab === 'url' ? (
            <>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">Web App Deployment URL</label>
                <input type="url" placeholder="https://script.google.com/macros/s/.../exec" value={input} onChange={e => setInput(e.target.value)}
                  className="w-full text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 text-xs space-y-2">
                <h4 className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5"><HelpCircle className="w-4 h-4" /> Setup (2 mins)</h4>
                <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
                  <li>Open <a href="https://sheets.new" target="_blank" rel="noreferrer" className="underline font-semibold">Google Sheets</a> → <strong>Extensions → Apps Script</strong></li>
                  <li>Copy the script from the tab above and paste it</li>
                  <li><strong>Deploy → New deployment → Web App</strong></li>
                  <li>Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong></li>
                  <li>Paste the Web App URL here</li>
                </ol>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={onClose} className="text-xs font-medium px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800">Cancel</button>
                <button onClick={() => { onSave(input.trim()); onClose(); }} className="text-xs font-medium px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">Save URL</button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"><FileCode className="w-4 h-4 text-blue-500" /> Apps Script Code</span>
                <button onClick={copy} className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg">
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}{copied ? 'Copied!' : 'Copy Code'}
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-zinc-950 text-zinc-200 p-4 rounded-xl overflow-x-auto max-h-[340px] border border-zinc-800 leading-relaxed">{DEFAULT_APPS_SCRIPT_CODE}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Drop Zone Card ───────────────────────────────────────────────────────────
type CardStatus = 'idle' | 'processing' | 'uploading' | 'done' | 'error';

function DropCard({ type, appsScriptUrl, uploaderName, onValidateName, onResult }: {
  type: 'image' | 'pdf';
  appsScriptUrl: string;
  uploaderName: string;
  onValidateName: () => boolean;
  onResult: (item: UploadHistoryItem) => void;
}) {
  const isImage = type === 'image';
  const [status, setStatus] = useState<CardStatus>('idle');
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);

  const accept = isImage ? 'image/jpeg,image/png,image/webp' : 'application/pdf';

  const triggerCamera = () => {
    if (!onValidateName()) return;
    setShowWebcam(true);
  };

  const triggerBrowse = () => {
    if (!onValidateName()) return;
    fileRef.current?.click();
  };

  // When the PDF card captures a webcam photo, convert it to a PDF first
  const handleCameraCapture = async (blob: Blob, name: string) => {
    setShowWebcam(false);
    if (!isImage) {
      setStatus('processing');
      setDriveUrl(null);
      try {
        const pdfFile = await imageBlobToPDF(blob, name);
        await process(pdfFile, pdfFile.name);
      } catch {
        setStatus('error');
      }
    } else {
      process(blob, name);
    }
  };

  const process = async (file: File | Blob, name: string) => {
    if (!onValidateName()) return;

    setStatus('processing');
    setDriveUrl(null);
    try {
      let result: CompressedResult;
      result = isImage
        ? await compressPhoto(file, DEFAULT_OPTIONS, name)
        : await compressPDF(file as File, DEFAULT_OPTIONS);

      if (appsScriptUrl) {
        setStatus('uploading');
        const item = await sendToGoogleAppsScript(appsScriptUrl, result, uploaderName);
        setDriveUrl(item.driveUrl || null);
        onResult(item);
      } else {
        const item: UploadHistoryItem = {
          id: 'local_' + Date.now(),
          uploaderName: uploaderName.trim() || 'Anonymous',
          fileName: result.file.name,
          fileType: result.fileType,
          originalSize: result.stats.originalSizeFormatted,
          compressedSize: result.stats.compressedSizeFormatted,
          reductionPercentage: result.stats.reductionPercentage,
          timestamp: new Date().toLocaleTimeString(),
          status: 'success',
        };
        onResult(item);
      }
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!onValidateName()) return;
    process(files[0], files[0].name);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!onValidateName()) return;
    handleFiles(e.dataTransfer.files);
  };

  const reset = () => { setStatus('idle'); setDriveUrl(null); };

  const busy = status === 'processing' || status === 'uploading';

  return (
    <>
      {showWebcam && (
        <WebcamModal
          onCapture={handleCameraCapture}
          onClose={() => setShowWebcam(false)}
        />
      )}
      <input type="file" ref={fileRef} className="hidden" accept={accept}
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      <input type="file" ref={mobileRef} className="hidden" accept="image/*" capture="environment"
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />

      <div className={`group relative flex flex-col bg-[#FFFDF9] rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-sm ${dragging
        ? 'border-amber-500 shadow-md shadow-amber-500/10 scale-[1.01]'
        : status === 'done'
          ? 'border-emerald-500/60'
          : status === 'error'
            ? 'border-red-500/60'
            : 'border-dashed border-[#E5DDD0] hover:border-amber-400'
        }`}>

        {/* Drop Zone Area */}
        <div
          className={`flex-1 flex flex-col items-center justify-center gap-4 px-8 py-10 cursor-pointer select-none transition-colors ${busy ? 'pointer-events-none opacity-60' : ''} ${dragging ? 'bg-amber-50/60' : 'bg-[#FFFDF9] hover:bg-[#F8F4EC]'}`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => { if (status === 'idle' && !busy) triggerBrowse(); }}
        >
          {/* Icon */}
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${dragging
            ? 'bg-amber-100 scale-110'
            : isImage
              ? 'bg-amber-50/80 border border-amber-100'
              : 'bg-red-50 border border-red-100'
            }`}>
            {busy ? (
              <Loader2 className="w-7 h-7 text-amber-600 animate-spin" />
            ) : status === 'done' ? (
              <CheckCircle2 className={`w-7 h-7 ${isImage ? 'text-amber-600' : 'text-red-600'}`} />
            ) : (
              isImage
                ? <ImageIcon className="w-7 h-7 text-amber-600" />
                : <FileText className="w-7 h-7 text-red-600" />
            )}
          </div>

          {/* Label */}
          <div className="text-center space-y-1">
            <p className="font-bold text-stone-900 text-base">
              {isImage ? 'Image Upload' : 'PDF Upload'}
            </p>

            {status === 'idle' && (
              <>
                <p className="text-sm text-stone-500">Drag & drop or click to browse</p>
                <p className="text-xs text-stone-400">
                  {isImage ? 'JPG · PNG · WEBP' : 'PDF documents'}
                </p>
              </>
            )}

            {status === 'processing' && (
              <p className="text-sm text-amber-700 font-semibold">Compressing…</p>
            )}
            {status === 'uploading' && (
              <p className="text-sm text-amber-700 font-semibold">Uploading…</p>
            )}

            {status === 'done' && (
              <div className="space-y-2">
                <p className="text-sm font-bold text-emerald-700">
                  ✓ Upload Complete
                </p>
                <div>
                  <button onClick={e => { e.stopPropagation(); reset(); }}
                    className="text-xs text-stone-500 hover:text-stone-700 font-medium underline">
                    Upload another
                  </button>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-1">
                <p className="text-sm text-red-600 font-semibold">Something went wrong</p>
                <button onClick={e => { e.stopPropagation(); reset(); }}
                  className="text-xs text-stone-400 hover:text-stone-600 underline">Try again</button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Bar — Camera + Browse (both card types) */}
        {status === 'idle' && (
          <div className="border-t border-[#EFEAE1] bg-[#F7F3EA] grid grid-cols-2">
            <button
              onClick={triggerCamera}
              className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-stone-700 hover:bg-[#EFE9DD] transition-colors border-r border-[#EFEAE1]"
            >
              <Camera className="w-4 h-4 text-amber-700" /> Use Camera
            </button>
            <button
              onClick={triggerBrowse}
              className="flex items-center justify-center gap-2 py-3 text-xs font-semibold text-stone-700 hover:bg-[#EFE9DD] transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-stone-500" /> Browse Files
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [appsScriptUrl, setAppsScriptUrl] = useState(DEFAULT_WEB_APP_URL);
  const [uploaderName, setUploaderName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUrl = localStorage.getItem('apps_script_url');
    if (savedUrl) setAppsScriptUrl(savedUrl);
    const savedName = localStorage.getItem('uploader_name');
    if (savedName) setUploaderName(savedName);
    try { setHistory(JSON.parse(localStorage.getItem('upload_history') || '[]')); } catch { }
  }, []);

  const handleNameChange = (val: string) => {
    setUploaderName(val);
    if (val.trim()) setNameError(false);
    localStorage.setItem('uploader_name', val);
  };

  const validateName = () => {
    if (!uploaderName.trim()) {
      setNameError(true);
      nameInputRef.current?.focus();
      return false;
    }
    setNameError(false);
    return true;
  };

  const handleSaveUrl = (url: string) => {
    setAppsScriptUrl(url);
    localStorage.setItem('apps_script_url', url);
  };

  const handleResult = (item: UploadHistoryItem) => {
    setHistory(prev => {
      const updated = [item, ...prev].slice(0, 50);
      localStorage.setItem('upload_history', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 flex flex-col">
      {/* Body (Header Navbar Removed) */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3.5 bg-[#F3ECE0] text-amber-800 rounded-2xl mb-1 shadow-sm border border-[#E9DFC7]">
            <UploadCloud className="w-8 h-8 text-amber-700" />
          </div>
          <h1 className="text-3xl font-black text-stone-900 tracking-tight">
            SnapCompress
          </h1>

        </div>

        {/* Required User Name Field */}
        <div className={`p-4.5 rounded-2xl border transition-all ${nameError
          ? 'bg-red-50 border-red-400 shadow-md shadow-red-500/10'
          : 'bg-[#FFFDF9] border-[#EFEAE1] shadow-sm'
          }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <label htmlFor="uploaderNameInput" className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-700" /> Your Name <span className="text-red-500 font-bold">*</span>
              </label>
              <p className="text-[11px] text-stone-500">
                Required before uploading
              </p>
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <input
                id="uploaderNameInput"
                ref={nameInputRef}
                type="text"
                placeholder="Enter your full name..."
                value={uploaderName}
                onChange={e => handleNameChange(e.target.value)}
                className={`w-full text-xs font-medium bg-[#F7F3EA] text-stone-900 border rounded-xl px-3.5 py-2.5 focus:outline-none transition-all ${nameError
                  ? 'border-red-500 focus:ring-2 focus:ring-red-500 bg-red-50/50'
                  : 'border-[#E2DBD0] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                  }`}
              />
              {nameError && (
                <span className="absolute -bottom-5 left-0 text-[10px] font-semibold text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Please enter your name first
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <DropCard
            type="image"
            appsScriptUrl={appsScriptUrl}
            uploaderName={uploaderName}
            onValidateName={validateName}
            onResult={handleResult}
          />
          <DropCard
            type="pdf"
            appsScriptUrl={appsScriptUrl}
            uploaderName={uploaderName}
            onValidateName={validateName}
            onResult={handleResult}
          />
        </div>

        {/* Subtle history */}
        {history.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Recent Activity</span>
              <button onClick={() => { setHistory([]); localStorage.removeItem('upload_history'); }}
                className="text-xs text-stone-400 hover:text-stone-600 font-medium">
                Clear
              </button>
            </div>
            <div className="space-y-2">
              {history.slice(0, 6).map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-[#FFFDF9] border border-[#EFEAE1] rounded-xl px-4 py-3 text-xs shadow-sm">
                  {item.fileType === 'photo'
                    ? <ImageIcon className="w-4 h-4 text-amber-700 shrink-0" />
                    : <FileText className="w-4 h-4 text-red-600 shrink-0" />}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="font-medium text-stone-800 truncate">{item.fileName}</span>
                    {item.uploaderName && (
                      <span className="text-[10px] bg-[#F5ECE0] text-amber-900 border border-[#E7DBCA] px-2 py-0.5 rounded-full font-semibold shrink-0">
                        By: {item.uploaderName}
                      </span>
                    )}
                  </div>
                  <span className="text-stone-400 shrink-0 text-[11px]">{item.timestamp}</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <SetupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} url={appsScriptUrl} onSave={handleSaveUrl} />
    </div>
  );
}
