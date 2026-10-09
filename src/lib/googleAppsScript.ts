import { UploadHistoryItem, CompressedResult } from '@/types';
import GAS_TEMPLATE from './gasTemplate';

// Default Apps Script Web App URL — used automatically if no override is saved
export const DEFAULT_WEB_APP_URL =
  'https://script.google.com/macros/s/AKfycbyy7sGpO-dIImiEKUtTIDdZdlsJ27ECdTBSXvmW62B6AiLZAW9aDy_2-VOw9LUuG0b2/exec';
export const DEFAULT_APPS_SCRIPT_CODE: string = GAS_TEMPLATE;

export async function sendToGoogleAppsScript(
  webAppUrl: string,
  result: CompressedResult
): Promise<UploadHistoryItem> {
  const historyId = 'upload_' + Date.now();
  const timestamp = new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const payload = {
    fileName: result.file.name,
    fileType: result.fileType,
    base64Data: result.base64,
    originalSize: result.stats.originalSizeFormatted,
    compressedSize: result.stats.compressedSizeFormatted,
    reductionPercentage: result.stats.reductionPercentage,
    timeTakenMs: result.stats.timeTakenMs,
  };

  try {
    const response = await fetch(webAppUrl, {
      method: 'POST',
      // text/plain avoids the CORS preflight that Google Apps Script rejects
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (data.status === 'success' || data.driveUrl) {
      return {
        id: historyId,
        fileName: result.file.name,
        fileType: result.fileType,
        originalSize: result.stats.originalSizeFormatted,
        compressedSize: result.stats.compressedSizeFormatted,
        reductionPercentage: result.stats.reductionPercentage,
        timestamp,
        status: 'success',
        driveUrl: data.driveUrl,
      };
    } else {
      throw new Error(data.message || 'Apps Script returned an error status');
    }
  } catch (error: any) {
    console.error('Google Apps Script upload error:', error);
    return {
      id: historyId,
      fileName: result.file.name,
      fileType: result.fileType,
      originalSize: result.stats.originalSizeFormatted,
      compressedSize: result.stats.compressedSizeFormatted,
      reductionPercentage: result.stats.reductionPercentage,
      timestamp,
      status: 'error',
      errorMessage: error.message || 'Upload failed — verify your Web App URL.',
    };
  }
}
