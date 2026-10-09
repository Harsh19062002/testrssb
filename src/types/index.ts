export type MediaInputMode = 'camera' | 'file';
export type ActiveTab = 'photo' | 'pdf';

export interface CompressionOptions {
  quality: number; // 0.1 to 1.0 (e.g., 0.7 = 70%)
  maxWidthOrHeight: number; // e.g., 1200
  outputFormat: 'image/jpeg' | 'image/webp' | 'image/png';
  preservePdfMetadata?: boolean;
}

export interface ProcessingStats {
  originalBytes: number;
  compressedBytes: number;
  originalSizeFormatted: string;
  compressedSizeFormatted: string;
  reductionPercentage: number;
  timeTakenMs: number;
}

export interface CompressedResult {
  file: File;
  previewUrl: string;
  stats: ProcessingStats;
  base64: string;
  fileType: 'photo' | 'pdf';
}

export interface UploadHistoryItem {
  id: string;
  uploaderName?: string;
  fileName: string;
  fileType: 'photo' | 'pdf';
  originalSize: string;
  compressedSize: string;
  reductionPercentage: number;
  timestamp: string;
  status: 'pending' | 'success' | 'error';
  driveUrl?: string;
  errorMessage?: string;
}

export interface AppsScriptConfig {
  webAppUrl: string;
  folderName: string;
  sheetName: string;
}
