"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccounts } from '@/hooks/useAccounts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIContentReview } from '@/components/dashboard/AIContentReview';
import { UploadForm } from '@/components/dashboard/UploadForm';
import { SidebarInfo } from '@/components/dashboard/SidebarInfo';
import { stageVideoFile } from '@/lib/upload/upload-utils';
import { StyleMode, AITier } from '@/lib/core/constants';
import { AIWriteResult } from '@/lib/utils/ai-writer';
import { extractVideoFrames } from '@/lib/utils/video-analysis';
import type { Session } from 'next-auth';
import { Account, PlatformPreference } from '@/lib/core/types';
import { useDraftFile } from '@/hooks/dashboard/useDraftFile';
import { usePlatformSelection } from '@/hooks/dashboard/usePlatformSelection';
import { useDistributionEngine } from '@/hooks/dashboard/useDistributionEngine';

interface ReviewContext {
  stagedFileId: string;
  fileName: string;
  historyId: string;
  formData: FormData;
  targetAccountIds?: string[];
}

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
  const searchParams = useSearchParams();
  const resumeHistoryId = searchParams.get('resume');
  const stagedFileIdParam = searchParams.get('staged');

  // 1. MODULAR LOGIC: Hooks handle the heavy lifting
  const { accounts, isLoading, preferences } = useAccounts(initialAccounts, initialPreferences);
  
  // Inject Local Simulator for Dev Env
  const devAccounts = React.useMemo(() => {
    if (process.env.NODE_ENV !== 'development') return accounts;
    if (accounts.some(a => a.id.startsWith('local-dev-'))) return accounts;
    return [
      ...accounts, 
      { 
        id: 'local-dev-1', 
        userId: session?.user?.id || 'dev-user',
        provider: 'local1', 
        providerAccountId: 'local-1',
        name: 'Local Alpha', 
        accountName: 'Local Alpha',
        email: 'alpha@local.host', 
        image: null, 
        access_token: null,
        refresh_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
        isDistributionEnabled: true 
      },
      { 
        id: 'local-dev-2', 
        userId: session?.user?.id || 'dev-user',
        provider: 'local2', 
        providerAccountId: 'local-2',
        name: 'Local Beta', 
        accountName: 'Local Beta',
        email: 'beta@local.host', 
        image: null, 
        access_token: null,
        refresh_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
        isDistributionEnabled: true 
      },
      { 
        id: 'local-dev-3', 
        userId: session?.user?.id || 'dev-user',
        provider: 'local3', 
        providerAccountId: 'local-3',
        name: 'Local Gamma', 
        accountName: 'Local Gamma',
        email: 'gamma@local.host', 
        image: null, 
        access_token: null,
        refresh_token: null,
        expires_at: null,
        token_type: null,
        scope: null,
        id_token: null,
        session_state: null,
        isDistributionEnabled: true 
      }
    ];
  }, [accounts]);

  const {
    draftFileRef,
    draftFileName,
    videoFormat,
    setVideoFormat,
    videoDuration,
    handleFileChange
  } = useDraftFile(session?.user?.id);

  const {
    selectedAccountIds,
    setSelectedAccountIds,
    handleToggleAccount
  } = usePlatformSelection(devAccounts, preferences, isLoading);

  const {
    isUploading,
    setIsUploading,
    uploadStatus,
    setUploadStatus,
    platformStatuses,
    platformErrors,
    successfulAccountIds,
    handleAbortPlatform,
    handleAbortAll
  } = useDistributionEngine(devAccounts);

  // 2. LOCAL STATE: Only for UI-specific flows (Review, AI Tiers)
  const [aiTier, setAiTier] = useState<AITier>(initialAITier || 'Manual');
  const [contentMode, setContentMode] = useState<StyleMode>(
    (initialAIStyle && (initialAIStyle as string) !== 'Manual') ? initialAIStyle : 'Smart'
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<Record<string, AIWriteResult>>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reviewContext, setReviewContext] = useState<ReviewContext | null>(null);
  const [galleryFileId, setGalleryFileId] = useState<string | null>(null);
  const [galleryFileName, setGalleryFileName] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [customStyleText, setCustomStyleText] = useState('');

  // 3. EFFECT: Resumption Logic
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
            setUploadStatus(`✅ Ready to resume: "${data.title}"`);
          }
        } catch (err) {
          console.error("Failed to load resumption data", err);
        }
      };
      loadResumptionData();
    }
  }, [resumeHistoryId, accounts, setSelectedAccountIds, setUploadStatus, setVideoFormat]);

  useEffect(() => {
    if (stagedFileIdParam) {
      fetch(`/api/media`)
        .then(res => res.json())
        .then(data => {
           const asset = data.data?.find((a: any) => a.fileId === stagedFileIdParam);
           if (asset) {
             setGalleryFileId(asset.fileId);
             setGalleryFileName(asset.fileName);
             setUploadStatus(`✅ Ready to post: ${asset.fileName}`);
           }
        })
        .catch(err => console.error("Failed to load staged asset", err));
    }
  }, [stagedFileIdParam, setUploadStatus]);

  // Broadcast status for Cross-Tab HUD sync
  useEffect(() => {
    if (isUploading && uploadStatus && globalThis.localStorage) {
      localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
        status: uploadStatus,
        timestamp: Date.now(),
        active: true
      }));
    } else if (!isUploading && globalThis.localStorage) {
       // Only remove if it was us who put it there
       const staging = localStorage.getItem('SS_STAGING_STATUS');
       if (staging && !JSON.parse(staging).status.includes('Chunk')) {
         localStorage.removeItem('SS_STAGING_STATUS');
       }
    }
  }, [isUploading, uploadStatus]);

  // 4. HANDLERS: Orchestrating the flows
  const handleMainAction = async (formData: FormData, targetAccountIds?: string[]) => {
    try {
      // 1. Prepare Metadata for Cockpit Mode
      const targetPlatforms = (targetAccountIds || selectedAccountIds)
        .map(id => {
          const isSplit = id.includes(':');
          const platformKey = isSplit ? id.split(':')[0] : null;
          const actualAccountId = isSplit ? id.split(':')[1] : id;
          const account = devAccounts.find(a => a.id === actualAccountId);
          let provider = account ? (account.provider === 'google' ? 'youtube' : account.provider) : 'unknown';
          if (isSplit && platformKey) provider = platformKey;
          return { platform: provider, accountId: actualAccountId };
        })
        .filter(p => p.platform !== 'unknown');

      if (targetPlatforms.length === 0) {
        setUploadStatus("⚠️ No valid platforms selected.");
        return;
      }

      // 2. Pre-Initialize in Database (So it appears in Activity Hub immediately)
      setUploadStatus("🛰️ Initializing Cockpit...");
      const initRes = await fetch('/api/upload/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          videoFormat,
          platforms: targetPlatforms
        })
      });
      
      const initData = await initRes.json();
      const actualHistoryId = initData.data?.historyId || resumeHistoryId;

      // 3. Save everything to localStorage for the Activity Hub Cockpit
      const pendingPost = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        videoFormat,
        aiTier,
        contentMode,
        customStyleText,
        platforms: targetPlatforms,
        isScheduled,
        scheduledAt,
        galleryFileId,
        galleryFileName,
        resumeHistoryId: actualHistoryId
      };

      localStorage.setItem('SS_PENDING_POST', JSON.stringify(pendingPost));
      localStorage.removeItem('SS_DRAFT_TITLE');
      localStorage.removeItem('SS_DRAFT_DESC');

      // 4. TELEPORT TO COCKPIT
      window.location.href = '/history?action=distribute';

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setUploadStatus(`❌ Error: ${message}`);
    }
  };

  const handleConfirmReview = async (updatedPreviews: Record<string, AIWriteResult>) => {
    if (!reviewContext) return;
    setIsReviewing(false);
    setIsUploading(true);
    setUploadStatus("🪄 Applying AI magic...");
    
    try {
      const { updatePlatformResultsAction } = await import('@/app/actions/history');
      await updatePlatformResultsAction(reviewContext.historyId, updatedPreviews);
      
      setUploadStatus("✨ AI Content saved! Finalizing in Activity Hub...");
      setIsComplete(true);
      
      setTimeout(() => {
        window.location.href = '/history';
      }, 1500);
      
      handleFileChange(null);
      setGalleryFileId(null);
      setGalleryFileName(null);
    } catch (err: any) {
      setUploadStatus(`❌ Error saving AI content: ${err.message}`);
      setIsUploading(false);
    }
  };

  const handleVisualScan = async (file: File) => {
    try {
      setUploadStatus('🪄 Scanning video content with AI...');
      const frames = await extractVideoFrames(file);
      const platforms = preferences.filter(p => p.isEnabled);
      const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
      const previews = await getMultiPlatformAIPreviews('', '', 'Generate', contentMode, platforms.map(p => p.platformId), frames, customStyleText);
      setAiPreviews(previews);
      setIsReviewing(true);
    } catch (err) { console.error(err); } 
  };

  const handleGallerySelect = (fileId: string, fileName: string) => {
    setGalleryFileId(fileId);
    setGalleryFileName(fileName);
    handleFileChange(null);
    setUploadStatus(`✅ Selected: ${fileName}`);
  };

  const showHUD = isUploading && uploadStatus && (typeof uploadStatus === 'string' ? !uploadStatus.includes('Complete') : true);

  return (
    <>
      <div className="fade-in">
        <DashboardHeader session={session} />
        <div className="responsive-grid">
          {isReviewing ? (
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <AIContentReview 
                previews={aiPreviews}
                onBack={() => { setIsReviewing(false); setUploadStatus(null); }}
                onConfirm={handleConfirmReview}
                isProcessing={isUploading}
              />
            </div>
          ) : (
            <UploadForm 
              isUploading={isUploading}
              uploadStatus={uploadStatus}
              accounts={devAccounts}
              preferences={preferences}
              selectedAccountIds={selectedAccountIds}
              successfulAccountIds={successfulAccountIds}
              platformStatuses={platformStatuses}
              platformErrors={platformErrors}
              contentMode={contentMode}
              aiTier={aiTier}
              videoFormat={videoFormat}
              videoDuration={videoDuration}
              draftFileName={galleryFileName || draftFileName}
              onVisualScan={handleVisualScan}
              onTierChange={setAiTier}
              onModeChange={setContentMode}
              onFormatChange={setVideoFormat}
              onToggleAccount={handleToggleAccount}
              onAbort={handleAbortPlatform}
              onAbortAll={handleAbortAll}
              onFileChange={(file) => {
                setGalleryFileId(null);
                setGalleryFileName(null);
                handleFileChange(file);
                setIsComplete(false);
              }}
              onGallerySelect={(fileId, fileName) => {
                handleGallerySelect(fileId, fileName);
                setIsComplete(false);
              }}
              onSubmit={handleMainAction}
              isScheduled={isScheduled}
              scheduledAt={scheduledAt}
              onSchedulingChange={(s, d) => { setIsScheduled(s); setScheduledAt(d); }}
              hasFailures={Object.values(platformStatuses).some(s => s === 'failed' || s === 'cancelled')}
              isComplete={isComplete}
              customStyleText={customStyleText}
              onCustomStyleChange={setCustomStyleText}
            />
          )}
          <SidebarInfo accounts={devAccounts} />
        </div>
      </div>

      {showHUD && (
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
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{uploadStatus}</div>
            </div>
          </div>
          <button 
            type="button" 
            aria-label="Stop all active uploads"
            onClick={handleAbortAll} 
            style={{ 
              background: '#EF4444', color: 'white', border: 'none', 
              padding: '0.75rem 1.5rem', borderRadius: '1rem', 
              fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)',
              whiteSpace: 'nowrap'
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
    </>
  );
}