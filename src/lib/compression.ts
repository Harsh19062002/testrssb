import imageCompression from 'browser-image-compression';
import { PDFDocument } from 'pdf-lib';
import { CompressionOptions, CompressedResult, ProcessingStats } from '@/types';

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
 * Strategy: cap resolution at 2400px (retains sharpness), JPEG quality 0.82
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
      initialQuality: _options?.quality || 0.82,
      maxSizeMB: 4,
      useWebWorker: true,
      fileType: 'image/webp',   // WebP gives ~25-35% better compression than JPEG at same quality
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

  const cleanName = fileName.replace(/\.[^/.]+$/, '') + '.webp';
  const compressedFile = new File([compressedBlob], cleanName, { type: 'image/webp' });
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
        'image/webp',
        options?.quality || 0.82
      );
    };

    img.onerror = reject;
  });
}

/**
 * Render a single PDF page to a JPEG blob.
 * Extracted so all pages can be processed in parallel.
 */
async function renderPageToJpeg(
  page: any,
  maxDimension: number,
  jpegQuality: number
): Promise<{ jpeg: string; width: number; height: number } | null> {
  const unscaledViewport = page.getViewport({ scale: 1.0 });

  // Scale down large pages; scale up tiny ones to at least 1200px wide for clarity
  const maxCurrentDim = Math.max(unscaledViewport.width, unscaledViewport.height);
  const scale =
    maxCurrentDim > maxDimension
      ? maxDimension / maxCurrentDim
      : Math.min(1.5, Math.max(1.0, 1200 / maxCurrentDim));

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

  return {
    jpeg: canvas.toDataURL('image/jpeg', jpegQuality),
    width: unscaledViewport.width,
    height: unscaledViewport.height,
  };
}

/**
 * High-ratio PDF rasterization compression.
 * Renders ALL pages in parallel, downsamples embedded graphics/scans to
 * optimized JPEG, and reconstructs a high-clarity PDF.
 * Dynamically loaded in the browser to prevent Next.js SSR DOMMatrix errors.
 */
async function rasterCompressPDF(
  arrayBuffer: ArrayBuffer,
  options?: CompressionOptions
): Promise<Uint8Array | null> {
  if (typeof window === 'undefined') return null;

  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (pdfjsLib.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${
        pdfjsLib.version || '5.6.205'
      }/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    if (numPages === 0) return null;

    const maxDimension = options?.maxWidthOrHeight || 1600;
    // Lower quality = smaller file; 0.72 gives ~40-60% reduction on typical PDFs
    const jpegQuality = options?.quality || 0.72;

    // Load all pages first (sequential — pdfjs page access is not concurrent-safe)
    const pages: any[] = [];
    for (let i = 1; i <= numPages; i++) {
      pages.push(await pdf.getPage(i));
    }

    // Render ALL pages in parallel — this is the key latency fix
    const rendered = await Promise.all(
      pages.map((page) => renderPageToJpeg(page, maxDimension, jpegQuality))
    );

    const newPdfDoc = await PDFDocument.create();

    for (const r of rendered) {
      if (!r) continue;
      const jpegImage = await newPdfDoc.embedJpg(r.jpeg);
      const pdfPage = newPdfDoc.addPage([r.width, r.height]);
      pdfPage.drawImage(jpegImage, {
        x: 0,
        y: 0,
        width: r.width,
        height: r.height,
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
 * 2. If structural reduction is minor (<15%) and file is >100KB (almost all PDFs),
 *    runs high-ratio page rasterization compression to achieve up to 60-80% reduction.
 *    Previously this threshold was 1MB which caused 0% reduction on smaller PDFs.
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

  // Step 2: If structural reduction is less than 15%, try raster compression.
  // Threshold lowered from 1MB → 100KB so smaller PDFs also get compressed.
  if (structuralReduction < 15 && originalBytes > 100_000 && typeof window !== 'undefined') {
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
