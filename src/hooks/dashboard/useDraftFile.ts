import { useState, useEffect, useRef } from 'react';
import { storeDraftFile, getDraftFile } from '@/lib/upload/file-store';
import { updateVideoFormatPreference } from '@/app/actions/user';

export function useDraftFile(userId?: string) {
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const [videoFormat, setVideoFormat] = useState<'short' | 'long'>('short');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const draftFileRef = useRef<File | null>(null);

  useEffect(() => {
    getDraftFile().then(file => {
      if (file) {
        draftFileRef.current = file;
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
    draftFileRef.current = file;
    setDraftFileName(file?.name || null);
    
    if (file) {
      await storeDraftFile(file);
      const { format, duration } = await detectVideoMetadata(file);
      setVideoFormat(format);
      setVideoDuration(duration);
      updateVideoFormatPreference(format).catch(err => console.error(err));
    } else {
      setVideoDuration(null);
    }
  };

  return {
    draftFileRef,
    draftFileName,
    videoFormat,
    setVideoFormat,
    videoDuration,
    handleFileChange
  };
}
