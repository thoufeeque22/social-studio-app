"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useAccounts } from '@/hooks/useAccounts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { UploadForm } from '@/components/dashboard/UploadForm';
import { SidebarInfo } from '@/components/dashboard/SidebarInfo';
import { performMultiPlatformUpload } from '@/lib/upload-utils';
import { StyleMode } from '@/lib/constants';
import { storeDraftFile, getDraftFile, clearDraftFile } from '@/lib/file-store';

export default function Home() {
  const { data: session } = useSession();
  const { accounts, setAccounts } = useAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<StyleMode>('Manual');
  const [videoFormat, setVideoFormat] = useState<'short' | 'long'>('short');

  const [isInitialSync, setIsInitialSync] = React.useState(false);
  const [successfulAccountIds, setSuccessfulAccountIds] = useState<string[]>([]);
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const draftFileRef = useRef<File | null>(null);

  // Load persisted file from IndexedDB on mount
  useEffect(() => {
    getDraftFile().then(file => {
      if (file) {
        draftFileRef.current = file;
        setDraftFileName(file.name);
      }
    });
  }, []);

  // 1. Persistence: Platform Selection Stickiness
  useEffect(() => {
    const saved = localStorage.getItem('SS_SELECTED_PLATFORMS');
    if (saved) {
      try {
        setSelectedAccountIds(JSON.parse(saved));
        setIsInitialSync(true);
      } catch (e) {
        console.error("Failed to load platform labels");
      }
    }
  }, []);

  useEffect(() => {
    if (isInitialSync) {
      localStorage.setItem('SS_SELECTED_PLATFORMS', JSON.stringify(selectedAccountIds));
    }
  }, [selectedAccountIds, isInitialSync]);

  // 2. Initial Sync (Backup if no saved sticky selection)
  useEffect(() => {
    if (accounts.length > 0 && !isInitialSync) {
      const initialSelection: string[] = [];
      accounts.forEach(a => {
        if (a.isDistributionEnabled) {
          if (a.provider === 'facebook') {
            initialSelection.push(`facebook:${a.id}`);
            initialSelection.push(`instagram:${a.id}`);
          } else {
            initialSelection.push(a.id);
          }
        }
      });
      setSelectedAccountIds(initialSelection);
      setIsInitialSync(true);
    }
  }, [accounts, isInitialSync]);

  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const handleFileChange = async (file: File) => {
    draftFileRef.current = file;
    setDraftFileName(file.name);
    await storeDraftFile(file);
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;

    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput.files?.[0] || draftFileRef.current;
    
    if (!file || file.size === 0) {
      alert('Please select a video file.');
      return;
    }

    // Client-side Aspect Ratio & Duration Validation
    const validateVideoMetadata = async (file: File): Promise<boolean> => {
      // 0. Safety Threshold for Massive Files
      if (file.size > 1.5 * 1024 * 1024 * 1024) {
        console.warn('⚠️ Massive file detected (>1.5GB). Skipping client-side analysis.');
        setUploadStatus('🚀 Large file detected. Proceeding directly to streaming upload...');
        return true; 
      }

      setUploadStatus('🔍 Analyzing Video Metadata...');
      return new Promise((resolve) => {
        const video = document.createElement('video');
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

          if (videoFormat === 'short' && !isVertical) {
            alert('❌ Short-form content must be Vertical (9:16).');
            resolve(false);
          } else if (videoFormat === 'long' && isVertical) {
            alert('❌ Long-form content should be Landscape (16:9).');
            resolve(false);
          } else {
            const selectedPlatforms = accounts
              .filter(a => selectedAccountIds.includes(a.id))
              .map(a => a.provider === 'google' ? 'youtube' : a.provider);

            if (selectedPlatforms.includes('youtube') && videoFormat === 'short' && duration >= 60) {
              alert('❌ YouTube Shorts must be under 60 seconds.');
              resolve(false);
            } else if (selectedPlatforms.includes('facebook') && videoFormat === 'short' && duration > 90) {
              alert('❌ Reels via API are limited to 90 seconds.');
              resolve(false);
            } else {
              resolve(true);
            }
          }
        };

        video.onerror = () => { resolve(false); cleanup(); };
        video.src = URL.createObjectURL(file);
      });
    };

    const isValid = await validateVideoMetadata(file);
    if (!isValid) {
      setUploadStatus(null);
      return;
    }

    setSuccessfulAccountIds([]);
    setIsUploading(true);
    try {
      const data = new FormData(form);
      
      // Ensure the file is in FormData (it may come from IndexedDB, not the input)
      if (!data.get('file') || (data.get('file') as File).size === 0) {
        data.set('file', file);
      }
      
      await performMultiPlatformUpload({
        formData: data,
        accounts,
        selectedAccountIds,
        contentMode,
        videoFormat,
        onStatusUpdate: setUploadStatus,
        onAccountSuccess: (id) => setSuccessfulAccountIds(prev => [...prev, id])
      });

      setUploadStatus('All uploads completed successfully!');
      form.reset();
      // Clear all persistence after success
      localStorage.removeItem('SS_DRAFT_TITLE');
      localStorage.removeItem('SS_DRAFT_DESC');
      draftFileRef.current = null;
      setDraftFileName(null);
      await clearDraftFile();
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
          successfulAccountIds={successfulAccountIds}
          contentMode={contentMode}
          videoFormat={videoFormat}
          draftFileName={draftFileName}
          onModeChange={setContentMode}
          onFormatChange={setVideoFormat}
          onToggleAccount={handleToggleAccount}
          onFileChange={handleFileChange}
          onSubmit={handleUpload}
        />

        <SidebarInfo accounts={accounts} />
      </div>
    </div>
  );
}
