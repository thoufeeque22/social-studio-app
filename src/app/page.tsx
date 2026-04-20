"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useAccounts } from '@/hooks/useAccounts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { UploadForm } from '@/components/dashboard/UploadForm';
import { SidebarInfo } from '@/components/dashboard/SidebarInfo';
import { AIContentReview } from '@/components/dashboard/AIContentReview';
import { stageVideoFile, distributeToPlatforms } from '@/lib/upload/upload-utils';
import { StyleMode } from '@/lib/core/constants';
import { storeDraftFile, getDraftFile, clearDraftFile } from '@/lib/upload/file-store';
import { getVideoFormatPreference, updateVideoFormatPreference } from '@/app/actions/user';
import { getMultiPlatformAIPreviews } from '@/app/actions/ai';
import { AIWriteResult } from '@/lib/utils/ai-writer';

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

  // AI Review States
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<Record<string, AIWriteResult>>({});
  const [stagedFlowData, setStagedFlowData] = useState<{ 
    stagedFileId: string; 
    fileName: string; 
    historyId: string;
    formData: FormData;
    isScheduled?: boolean;
    scheduledAt?: string;
  } | null>(null);

  const [isInitialSync, setIsInitialSync] = React.useState(false);
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, any>>({});
  const [successfulAccountIds, setSuccessfulAccountIds] = useState<string[]>([]);
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const draftFileRef = useRef<File | null>(null);

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

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
      const skipReview = data.get('skipReview') === 'true';
      
      // Ensure the file is in FormData (it may come from IndexedDB, not the input)
      if (!data.get('file') || (data.get('file') as File).size === 0) {
        data.set('file', file);
      }
      
      // Phase 1: Initialize + Stage file
      const title = (data.get('title') as string) || file.name || 'Untitled Post';
      const description = (data.get('description') as string) || undefined;
      
      // Preserve both platform names and their specific account IDs
      const platforms = selectedAccountIds.map(sid => {
        let platform: string;
        let accountId: string;
        
        if (sid.includes(':')) {
           const parts = sid.split(':');
           platform = parts[0];
           accountId = parts[1];
        } else {
           const account = accounts.find(a => a.id === sid);
           if (!account) return null;
           platform = account.provider === 'google' ? 'youtube' : account.provider;
           accountId = account.id;
        }
        return { platform, accountId };
      }).filter(p => p !== null);

      const { stagedFileId, fileName, historyId } = await stageVideoFile({
        file,
        onStatusUpdate: setUploadStatus,
        metadata: { 
          title, 
          description, 
          videoFormat,
          scheduledAt: isScheduled ? scheduledAt : undefined,
          isPublished: !isScheduled
        } as any,
        platforms: platforms as any,
        resumeHistoryId: resumeHistoryId || undefined
      });

      // Phase 2: Optional AI Review OR Direct Distribution
      if (contentMode !== 'Manual' && !skipReview) {
        setUploadStatus("✨ Strategy Brainstorming...");
        // Get generic platform names for preview
        const pNames = platforms.map(p => p!.platform);
        const previews = await getMultiPlatformAIPreviews(title, description || "", contentMode, pNames);
        
        if (previews) {
          setAiPreviews(previews);
          setStagedFlowData({ 
            stagedFileId, 
            fileName, 
            historyId, 
            formData: data,
            isScheduled,
            scheduledAt: isScheduled ? scheduledAt : undefined
          });
          setIsReviewing(true);
          setUploadStatus("Review required for AI content.");
          setIsUploading(false);
          return;
        }
      }

      if (isScheduled) {
        setUploadStatus(`📅 Post scheduled for ${new Date(scheduledAt).toLocaleString()}!`);
        setIsUploading(false);
        window.dispatchEvent(new CustomEvent('refresh-upcoming'));
        clearDraftFile();
        localStorage.removeItem('SS_DRAFT_TITLE');
        localStorage.removeItem('SS_DRAFT_DESC');
        setDraftFileName(null);
        draftFileRef.current = null;
        return;
      }

      // Manual Mode -> Distribute directly
      await executeDistribution(stagedFileId, fileName, historyId, data);

    } catch (error: any) {
      console.error('Process error:', error);
      setUploadStatus(`Error: ${error.message}`);
      alert(error.message);
      setIsUploading(false);
    }
  };

  const executeDistribution = async (
    stagedFileId: string, 
    fileName: string, 
    historyId: string, 
    formData: FormData,
    reviewedContent?: Record<string, AIWriteResult>
  ) => {
    setIsUploading(true);
    setUploadStatus("🚀 Orchestrating distribution...");
    setPlatformStatuses(selectedAccountIds.reduce((acc, id) => ({ ...acc, [id]: 'pending' }), {}));

    try {
      // If we have reviewed content, we need to pass it to the distribution call
      // or ensure the API respects it. 
      // For now, we'll pass the first platform's reviewed text back into the formData 
      // if it's the same for all, or we modify distributeToPlatforms to take a Map.
      
      const distribution = await distributeToPlatforms({
        stagedFileId,
        fileName,
        formData,
        accounts,
        selectedAccountIds,
        contentMode,
        videoFormat,
        onStatusUpdate: setUploadStatus,
        onPlatformStatus: (id, status) => {
          setPlatformStatuses(prev => ({ ...prev, [id]: status }));
        },
        onAccountSuccess: (id, result) => {
          setSuccessfulAccountIds(prev => [...prev, id]);
          // PERSISTENT UPDATE (Handled on caller side now)
          if (historyId) {
            import('@/app/actions/history').then(({ upsertPlatformResult }) => {
              upsertPlatformResult(historyId, result).catch(err => console.error("History persistence failed:", err));
            });
          }
        },
        historyId,
        // PASS REVIEWED CONTENT (We'll update upload-utils to handle this)
        reviewedContent: (reviewedContent as any)
      });

      const failures = distribution.platformResults.filter(r => r.status === 'failed');
      if (failures.length === 0) {
        setUploadStatus('All uploads completed successfully! ✨');
      } else {
        setUploadStatus(`Completed with ${failures.length} issues.`);
      }
      
      // Cleanup
      localStorage.removeItem('SS_DRAFT_TITLE');
      localStorage.removeItem('SS_DRAFT_DESC');
      draftFileRef.current = null;
      setDraftFileName(null);
      await clearDraftFile();
    } catch (error: any) {
      setUploadStatus(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
      setIsReviewing(false);
      setStagedFlowData(null);
    }
  };

  const handleConfirmReview = async (finalContent: Record<string, AIWriteResult>) => {
    if (!stagedFlowData) return;
    setIsReviewing(false); // Return to main UI to show upload progress

    if (stagedFlowData.isScheduled) {
       setIsUploading(true);
       setUploadStatus(`📅 Finalizing scheduled post...`);
       import('@/app/actions/history').then(async ({ saveStagedMetadata }) => {
         await saveStagedMetadata(stagedFlowData.stagedFileId, finalContent);
         setUploadStatus(`📅 Post scheduled for ${new Date(stagedFlowData.scheduledAt!).toLocaleString()}!`);
         setIsUploading(false);
         window.dispatchEvent(new CustomEvent('refresh-upcoming'));
         clearDraftFile();
         localStorage.removeItem('SS_DRAFT_TITLE');
         localStorage.removeItem('SS_DRAFT_DESC');
         setDraftFileName(null);
         draftFileRef.current = null;
         setStagedFlowData(null);
       });
       return;
    }

    await executeDistribution(
      stagedFlowData.stagedFileId,
      stagedFlowData.fileName,
      stagedFlowData.historyId,
      stagedFlowData.formData,
      finalContent
    );
  };

  return (
    <div className="fade-in">
      <DashboardHeader session={session} />
      
      {/* Stats parked for next phase */}

      <div className="responsive-grid">
        {isReviewing ? (
          <AIContentReview 
            previews={aiPreviews}
            onBack={() => {
              setIsReviewing(false);
              setUploadStatus("Ready to resume.");
            }}
            onConfirm={handleConfirmReview}
            isProcessing={isUploading}
          />
        ) : (
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
            isScheduled={isScheduled}
            scheduledAt={scheduledAt}
            onSchedulingChange={(scheduled, date) => {
              setIsScheduled(scheduled);
              setScheduledAt(date);
            }}
          />
        )}

        <SidebarInfo accounts={accounts} />
      </div>
    </div>
  );
}
