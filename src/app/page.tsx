"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAccounts } from '@/hooks/useAccounts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { UploadForm } from '@/components/dashboard/UploadForm';
import { SidebarInfo } from '@/components/dashboard/SidebarInfo';
import { performMultiPlatformUpload } from '@/lib/upload-utils';
import { StyleMode } from '@/lib/constants';

export default function Home() {
  const { data: session } = useSession();
  const { accounts, setAccounts } = useAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<StyleMode>('Manual');
  const [videoFormat, setVideoFormat] = useState<'short' | 'long'>('short');

  const [isInitialSync, setIsInitialSync] = React.useState(false);

  // Sync initial selection with distribution-enabled accounts
  useEffect(() => {
    if (accounts.length > 0 && !isInitialSync) {
      setSelectedAccountIds(
        accounts.filter(a => a.isDistributionEnabled).map(a => a.id)
      );
      setIsInitialSync(true);
    }
  }, [accounts, isInitialSync]);

  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;

    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput.files?.[0];
    
    if (!file || file.size === 0) {
      alert('Please select a video file.');
      return;
    }

    // Client-side Aspect Ratio & Duration Validation
    const validateVideoMetadata = async (file: File): Promise<boolean> => {
      // 0. Safety Threshold for Massive Files
      // Browsers often crash (Error 5) trying to parse headers of 2GB+ files.
      if (file.size > 1.5 * 1024 * 1024 * 1024) {
        console.warn('⚠️ Massive file detected (>1.5GB). Skipping client-side analysis to prevent browser crash.');
        setUploadStatus('🚀 Large file detected. Proceeding directly to streaming upload...');
        return true; 
      }

      setUploadStatus('🔍 Analyzing Video Metadata...');
      return new Promise((resolve) => {
        const video = document.createElement('video');
        
        // Critical for large files: only load metadata headers
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const cleanup = () => {
          video.onloadedmetadata = null;
          video.onerror = null;
          if (video.src) {
            window.URL.revokeObjectURL(video.src);
            video.src = '';
          }
          video.remove();
        };

        video.onloadedmetadata = () => {
          const isVertical = video.videoHeight > video.videoWidth;
          const duration = video.duration;
          cleanup();

          // 1. Aspect Ratio Checks
          if (videoFormat === 'short' && !isVertical) {
            alert('❌ Short-form content must be Vertical (9:16). Please change format to "Long-form" or upload a vertical video.');
            resolve(false);
          } else if (videoFormat === 'long' && isVertical) {
            alert('❌ Long-form content should be Landscape (16:9). Please change format to "Short-form" or upload a horizontal video.');
            resolve(false);
          } 
          // 2. Platform-specific Duration Checks (Strict Ultra-long Gating)
          else {
            const selectedPlatforms = accounts
              .filter(a => selectedAccountIds.includes(a.id))
              .map(a => a.provider === 'google' ? 'youtube' : a.provider);

            if (selectedPlatforms.includes('youtube') && videoFormat === 'short' && duration >= 60) {
              alert('❌ YouTube Shorts must be under 60 seconds. Your video is ' + Math.round(duration) + 's. Select "Long-form" to upload as a standard video.');
              resolve(false);
            } else if (selectedPlatforms.includes('facebook') && videoFormat === 'short' && duration > 90) {
              alert('❌ Instagram/Facebook Reels (via API) are limited to 90 seconds. Your video is ' + Math.round(duration) + 's. Select "Long-form" to upload as a standard video.');
              resolve(false);
            } else if (selectedPlatforms.includes('tiktok') && duration > 600) {
              alert('❌ TikTok uploads via API are strictly limited to 10 minutes (600s). For your ' + Math.round(duration/60) + 'm video, please unselect TikTok to proceed with YouTube/Facebook.');
              resolve(false);
            } else if (selectedPlatforms.includes('facebook') && videoFormat === 'long' && duration > 14400) {
              alert('❌ Facebook videos are limited to 4 hours. Your video exceeds this limit.');
              resolve(false);
            } else {
              // YouTube and Facebook (Long-form) can now handle 10GB+ and 2h+
              resolve(true);
            }
          }
        };

        video.onerror = () => {
          console.error('Video validation failed');
          cleanup();
          alert('Failed to load video metadata for validation.');
          resolve(false);
        };

        video.src = URL.createObjectURL(file);
      });
    };

    const isValid = await validateVideoMetadata(file);
    if (!isValid) {
      setUploadStatus(null);
      return;
    }

    setIsUploading(true);
    try {
      // Re-create the formData context for metadata fields
      const formData = new FormData(form);
      
      await performMultiPlatformUpload({
        formData,
        accounts,
        selectedAccountIds,
        contentMode,
        videoFormat,
        onStatusUpdate: setUploadStatus
      });

      setUploadStatus('All uploads completed successfully!');
      form.reset();
      // Reset selection to defaults
      setSelectedAccountIds(accounts.filter(a => a.isDistributionEnabled).map(a => a.id));
      alert('Post completed across selected accounts!');
    } catch (error: any) {
      console.error('Process error:', error);
      setUploadStatus(`Error: ${error.message}`);
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fade-in">
      <DashboardHeader session={session} />
      
      <StatsGrid />

      <div className="responsive-grid">
        <UploadForm 
          isUploading={isUploading}
          uploadStatus={uploadStatus}
          accounts={accounts}
          selectedAccountIds={selectedAccountIds}
          contentMode={contentMode}
          videoFormat={videoFormat}
          onModeChange={setContentMode}
          onFormatChange={setVideoFormat}
          onToggleAccount={handleToggleAccount}
          onSubmit={handleUpload}
        />

        <SidebarInfo accounts={accounts} />
      </div>
    </div>
  );
}
