'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, VideoOff, FlipHorizontal, Sparkles } from 'lucide-react';
import { CompressionOptions } from '@/types';

interface CameraCaptureProps {
  onCapture: (blob: Blob, name: string) => void;
  options: CompressionOptions;
  isProcessing: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, options, isProcessing }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Enumerate video devices (External Webcams + Built-in Cameras)
  const loadDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoInputs);

      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate camera devices:', err);
    }
  };

  // Start webcam stream
  const startStream = async () => {
    setCameraError(null);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      setCameraActive(true);
      // Re-enumerate to capture labels after permission granted
      loadDevices();
    } catch (err: any) {
      console.error('Camera stream initialization error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : 'Unable to access selected camera. Please verify device connection.'
      );
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (cameraActive) {
      startStream();
    } else if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId, facingMode, cameraActive]);

  // Take photo snapshot
  const takeSnapshot = () => {
    if (!videoRef.current || !stream) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          onCapture(blob, `webcam_photo_${timestamp}.jpg`);
        }
      },
      options.outputFormat,
      0.95
    );
  };

  const toggleCameraMode = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Top Header & Device Picker */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Real-time Camera Stream</h2>
        </div>

        {/* External Camera Dropdown Selector */}
        {devices.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1} (${device.deviceId.slice(0, 5)}...)`}
                </option>
              ))}
            </select>

            <button
              onClick={toggleCameraMode}
              className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-xs"
              title="Flip Facing Mode"
            >
              <FlipHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Video Stream Viewport */}
      <div className="relative aspect-video bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center border border-zinc-800">
        {cameraActive && !cameraError ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 space-y-3">
            <VideoOff className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 max-w-xs">{cameraError || 'Camera is turned off'}</p>
            <button
              onClick={() => setCameraActive(true)}
              className="inline-flex items-center gap-2 text-xs bg-blue-600 text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Enable Camera
            </button>
          </div>
        )}

        {/* Live Indicator overlay */}
        {cameraActive && !cameraError && (
          <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 shadow">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
            LIVE WEBCAM
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={() => setCameraActive((prev) => !prev)}
          className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          {cameraActive ? 'Turn Off Stream' : 'Turn On Stream'}
        </button>

        <button
          onClick={takeSnapshot}
          disabled={!cameraActive || !!cameraError || isProcessing}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Compressing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Take Photo & Compress
            </>
          )}
        </button>
      </div>
    </div>
  );
};
