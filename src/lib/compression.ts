import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { CompressionOptions, CompressedResult, ProcessingStats } from '@/types';

// Ensure PDF.js worker is configured in browser environments
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${
    pdfjsLib.version || '5.6.205'
  }/build/pdf.worker.min.mjs`;
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Compress an image — visually lossless at screen viewing sizes.
 * Strategy: cap resolution at 2400px (retains sharpness), JPEG quality 0.88
 * This removes metadata & unused data without visible pixelation.
 */
export async function compressPhoto(
  fileInput: File | Blob,
  _options?: CompressionOptions,
  fileName: string = 'captured_photo.jpg'
): Promise<CompressedResult> {
  const startTime = performance.now();
  const originalBytes = fileInput.size;

  const originalFile =
    fileInput instanceof File
      ? fileInput
      : new File([fileInput], fileName, { type: 'image/jpeg' });

  let compressedBlob: Blob;

  try {
    compressedBlob = await imageCompression(originalFile, {
      maxWidthOrHeight: _options?.maxWidthOrHeight || 2400,
      initialQuality: _options?.quality || 0.88,
      maxSizeMB: 4,
      useWebWorker: true,
      fileType: 'image/jpeg',
      exifOrientation: -1,
    });
  } catch (error) {
    console.warn('Falling back to Canvas compression:', error);
    compressedBlob = await canvasCompressFallback(originalFile, _options);
  }

  const endTime = performance.now();
  const compressedBytes = compressedBlob.size;
  const timeTakenMs = Math.round(endTime - startTime);

  const reductionPercentage =
    originalBytes > 0
      ? Math.max(0, Math.round(((originalBytes - compressedBytes) / originalBytes) * 100))
      : 0;

  const stats: ProcessingStats = {
    originalBytes,
    compressedBytes,
    originalSizeFormatted: formatBytes(originalBytes),
    compressedSizeFormatted: formatBytes(compressedBytes),
    reductionPercentage,
    timeTakenMs,
  };

  const cleanName = fileName.replace(/\.[^/.]+$/, '') + '.jpg';
  const compressedFile = new File([compressedBlob], cleanName, { type: 'image/jpeg' });
  const previewUrl = URL.createObjectURL(compressedBlob);
  const base64 = await fileToBase64(compressedBlob);

  return { file: compressedFile, previewUrl, stats, base64, fileType: 'photo' };
}

/**
 * Canvas fallback — high-quality bicubic-style downscale.
 */
function canvasCompressFallback(file: File | Blob, options?: CompressionOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);

      const MAX = options?.maxWidthOrHeight || 2400;
      let { width, height } = img;

      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const mid = document.createElement('canvas');
      mid.width = Math.round(img.width * 0.5);
      mid.height = Math.round(img.height * 0.5);
      const midCtx = mid.getContext('2d')!;
      midCtx.imageSmoothingEnabled = true;
      midCtx.imageSmoothingQuality = 'high';
      midCtx.drawImage(img, 0, 0, mid.width, mid.height);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(mid, 0, 0, width, height);

      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
        'image/jpeg',
        options?.quality || 0.88
      );
    };

    img.onerror = reject;
  });
}

/**
 * High-ratio PDF rasterization compression.
 * Renders pages to canvas, downsamples high-res embedded graphics/scans to optimized JPEG,
 * and reconstructs a high-clarity PDF.
 */
async function rasterCompressPDF(
  arrayBuffer: ArrayBuffer,
  options?: CompressionOptions
): Promise<Uint8Array | null> {
  try {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    if (numPages === 0) return null;

    const newPdfDoc = await PDFDocument.create();
    const maxDimension = options?.maxWidthOrHeight || 1800;
    const jpegQuality = options?.quality || 0.80;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const unscaledViewport = page.getViewport({ scale: 1.0 });

      const maxCurrentDim = Math.max(unscaledViewport.width, unscaledViewport.height);
      const scale = maxCurrentDim > maxDimension
        ? maxDimension / maxCurrentDim
        : Math.min(2.0, Math.max(1.25, 1800 / maxCurrentDim));

      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);

      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      const imgDataUrl = canvas.toDataURL('image/jpeg', jpegQuality);
      const jpegImage = await newPdfDoc.embedJpg(imgDataUrl);

      const pdfPage = newPdfDoc.addPage([unscaledViewport.width, unscaledViewport.height]);
      pdfPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: unscaledViewport.width,
        height: unscaledViewport.height,
      });
    }

    return await newPdfDoc.save({ useObjectStreams: true });
  } catch (error) {
    console.warn('PDF raster compression failed or skipped, using structural optimization:', error);
    return null;
  }
}

/**
 * Compress a PDF:
 * 1. Tries structural optimization (useObjectStreams).
 * 2. If structural reduction is minor (< 15%) and file is > 1MB (image-heavy/scanned PDF),
 *    runs high-ratio page rasterization compression to achieve up to 80-90% reduction.
 */
export async function compressPDF(
  file: File,
  options?: CompressionOptions
): Promise<CompressedResult> {
  const startTime = performance.now();
  const originalBytes = file.size;
  const arrayBuffer = await file.arrayBuffer();

  // Step 1: Structural object stream compression
  let compressedBytes: Uint8Array;
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    compressedBytes = await pdfDoc.save({ useObjectStreams: true });
  } catch {
    compressedBytes = new Uint8Array(arrayBuffer);
  }

  const structuralSize = compressedBytes.byteLength;
  const structuralReduction = ((originalBytes - structuralSize) / originalBytes) * 100;

  // Step 2: If structural reduction is less than 15% and file > 1MB, try raster compression
  if (structuralReduction < 15 && originalBytes > 1000000 && typeof window !== 'undefined') {
    const rasterResult = await rasterCompressPDF(arrayBuffer, options);
    if (rasterResult && rasterResult.byteLength < structuralSize) {
      compressedBytes = rasterResult;
    }
  }

  const compressedBlob = new Blob([compressedBytes.buffer as ArrayBuffer], {
    type: 'application/pdf',
  });

  const endTime = performance.now();
  const compressedSize = compressedBlob.size;
  const timeTakenMs = Math.round(endTime - startTime);

  const reductionPercentage =
    originalBytes > 0
      ? Math.max(0, Math.round(((originalBytes - compressedSize) / originalBytes) * 100))
      : 0;

  const stats: ProcessingStats = {
    originalBytes,
    compressedBytes: compressedSize,
    originalSizeFormatted: formatBytes(originalBytes),
    compressedSizeFormatted: formatBytes(compressedSize),
    reductionPercentage,
    timeTakenMs,
  };

  const cleanName = file.name.replace(/\.[^/.]+$/, '') + '.pdf';
  const compressedFile = new File([compressedBlob], cleanName, { type: 'application/pdf' });
  const previewUrl = URL.createObjectURL(compressedBlob);
  const base64 = await fileToBase64(compressedBlob);

  return { file: compressedFile, previewUrl, stats, base64, fileType: 'pdf' };
}

