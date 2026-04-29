"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccounts } from '@/hooks/useAccounts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIContentReview } from '@/components/dashboard/AIContentReview';
import { UploadForm } from '@/components/dashboard/UploadForm';
import { SidebarInfo } from '@/components/dashboard/SidebarInfo';
import { stageVideoFile, distributeToPlatforms } from '@/lib/upload/upload-utils';
import { StyleMode, AITier } from '@/lib/core/constants';
import { storeDraftFile, getDraftFile, clearDraftFile } from '@/lib/upload/file-store';
import { updateVideoFormatPreference, updateAIStylePreference } from '@/app/actions/user';
import { AIWriteResult } from '@/lib/utils/ai-writer';
import { extractVideoFrames } from '@/lib/utils/video-analysis';
import type { Session } from 'next-auth';
import { Account, PlatformPreference } from '@/lib/core/types';

interface DashboardClientProps {
  session: Session;
  initialAccounts: Account[];
  initialPreferences: PlatformPreference[];
  initialVideoFormat: 'short' | 'long';
  initialAIStyle: StyleMode;
  initialAITier: AITier;
}

export default function DashboardClient({ 
  session, 
  initialAccounts, 
  initialPreferences,
  initialVideoFormat,
  initialAIStyle,
  initialAITier
}: Readonly<DashboardClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const resumeHistoryId = searchParams.get('resume');
  const { accounts, isLoading, preferences } = useAccounts(initialAccounts, initialPreferences);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [aiTier, setAiTier] = useState<AITier>(initialAITier || 'Manual');
  const [contentMode, setContentMode] = useState<StyleMode>(
    (initialAIStyle && (initialAIStyle as string) !== 'Manual') ? initialAIStyle : 'Hook'
  );
  const [videoFormat, setVideoFormat] = useState<'short' | 'long'>(initialVideoFormat);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);

  // AI Review States
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<Record<string, AIWriteResult>>({});

  const [isInitialSync, setIsInitialSync] = useState(false);
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, 'pending' | 'uploading' | 'processing' | 'success' | 'failed'>>({});
  const [successfulAccountIds, setSuccessfulAccountIds] = useState<string[]>([]);
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const draftFileRef = useRef<File | null>(null);

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const [reviewContext, setReviewContext] = useState<Record<string, unknown> | null>(null);

  // Load persisted file from IndexedDB on mount
  useEffect(() => {
    getDraftFile().then(file => {
      if (file) {
        draftFileRef.current = file;
        setDraftFileName(file.name);
      }
    });
  }, [session?.user?.id]);

  // 0. Smart Resumption Pre-fill
  useEffect(() => {
    if (resumeHistoryId && accounts.length > 0) {
      const loadResumptionData = async () => {
        setUploadStatus("🔍 Loading resumption data...");
        try {
          const baseUrl = globalThis.window === undefined ? '' : globalThis.window.location.origin;
          const res = await fetch(`${baseUrl}/api/history/${resumeHistoryId}`);
          if (res.ok) {
            const { data } = await res.json();
            // 1. Update Title/Description in LocalStorage (for the form defaultValues)
            if (data.title) localStorage.setItem('SS_DRAFT_TITLE', data.title);
            if (data.description) localStorage.setItem('SS_DRAFT_DESC', data.description || '');
            
            // 2. Update Stateful selections
            setVideoFormat(data.videoFormat as 'short' | 'long');
            
            // 3. Map platforms back to account IDs
            const platformNames = new Set(data.platforms.map((p: { platform: string }) => p.platform));
            const matchingIds: string[] = [];
            
            accounts.forEach(acc => {
              const pName = acc.provider === 'google' ? 'youtube' : acc.provider;
              if (platformNames.has(pName)) {
                if (acc.provider === 'facebook') {
                   // Special case for our platform names logic
                   matchingIds.push(`facebook:${acc.id}`, `instagram:${acc.id}`);
                } else {
                   matchingIds.push(acc.id);
                }
              }
            });
            
            if (matchingIds.length > 0) {
              setSelectedAccountIds(matchingIds);
            }
            
            setIsInitialSync(true); // Prevent auto-selection logic from overwriting this
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

  // Unified selection initialization effect
  useEffect(() => {
    if (isLoading || isInitialSync) return;

    // 1. Check LocalStorage (Sticky Selection)
    const stickySelection = localStorage.getItem('SS_SELECTED_PLATFORMS');
    if (stickySelection) {
      try {
        const parsed = JSON.parse(stickySelection);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedAccountIds(parsed);
          setIsInitialSync(true);
          return;
        }
      } catch (e) {
        console.error("Failed to parse sticky selection", e);
      }
    }

    // 2. Fallback: Auto-selection based on preferences and distribution status
    if (accounts.length > 0) {
      const initialSelection = calculateInitialSelection(accounts, preferences);
      setSelectedAccountIds(initialSelection);
      setIsInitialSync(true);
    }
  }, [accounts, isInitialSync, preferences, isLoading]);

  useEffect(() => {
    if (isInitialSync) {
      localStorage.setItem('SS_SELECTED_PLATFORMS', JSON.stringify(selectedAccountIds));
    }
  }, [selectedAccountIds, isInitialSync]);


  const handleToggleAccount = (id: string) => {
    // If we're interacting after a previous upload, clear the old success/failure states
    if (!isUploading && (successfulAccountIds.length > 0 || Object.keys(platformStatuses).length > 0)) {
      setSuccessfulAccountIds([]);
      setPlatformStatuses({});
      setUploadStatus(null);
    }

    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

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
        
        // Logic: Vertical + < 90s = Short. Everything else = Long.
        // We use 90s as a threshold for Reels/Shorts compatibility.
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

  const handleFileChange = async (file: File) => {
    draftFileRef.current = file;
    setDraftFileName(file.name);
    await storeDraftFile(file);
    
    // Reset statuses for a new post
    setUploadStatus(null);
    setSuccessfulAccountIds([]);
    setPlatformStatuses({});

    // 🚀 Dynamic Format Detection
    const { format, duration } = await detectVideoMetadata(file);
    setVideoFormat(format);
    setVideoDuration(duration);
    updateVideoFormatPreference(format).catch(err => console.error("Failed to save format preference", err));
  };

  // Helper: Client-side Aspect Ratio & Duration Validation
  const validateVideoMetadata = async (
    file: File, 
    videoFormat: 'short' | 'long', 
    accounts: Account[], 
    selectedAccountIds: string[],
    setUploadStatus: (s: string | null) => void
  ): Promise<boolean> => {
    setUploadStatus('🔍 Final Metadata Check...');
    const { duration } = await detectVideoMetadata(file);
    
    const platformSet = getSelectedPlatformSet(accounts, selectedAccountIds);

    // Hard limits check
    if (platformSet.has('youtube') && videoFormat === 'short' && duration >= 60) {
      alert('❌ YouTube Shorts must be under 60 seconds. This video is too long for a Short.');
      return false;
    } 
    
    if (platformSet.has('facebook') && videoFormat === 'short' && duration > 90) {
      alert('❌ Reels via API are limited to 90 seconds.');
      return false;
    }

    return true;
  };

  const mapSelectedPlatforms = (ids: string[], accounts: Account[]) => {
    return ids.map(sid => {
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
    }).filter((p): p is { platform: string; accountId: string } => p !== null);
  };

  const handlePlatformPersistence = (historyId: string, result: unknown) => {
    if (!historyId) return;
    import('@/app/actions/history').then(({ upsertPlatformResult }) => {
      upsertPlatformResult(historyId, result as import('@/app/actions/history').PlatformResultInput).catch(err => console.error("History persistence failed:", err));
    });
  };
  const calculateInitialSelection = (accounts: Account[], preferences: PlatformPreference[]) => {
    const isPlatformEnabled = (platformId: string) => {
      const pref = preferences.find(p => p.platformId === platformId);
      return pref ? pref.isEnabled : true;
    };

    const selection: string[] = [];
    
    accounts.forEach(account => {
      if (!account.isDistributionEnabled) return;

      if (account.provider === 'facebook') {
        if (isPlatformEnabled('facebook')) selection.push(`facebook:${account.id}`);
        if (isPlatformEnabled('instagram')) selection.push(`instagram:${account.id}`);
      } else {
        const platform = account.provider === 'google' ? 'youtube' : account.provider;
        if (isPlatformEnabled(platform)) {
          selection.push(account.id);
        }
      }
    });

    if (selection.length === 0) {
      const firstEnabled = accounts.find(a => a.isDistributionEnabled);
      if (firstEnabled) {
        selection.push(firstEnabled.provider === 'facebook' ? `facebook:${firstEnabled.id}` : firstEnabled.id);
      }
    }
    return selection;
  };

  const getSelectedPlatformSet = (accounts: Account[], ids: string[]) => {
    return new Set(accounts
      .filter(a => ids.includes(a.id))
      .map(a => a.provider === 'google' ? 'youtube' : a.provider));
  };

  const handleUpload = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
    e.preventDefault();
    if (!session) return;
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput.files?.[0] || draftFileRef.current;
    
    const validateUploadForm = (fileToValidate: File | null) => {
      if (selectedAccountIds.length === 0) {
        if (accounts.length === 0) {
          if (confirm("You haven't connected any social platforms yet. Would you like to go to Settings to connect them now?")) {
            router.push('/settings');
          }
        } else {
          alert("Please select at least one distribution channel (e.g., YouTube, Instagram) before posting.");
        }
        return false;
      }
      if (!fileToValidate || fileToValidate.size === 0) {
        alert('Please select a video file.');
        return false;
      }
      return true;
    };

    if (!validateUploadForm(file)) return;

    const isValid = await validateVideoMetadata(file as File, videoFormat, accounts, selectedAccountIds, setUploadStatus);
    if (!isValid) {
      setUploadStatus(null);
      return;
    }

    setSuccessfulAccountIds([]);
    setIsUploading(true);
    try {
      const data = new FormData(form);
      const skipReview = data.get('skipReview') === 'true';
      
      if (!data.get('file') || (data.get('file') as File).size === 0) {
        data.set('file', file as File);
      }
      
      const { stagedFileId, fileName, historyId, platforms, title, description } = await performStaging(file as File, data);

      if (aiTier !== 'Manual' && !skipReview) {
        const reviewHandled = await handleAIReview(stagedFileId, fileName, historyId, platforms, title, description, data);
        if (reviewHandled) return;
      }

      if (isScheduled) {
        setUploadStatus(`📅 Post scheduled for ${new Date(scheduledAt).toLocaleString()}!`);
        setIsUploading(false);
        globalThis.dispatchEvent(new CustomEvent('refresh-upcoming'));
        cleanupDraft();
        return;
      }

      await executeDistribution(stagedFileId, fileName, historyId, data);
    } catch (error: unknown) {
      console.error('Process error:', error);
      const message = error instanceof Error ? error.message : String(error);
      setUploadStatus(`Error: ${message}`);
      alert(message);
      setIsUploading(false);
    }
  };

  const cleanupDraft = () => {
    clearDraftFile();
    localStorage.removeItem('SS_DRAFT_TITLE');
    localStorage.removeItem('SS_DRAFT_DESC');
    setDraftFileName(null);
    draftFileRef.current = null;
  };

  const performStaging = async (file: File, data: FormData) => {
    const title = (data.get('title') as string) || file.name || 'Untitled Post';
    const description = (data.get('description') as string) || undefined;
    const platforms = mapSelectedPlatforms(selectedAccountIds, accounts);

    const result = await stageVideoFile({
      file,
      onStatusUpdate: setUploadStatus,
      metadata: { 
        title, 
        description, 
        videoFormat,
        scheduledAt: isScheduled ? scheduledAt : undefined,
        isPublished: !isScheduled
      },
      platforms,
      resumeHistoryId: resumeHistoryId || undefined
    });

    return { ...result, platforms, title, description };
  };

  const handleAIReview = async (
    stagedFileId: string, 
    fileName: string, 
    historyId: string, 
    platforms: { platform: string; accountId: string }[], 
    title: string, 
    description: string | undefined, 
    data: FormData
  ) => {
    setUploadStatus('🧠 Brainstorming AI Strategies...');
    const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
    
    try {
      const previews = await getMultiPlatformAIPreviews(
        title,
        description || '',
        aiTier,
        contentMode,
        platforms.map(p => p.platform)
      );
      
      setAiPreviews(previews);
      setReviewContext({ stagedFileId, historyId, fileName, formData: data, platforms });
      setIsReviewing(true);
      setIsUploading(false);
      setUploadStatus(null);
      return true;
    } catch (err: unknown) {
      console.error(err);
      alert("AI Generation failed. Check console and API key.");
      setIsUploading(false);
      setUploadStatus(null);
      return false;
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
          if (result.status === 'success') {
            setSuccessfulAccountIds(prev => [...prev, id]);
          }
          handlePlatformPersistence(historyId, result);
        },
        historyId,
        reviewedContent: reviewedContent
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setUploadStatus(`Error: ${message}`);
    } finally {
      setIsUploading(false);
      setIsReviewing(false);

    }
  };

  const handleVisualScan = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadStatus('🪄 Scanning video content with AI...');
      
      const frames = await extractVideoFrames(file);
      const platforms = initialPreferences.filter(p => p.isEnabled);
      
      const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
      const previews = await getMultiPlatformAIPreviews(
        '', // No user title
        '', // No user description
        'Generate',
        contentMode,
        platforms.map(p => p.platformId),
        frames
      );

      setReviewContext({
        file,
        title: '',
        description: '',
        platforms: platforms.map(p => p.platformId),
        videoFormat,
        isScheduled: false,
        scheduledAt: '',
      });
      setAiPreviews(previews);
      setIsReviewing(true);
      setUploadStatus(null);
    } catch (err) {
      console.error("Visual Scan Error:", err);
      setUploadStatus("❌ Failed to scan video. Try a manual prompt.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmReview = async (updatedPreviews: Record<string, AIWriteResult>) => {
    if (!reviewContext) return;
    setIsReviewing(false);
    setIsUploading(true);
    setUploadStatus('🚀 Applying Approved Strategy...');
    
    try {
      const { saveStagedMetadata } = await import('@/app/actions/history');
      await saveStagedMetadata(reviewContext.stagedFileId as string, updatedPreviews);
      
      if (isScheduled) {
        setUploadStatus(`📅 Post scheduled for ${new Date(scheduledAt).toLocaleString()}!`);
        setIsUploading(false);
        globalThis.dispatchEvent(new CustomEvent('refresh-upcoming'));
        clearDraftFile();
        localStorage.removeItem('SS_DRAFT_TITLE');
        localStorage.removeItem('SS_DRAFT_DESC');
        setDraftFileName(null);
        draftFileRef.current = null;
        return;
      }

      setPlatformStatuses(selectedAccountIds.reduce((acc, id) => ({ ...acc, [id]: 'pending' }), {}));
      
      const distribution = await distributeToPlatforms({
        stagedFileId: reviewContext.stagedFileId as string,
        fileName: reviewContext.fileName as string,
        formData: reviewContext.formData as FormData,
        accounts,
        selectedAccountIds,
        contentMode,
        videoFormat,
        onStatusUpdate: setUploadStatus,
        onPlatformStatus: (id, status) => {
          setPlatformStatuses(prev => ({ ...prev, [id]: status }));
        },
        onAccountSuccess: (id, result) => {
          if (result.status === 'success') {
            setSuccessfulAccountIds(prev => [...prev, id]);
          }
        },
        historyId: reviewContext.historyId as string,
        reviewedContent: updatedPreviews
      });
      
      const failures = distribution.platformResults.filter(r => r.status === 'failed');
      if (failures.length === 0) {
        setUploadStatus('All uploads completed successfully! ✨');
      } else {
        setUploadStatus('Completed with issues. ⚠️ Check History.');
      }
      
      localStorage.removeItem('SS_DRAFT_TITLE');
      localStorage.removeItem('SS_DRAFT_DESC');
      draftFileRef.current = null;
      setDraftFileName(null);
      await clearDraftFile();
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      setUploadStatus(`Error: ${message}`);
      alert(message);
    } finally {
      setIsUploading(false);
    }
  };

  if (isReviewing && reviewContext) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-8" style={{ background: 'hsl(var(--background))' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <AIContentReview 
            previews={aiPreviews}
            onBack={() => { setIsReviewing(false); setIsUploading(false); setUploadStatus(null); }}
            onConfirm={handleConfirmReview}
            isProcessing={isUploading}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <DashboardHeader session={session} />
      
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
            preferences={preferences}
            selectedAccountIds={selectedAccountIds}
            successfulAccountIds={successfulAccountIds}
            platformStatuses={platformStatuses}
            contentMode={contentMode}
            aiTier={aiTier}
            videoFormat={videoFormat}
            videoDuration={videoDuration}
            draftFileName={draftFileName}
            onVisualScan={handleVisualScan}
            onTierChange={(tier) => {
              setAiTier(tier);
              // We could add updateAITierPreference(tier) here later
            }}
            onModeChange={(mode) => {
              setContentMode(mode);
              updateAIStylePreference(mode).catch(err => console.error("Failed to save style preference", err));
            }}
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
