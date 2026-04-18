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
    const formData = new FormData(form);
    const file = formData.get('file') as File;
    
    if (!file || file.size === 0) {
      alert('Please select a video file.');
      return;
    }

    // Client-side Aspect Ratio Validation
    const validateAspectRatio = async (): Promise<boolean> => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          const isVertical = video.videoHeight > video.videoWidth;
          const duration = video.duration;

          // 1. Aspect Ratio Checks
          if (videoFormat === 'short' && !isVertical) {
            alert('❌ Short-form content must be Vertical (9:16). Please change format to "Long-form" or upload a vertical video.');
            resolve(false);
            return;
          } else if (videoFormat === 'long' && isVertical) {
            alert('❌ Long-form content should be Landscape (16:9). Please change format to "Short-form" or upload a horizontal video.');
            resolve(false);
            return;
          }

          // 2. Platform-specific Duration Checks
          const selectedPlatforms = accounts
            .filter(a => selectedAccountIds.includes(a.id))
            .map(a => a.provider === 'google' ? 'youtube' : a.provider);

          if (selectedPlatforms.includes('youtube') && videoFormat === 'short' && duration >= 60) {
            alert('❌ YouTube Shorts must be under 60 seconds. Your video is ' + Math.round(duration) + 's.');
            resolve(false);
            return;
          }

          if (selectedPlatforms.includes('facebook') && videoFormat === 'short' && duration > 90) {
            alert('❌ Instagram/Facebook Reels (via API) are limited to 90 seconds. Your video is ' + Math.round(duration) + 's.');
            resolve(false);
            return;
          }

          if (selectedPlatforms.includes('tiktok') && duration > 600) {
            alert('❌ TikTok uploads via API are limited to 10 minutes (600s). Your video is ' + Math.round(duration) + 's.');
            resolve(false);
            return;
          }

          resolve(true);
        };
        video.onerror = () => {
          alert('Failed to load video metadata for validation.');
          resolve(false);
        };
        video.src = URL.createObjectURL(file);
      });
    };

    const isValid = await validateAspectRatio();
    if (!isValid) return;

    setIsUploading(true);
    try {
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
