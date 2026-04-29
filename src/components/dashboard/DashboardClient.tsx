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

  const [isReviewing, setIsReviewing] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<Record<string, AIWriteResult>>({});

  const [isInitialSync, setIsInitialSync] = useState(false);
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, 'pending' | 'uploading' | 'processing' | 'success' | 'failed' | 'cancelled'>>({});
  const [platformErrors, setPlatformErrors] = useState<Record<string, string>>({});
  const [successfulAccountIds, setSuccessfulAccountIds] = useState<string[]>([]);
  const [draftFileName, setDraftFileName] = useState<string | null>(null);
  const draftFileRef = useRef<File | null>(null);
  const abortControllers = useRef<Record<string, AbortController>>({});

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reviewContext, setReviewContext] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    getDraftFile().then(file => {
      if (file) {
        draftFileRef.current = file;
        setDraftFileName(file.name);
      }
    });
  }, [session?.user?.id]);

  useEffect(() => {
    if (resumeHistoryId && accounts.length > 0) {
      const loadResumptionData = async () => {
        setUploadStatus("🔍 Loading resumption data...");
        try {
          const baseUrl = globalThis.window === undefined ? '' : globalThis.window.location.origin;
          const res = await fetch(`${baseUrl}/api/history/${resumeHistoryId}`);
          if (res.ok) {
            const { data } = await res.json();
            if (data.title) localStorage.setItem('SS_DRAFT_TITLE', data.title);
            if (data.description) localStorage.setItem('SS_DRAFT_DESC', data.description || '');
            setVideoFormat(data.videoFormat as 'short' | 'long');
            const platformNames = new Set(data.platforms.map((p: { platform: string }) => p.platform));
            const matchingIds: string[] = [];
            accounts.forEach(acc => {
              const pName = acc.provider === 'google' ? 'youtube' : acc.provider;
              if (platformNames.has(pName)) {
                if (acc.provider === 'facebook') {
                   matchingIds.push(`facebook:${acc.id}`, `instagram:${acc.id}`);
                } else {
                   matchingIds.push(acc.id);
                }
              }
            });
            if (matchingIds.length > 0) setSelectedAccountIds(matchingIds);
            setIsInitialSync(true);
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

  useEffect(() => {
    if (isLoading || isInitialSync) return;
    const stickySelection = localStorage.getItem('SS_SELECTED_PLATFORMS');
    if (stickySelection) {
      try {
        const parsed = JSON.parse(stickySelection);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedAccountIds(parsed);
          setIsInitialSync(true);
          return;
        }
      } catch (e) { console.error(e); }
    }
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
    if (!isUploading && (successfulAccountIds.length > 0 || Object.keys(platformStatuses).length > 0)) {
      setSuccessfulAccountIds([]);
      setPlatformStatuses({});
      setUploadStatus(null);
    }
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };
  
  const handleAbortPlatform = (id: string) => {
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
      setPlatformStatuses(prev => ({ ...prev, [id]: 'cancelled' }));
      setPlatformErrors(prev => ({ ...prev, [id]: 'Stopped by user' }));
    }
  };

  const handleAbortAll = () => {
    // 1. Immediately signal all controllers
    Object.values(abortControllers.current).forEach(controller => controller.abort());
    
    // 2. Instantly update UI states to 'cancelled' so we don't wait for results
    setPlatformStatuses(prev => {
      const next = { ...prev };
      Object.keys(abortControllers.current).forEach(id => {
        next[id] = 'cancelled';
      });
      return next;
    });

    setPlatformErrors(prev => {
      const next = { ...prev };
      Object.keys(abortControllers.current).forEach(id => {
        next[id] = 'Stopped by user';
      });
      return next;
    });

    abortControllers.current = {};
    setUploadStatus('⏹️ All uploads stopped by user.');
    setIsUploading(false);
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
        if (video.src) { globalThis.URL.revokeObjectURL(video.src); video.src = ''; }
        video.remove();
      };
      video.onloadedmetadata = () => {
        const isVertical = video.videoHeight > video.videoWidth;
        const duration = video.duration;
        cleanup();
        const format = (isVertical && duration <= 90) ? 'short' : 'long';
        resolve({ format, duration });
      };
      video.onerror = () => { resolve({ format: 'long', duration: 0 }); cleanup(); };
      video.src = globalThis.URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (file: File) => {
    draftFileRef.current = file;
    setDraftFileName(file.name);
    await storeDraftFile(file);
    setUploadStatus(null);
    setSuccessfulAccountIds([]);
    setPlatformStatuses({});
    const { format, duration } = await detectVideoMetadata(file);
    setVideoFormat(format);
    setVideoDuration(duration);
    updateVideoFormatPreference(format).catch(err => console.error(err));
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
      upsertPlatformResult(historyId, result as any).catch(err => console.error(err));
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
        if (isPlatformEnabled(platform)) selection.push(account.id);
      }
    });
    return selection;
  };

  const executeDistribution = async (
    stagedFileId: string, 
    fileName: string, 
    historyId: string, 
    formData: FormData,
    reviewedContent?: Record<string, AIWriteResult>,
    targetAccountIds?: string[]
  ) => {
    setIsUploading(true);
    const activeTargets = targetAccountIds || selectedAccountIds;
    setUploadStatus(targetAccountIds ? `🔄 Retrying ${targetAccountIds.length} platform(s)...` : "🚀 Orchestrating distribution...");
    
    setPlatformStatuses(prev => {
      const next = { ...prev };
      activeTargets.forEach(id => { next[id] = 'pending'; });
      return next;
    });

    const controllers: Record<string, AbortController> = {};
    const signals: Record<string, AbortSignal> = {};
    activeTargets.forEach(id => {
      const controller = new AbortController();
      controllers[id] = controller;
      signals[id] = controller.signal;
    });
    abortControllers.current = controllers;

    try {
      const distribution = await distributeToPlatforms({
        stagedFileId,
        fileName,
        formData,
        accounts,
        selectedAccountIds: activeTargets,
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
        reviewedContent: reviewedContent,
        signals
      });

      // Update statuses and errors using functional updates to avoid closure staleness
      const finalResults = distribution.platformResults;
      
      setPlatformStatuses(prev => {
        const next = { ...prev };
        finalResults.forEach(result => {
          if (result.status === 'success') {
            next[result.accountId] = 'success';
          } else if (result.status === 'cancelled') {
            next[result.accountId] = 'cancelled';
          } else if (result.status === 'failed') {
            // Final safety check for any missed aborts
            const isAborted = abortControllers.current[result.accountId]?.signal.aborted;
            const msg = result.errorMessage || '';
            if (isAborted || msg.includes('Cancelled') || msg.includes('Stopped') || msg.includes('Aborted')) {
              next[result.accountId] = 'cancelled';
            } else {
              next[result.accountId] = 'failed';
            }
          }
        });
        return next;
      });

      setPlatformErrors(prev => {
        const next = { ...prev };
        finalResults.forEach(result => {
          if (result.status === 'failed') {
            next[result.accountId] = result.errorMessage || 'Unknown error';
          } else if (result.status === 'cancelled') {
            next[result.accountId] = 'Stopped by user';
          }
        });
        return next;
      });

      const actualFailures = finalResults.filter(r => r.status === 'failed' && r.errorMessage !== 'Cancelled by user' && r.errorMessage !== 'Signal Aborted');
      const cancellations = finalResults.filter(r => r.status === 'failed' && (r.errorMessage === 'Cancelled by user' || r.errorMessage === 'Signal Aborted'));

      const totalAttempted = distribution.platformResults.length;
      const totalSuccess = distribution.platformResults.filter(r => r.status === 'success').length;

      if (totalSuccess === totalAttempted && totalAttempted > 0) {
        setUploadStatus('Distribution Complete: All successful! ✨');
        localStorage.removeItem('SS_DRAFT_TITLE');
        localStorage.removeItem('SS_DRAFT_DESC');
        draftFileRef.current = null;
        setDraftFileName(null);
        await clearDraftFile();
      } else if (actualFailures.length > 0) {
        setUploadStatus(`Distribution Complete: ${actualFailures.length} issues found.`);
      } else if (cancellations.length > 0) {
        setUploadStatus(`Distribution Complete: ${cancellations.length} stopped.`);
      }
    } catch (error: unknown) {
      setUploadStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      
      // Categorize statuses even on error (for Aborts)
      setPlatformStatuses(prev => {
        const next = { ...prev };
        Object.entries(abortControllers.current).forEach(([id, controller]) => {
          if (controller.signal.aborted && next[id] !== 'success') {
            next[id] = 'cancelled';
          }
        });
        return next;
      });
    } finally {
      setIsUploading(false);
      abortControllers.current = {};
    }
  };

  const handleUpload = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
    e.preventDefault();
    if (!session) return;
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    const file = fileInput.files?.[0] || draftFileRef.current;
    
    if (selectedAccountIds.length === 0 || !file) {
      alert("Please select a file and at least one channel.");
      return;
    }

    setIsUploading(true);
    try {
      const data = new FormData(form);
      if (!data.get('file')) data.set('file', file);
      
      const platforms = mapSelectedPlatforms(selectedAccountIds, accounts);
      
      const stagingController = new AbortController();
      abortControllers.current['staging'] = stagingController;

      const result = await stageVideoFile({
        file,
        onStatusUpdate: setUploadStatus,
        metadata: { title: (data.get('title') as string), description: (data.get('description') as string), videoFormat },
        platforms,
        resumeHistoryId: resumeHistoryId || undefined,
        signal: stagingController.signal
      });

      delete abortControllers.current['staging'];

      if (aiTier !== 'Manual' && data.get('skipReview') !== 'true') {
        const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
        const previews = await getMultiPlatformAIPreviews(data.get('title') as string, (data.get('description') as string) || '', aiTier, contentMode, platforms.map(p => p.platform));
        setAiPreviews(previews);
        setReviewContext({ stagedFileId: result.stagedFileId, historyId: result.historyId, fileName: result.fileName, formData: data, platforms });
        setIsReviewing(true);
        setIsUploading(false);
        return;
      }

      setUploadStatus("🚀 Orchestrating distribution...");
      await executeDistribution(result.stagedFileId, result.fileName, result.historyId, data);
    } catch (error: unknown) {
      setUploadStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
      setIsUploading(false);
    }
  };

  const handleConfirmReview = async (updatedPreviews: Record<string, AIWriteResult>) => {
    if (!reviewContext) return;
    setIsReviewing(false);
    setIsUploading(true);
    await executeDistribution(
      reviewContext.stagedFileId as string,
      reviewContext.fileName as string,
      reviewContext.historyId as string,
      reviewContext.formData as FormData,
      updatedPreviews
    );
  };

  const handleVisualScan = async (file: File) => {
    try {
      setIsUploading(true);
      setUploadStatus('🪄 Scanning video content with AI...');
      const frames = await extractVideoFrames(file);
      const platforms = preferences.filter(p => p.isEnabled);
      const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
      const previews = await getMultiPlatformAIPreviews('', '', 'Generate', contentMode, platforms.map(p => p.platformId), frames);
      setAiPreviews(previews);
      setIsReviewing(true);
    } catch (err) { console.error(err); } finally { setIsUploading(false); }
  };

  return (
    <div className="fade-in">
      <DashboardHeader session={session} />
      <div className="responsive-grid">
        {isReviewing ? (
          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <AIContentReview 
              previews={aiPreviews}
              onBack={() => { setIsReviewing(false); setIsUploading(false); setUploadStatus(null); }}
              onConfirm={handleConfirmReview}
              isProcessing={isUploading}
            />
          </div>
        ) : (
          <UploadForm 
            isUploading={isUploading}
            uploadStatus={uploadStatus}
            accounts={accounts}
            preferences={preferences}
            selectedAccountIds={selectedAccountIds}
            successfulAccountIds={successfulAccountIds}
            platformStatuses={platformStatuses}
            platformErrors={platformErrors}
            contentMode={contentMode}
            aiTier={aiTier}
            videoFormat={videoFormat}
            videoDuration={videoDuration}
            draftFileName={draftFileName}
            onVisualScan={handleVisualScan}
            onTierChange={setAiTier}
            onModeChange={setContentMode}
            onFormatChange={setVideoFormat}
            onToggleAccount={handleToggleAccount}
            onAbort={handleAbortPlatform}
            onAbortAll={handleAbortAll}
            onFileChange={handleFileChange}
            onSubmit={handleUpload}
            isScheduled={isScheduled}
            scheduledAt={scheduledAt}
            onSchedulingChange={(s, d) => { setIsScheduled(s); setScheduledAt(d); }}
            hasFailures={Object.values(platformStatuses).some(s => s === 'failed' || s === 'cancelled')}
          />
        )}
        <SidebarInfo accounts={accounts} />
      </div>

      {isUploading && uploadStatus && !uploadStatus.includes('Complete') && (
        <div style={{
          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          width: '95%', maxWidth: '500px', background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)', border: '1px solid hsla(var(--primary) / 0.5)', 
          borderRadius: '1.5rem', padding: '1.25rem 1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.8), 0 0 20px hsla(var(--primary) / 0.2)', 
          animation: 'slideUpHUD 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, minWidth: 0 }}>
            <div className="animate-pulse" style={{ 
              width: '14px', height: '14px', borderRadius: '50%', 
              background: 'hsl(var(--primary))', boxShadow: '0 0 12px hsl(var(--primary))' 
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontSize: '0.7rem', color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.05em' }}>Current Progress</span>
              <p style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{uploadStatus}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleAbortAll} 
            style={{ 
              background: '#EF4444', color: 'white', border: 'none', 
              padding: '0.75rem 1.5rem', borderRadius: '1rem', 
              fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.3)';
            }}
          >
            ⏹️ STOP ALL
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes slideUpHUD {
          from { transform: translate(-50%, 150%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
