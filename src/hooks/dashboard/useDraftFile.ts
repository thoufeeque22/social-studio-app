import { useState, useEffect, useRef } from 'react';
import { storeDraftFile, getDraftFile } from '@/lib/upload/file-store';
import { updateVideoFormatPreference } from '@/app/actions/user';
import { rotateVideo, terminateVideoRotation } from '@/lib/utils/ffmpeg-utils';

export function useDraftFile(userId?: string) {
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const [videoFormat, setVideoFormat] = useState<'short' | 'long'>('short');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const draftFileRef = useRef<File | null>(null);

  useEffect(() => {
    getDraftFile().then(file => {
      if (file) {
        draftFileRef.current = file;
        setDraftFile(file);
        setDraftFileName(file.name);
      }
    });
  }, [userId]);

  const detectVideoMetadata = (file: File): Promise<{ format: 'short' | 'long', duration: number }> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      
      const cleanup = () => {
        video.onloadedmetadata = null;
        video.onerror = null;
        if (video.src) {
          globalThis.URL.revokeObjectURL(video.src);
          video.src = '';
        }
        video.remove();
      };

      video.onloadedmetadata = () => {
        const isVertical = video.videoHeight > video.videoWidth;
        const duration = video.duration;
        cleanup();
        const format = (isVertical && duration <= 90) ? 'short' : 'long';
        resolve({ format, duration });
      };

      video.onerror = () => {
        resolve({ format: 'long', duration: 0 });
        cleanup();
      };

      video.src = globalThis.URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (file: File | null) => {
    if (!file) {
      draftFileRef.current = null;
      setDraftFile(null);
      setDraftFileName(null);
      setVideoDuration(null);
      return;
    }
    draftFileRef.current = file;
    setDraftFile(file);
    setDraftFileName(file.name);
    await storeDraftFile(file);
    
    const { format, duration } = await detectVideoMetadata(file);
    setVideoFormat(format);
    setVideoDuration(duration);
    
    updateVideoFormatPreference(format).catch(err => console.error(err));
  };

  const handleRotate = async () => {
    if (!draftFileRef.current) return;
    
    setIsProcessing(true);
    try {
      const rotatedFile = await rotateVideo(draftFileRef.current);
      if (rotatedFile) {
        await handleFileChange(rotatedFile);
      }
    } catch (error: any) {
      console.error("Video rotation failed:", error);
      // Only alert if it wasn't a manual termination (which now returns null)
      alert("Failed to rotate video. Your browser might not support the required features.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelRotate = async () => {
    await terminateVideoRotation();
    setIsProcessing(false);
  };

  return {
    draftFile,
    draftFileRef,
    draftFileName,
    videoFormat,
    setVideoFormat,
    videoDuration,
    isProcessing,
    handleFileChange,
    handleRotate,
    handleCancelRotate
  };
}
