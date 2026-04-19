"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useAccounts } from '@/hooks/useAccounts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { UploadForm } from '@/components/dashboard/UploadForm';
import { SidebarInfo } from '@/components/dashboard/SidebarInfo';
import { stageVideoFile, distributeToPlatforms } from '@/lib/upload-utils';
import { StyleMode } from '@/lib/constants';
import { storeDraftFile, getDraftFile, clearDraftFile } from '@/lib/file-store';
import { getVideoFormatPreference, updateVideoFormatPreference } from '@/app/actions/user';

export default function Home() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const resumeHistoryId = searchParams.get('resume');
  const { accounts, setAccounts } = useAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<StyleMode>('Manual');
  const [videoFormat, setVideoFormat] = useState<'short' | 'long'>('short');

  const [isInitialSync, setIsInitialSync] = React.useState(false);
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, any>>({});
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

    // Load Sticky Video Format
    if (session?.user?.id) {
      getVideoFormatPreference().then(format => {
        if (format) setVideoFormat(format as 'short' | 'long');
      });
    }
  }, [session?.user?.id]);

  // 0. Smart Resumption Pre-fill
  useEffect(() => {
    if (resumeHistoryId && accounts.length > 0) {
      const loadResumptionData = async () => {
        setUploadStatus("🔍 Loading resumption data...");
        try {
          const res = await fetch(`/api/history/${resumeHistoryId}`);
          if (res.ok) {
            const { data } = await res.json();
            // 1. Update Title/Description in LocalStorage (for the form defaultValues)
            if (data.title) localStorage.setItem('SS_DRAFT_TITLE', data.title);
            if (data.description) localStorage.setItem('SS_DRAFT_DESC', data.description || '');
            
            // 2. Update Stateful selections
            setVideoFormat(data.videoFormat as 'short' | 'long');
            
            // 3. Map platforms back to account IDs
            const platformNames = data.platforms.map((p: any) => p.platform);
            const matchingIds: string[] = [];
            
            accounts.forEach(acc => {
              const pName = acc.provider === 'google' ? 'youtube' : acc.provider;
              if (platformNames.includes(pName)) {
                if (acc.provider === 'facebook') {
                   // Special case for our platform names logic
                   matchingIds.push(`facebook:${acc.id}`);
                   matchingIds.push(`instagram:${acc.id}`);
                } else {
                   matchingIds.push(acc.id);
                }
              }
            });
            
            if (matchingIds.length > 0) {
              setSelectedAccountIds(matchingIds);
            }
            
            setUploadStatus(`✅ Ready to resume: "${data.title}"`);
          }
        } catch (err) {
          console.error("Failed to load resumption data", err);
          setUploadStatus("⚠️ Failed to load resumption context");
        }
      };
      loadResumptionData();
    }
  }, [resumeHistoryId, accounts]);

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
      
      // Phase 1: Initialize + Stage file
      const title = (data.get('title') as string) || file.name || 'Untitled Post';
      const description = (data.get('description') as string) || undefined;
      
      // Extract platform names from selected IDs
      const platformIds = selectedAccountIds.map(sid => {
        const account = accounts.find(a => a.id === sid || `${a.provider === 'google' ? 'youtube' : a.provider}:${a.id}` === sid);
        return account ? (account.provider === 'google' ? 'youtube' : account.provider) : 'unknown';
      }).filter(p => p !== 'unknown');

      const { stagedFileId, fileName, historyId } = await stageVideoFile({
        file,
        onStatusUpdate: setUploadStatus,
        metadata: { title, description, videoFormat },
        platformIds,
        resumeHistoryId: resumeHistoryId || undefined
      });

      // Phase 2: Distribute to platforms with real-time updates
      setPlatformStatuses(selectedAccountIds.reduce((acc, id) => ({ ...acc, [id]: 'pending' }), {}));

      const distribution = await distributeToPlatforms({
        stagedFileId,
        fileName,
        formData: data,
        accounts,
        selectedAccountIds,
        contentMode,
        videoFormat,
        onStatusUpdate: setUploadStatus,
        onPlatformStatus: (id, status) => {
          setPlatformStatuses(prev => ({ ...prev, [id]: status }));
        },
        onAccountSuccess: (id) => setSuccessfulAccountIds(prev => [...prev, id]),
        historyId
      });

      const failures = distribution.platformResults.filter(r => r.status === 'failed');
      if (failures.length === 0) {
        setUploadStatus('All uploads completed successfully! ✨ Click view your live links in the History section.');
      } else if (failures.length < distribution.platformResults.length) {
        setUploadStatus(`Completed with ${failures.length} issue(s). ⚠️ Check History for details.`);
      } else {
        setUploadStatus('All uploads failed. ❌ Check History for technical details.');
      }
      form.reset();
      // Clear all persistence after success
      localStorage.removeItem('SS_DRAFT_TITLE');
      localStorage.removeItem('SS_DRAFT_DESC');
      draftFileRef.current = null;
      setDraftFileName(null);
      await clearDraftFile();
      // No alert, the UI status is enough or we can use a custom toast if preferred
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
      
      {/* Stats parked for next phase */}

      <div className="responsive-grid">
        <UploadForm 
          key={resumeHistoryId || 'new-post'}
          isUploading={isUploading}
          uploadStatus={uploadStatus}
          accounts={accounts}
          selectedAccountIds={selectedAccountIds}
          successfulAccountIds={successfulAccountIds}
          platformStatuses={platformStatuses}
          contentMode={contentMode}
          videoFormat={videoFormat}
          draftFileName={draftFileName}
          onModeChange={setContentMode}
          onFormatChange={(format) => {
            setVideoFormat(format);
            updateVideoFormatPreference(format).catch(err => console.error("Failed to save format preference", err));
          }}
          onToggleAccount={handleToggleAccount}
          onFileChange={handleFileChange}
          onSubmit={handleUpload}
        />

        <SidebarInfo accounts={accounts} />
      </div>
    </div>
  );
}
