"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccounts } from '@/hooks/useAccounts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { AIContentReview } from '@/components/dashboard/AIContentReview';
import { UploadForm } from '@/components/dashboard/UploadForm';
import { SidebarInfo } from '@/components/dashboard/SidebarInfo';
import { StyleMode, AITier } from '@/lib/core/constants';
import { AIWriteResult } from '@/lib/utils/ai-writer';
import { extractVideoFrames } from '@/lib/utils/video-analysis';
import type { Session } from 'next-auth';
import { Account, PlatformPreference } from '@/lib/core/types';
import { useDraftFile } from '@/hooks/dashboard/useDraftFile';
import { usePlatformSelection } from '@/hooks/dashboard/usePlatformSelection';
import { useDistributionEngine } from '@/hooks/dashboard/useDistributionEngine';
import { useUploadStatus } from '@/hooks/useUploadStatus';
import StopIcon from '@mui/icons-material/Stop';

interface ReviewContext {
  stagedFileId: string;
  fileName: string;
  historyId: string;
  formData: FormData;
  targetAccountIds?: string[];
}

interface Asset {
  fileId: string;
  fileName: string;
}

interface DashboardClientProps {
  session: Session;
  initialAccounts: Account[];
  initialPreferences: PlatformPreference[];
  initialAIStyle: StyleMode;
  initialAITier: AITier;
}

export default function DashboardClient({ 
  session, 
  initialAccounts, 
  initialPreferences,
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
        name: 'Tester Alpha', 
        accountName: 'Tester Alpha',
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
        name: 'Tester Beta', 
        accountName: 'Tester Beta',
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
  }, [accounts, session?.user?.id]);
  const {
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
    handleAbortAll
  } = useDistributionEngine(devAccounts);

  // Sync with global upload status for cross-tab aborts
  const { historyId: activeGlobalId, active: isGlobalActive } = useUploadStatus();
  
  useEffect(() => {
    // If the global status says inactive but we think we're uploading, 
    // and it's not just the initial null state, abort locally.
    if (isUploading && isGlobalActive === false && activeGlobalId) {
       handleAbortAll();
    }
  }, [isUploading, isGlobalActive, activeGlobalId, handleAbortAll]);

  // 2. LOCAL STATE: Only for UI-specific flows (Review, AI Tiers)
  const [aiTier, setAiTierInternal] = useState<AITier>(() => {
    // Priority: localStorage (fastest/most recent) > initialAITier (server-side) > Manual (fallback)
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('SS_AI_TIER') as AITier;
      if (saved && ['Manual', 'Enrich', 'Generate'].includes(saved)) return saved;
    }
    return initialAITier || 'Manual';
  });

  const [contentMode, setContentMode] = useState<StyleMode>(
    (initialAIStyle && (initialAIStyle as string) !== 'Manual') ? initialAIStyle : 'Smart'
  );

  // Persistence wrapper for AI Tier
  const setAiTier = async (newTier: AITier) => {
    setAiTierInternal(newTier);
    if (globalThis.localStorage) {
      localStorage.setItem('SS_AI_TIER', newTier);
    }

    try {
      const { updateAIStylePreference } = await import('@/app/actions/user');
      await updateAIStylePreference(newTier);
    } catch (err) {
      console.error("Failed to persist AI Tier preference", err);
    }
  };
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<Record<string, AIWriteResult>>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reviewContext, setReviewContext] = useState<ReviewContext | null>(null);
  const [galleryFileId, setGalleryFileId] = useState<string | null>(null);
  const [galleryFileName, setGalleryFileName] = useState<string | null>(null);
  const [customStyleText, setCustomStyleText] = useState('');

  // 3. EFFECT: Resumption Logic
  useEffect(() => {
    if (resumeHistoryId && accounts.length > 0) {
      const loadResumptionData = async () => {
        setUploadStatus(" Loading resumption data...");
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
            setUploadStatus(` Ready to resume: "${data.title}"`);
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
           const asset = data.data?.find((a: Asset) => a.fileId === stagedFileIdParam);
           if (asset) {
             setGalleryFileId(asset.fileId);
             setGalleryFileName(asset.fileName);
             setUploadStatus(` Ready to post: ${asset.fileName}`);
           }
        })
        .catch(err => console.error("Failed to load staged asset", err));
    }
  }, [stagedFileIdParam, setUploadStatus]);

  // 4. HANDLERS: Orchestrating the flows
  const handleMainAction = async (formData: FormData, targetAccountIds?: string[]) => {
    try {
      const isPlatformSpecific = formData.get('isPlatformSpecific') === 'true';

      // 1. Prepare Metadata for Cockpit Mode
      const targetPlatforms = (targetAccountIds || selectedAccountIds)
        .map(id => {
          const isSplit = id.includes(':');
          const platformKey = isSplit ? id.split(':')[0] : null;
          const actualAccountId = isSplit ? id.split(':')[1] : id;
          const account = devAccounts.find(a => a.id === actualAccountId);
          let provider = account ? (account.provider === 'google' ? 'youtube' : account.provider) : 'unknown';
          if (isSplit && platformKey) provider = platformKey;

          const customContent = isPlatformSpecific ? {
            title: formData.get(`title_${provider}`) as string,
            description: formData.get(`description_${provider}`) as string
          } : undefined;

          return { 
            platform: provider, 
            accountId: actualAccountId,
            customContent
          };
        })
        .filter(p => p.platform !== 'unknown');

      if (targetPlatforms.length === 0) {
        setUploadStatus("️ No valid platforms selected.");
        return;
      }

      // 2. Pre-Initialize in Database (So it appears in Activity Hub immediately)
      setUploadStatus("️ Initializing Cockpit...");
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

      const skipReview = formData.get('skipReview') === 'true';

      if (aiTier !== 'Manual' && !skipReview) {
        setUploadStatus(" Generating AI Strategy...");
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
        const targetPlatformNames = targetPlatforms.map(p => p.platform);

        const previews = await getMultiPlatformAIPreviews(
          title, 
          description, 
          aiTier, 
          contentMode, 
          targetPlatformNames, 
          [], 
          customStyleText
        );

        setAiPreviews(previews);
        setReviewContext({ 
          historyId: actualHistoryId,
          stagedFileId: galleryFileId || '',
          fileName: galleryFileName || draftFileName || '',
          formData: formData
        });
        setIsReviewing(true);
        return; // Pause the flow, wait for user confirmation
      }

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
        resumeHistoryId: actualHistoryId,
        skipReview
      };

      localStorage.setItem('SS_PENDING_POST', JSON.stringify(pendingPost));
      localStorage.removeItem('SS_DRAFT_TITLE');
      localStorage.removeItem('SS_DRAFT_DESC');

      // 4. TELEPORT TO COCKPIT
      window.location.href = '/history?action=distribute';

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setUploadStatus(` Error: ${message}`);
    }
  };

  const handleConfirmReview = async (updatedPreviews: Record<string, AIWriteResult>) => {
    if (!reviewContext) return;
    setIsReviewing(false);
    setIsUploading(true);
    setUploadStatus(" Applying AI magic...");

    try {
      const { updatePlatformResultsAction } = await import('@/app/actions/history');
      await updatePlatformResultsAction(reviewContext.historyId, updatedPreviews);

      // Reconstruct the pending post for the Cockpit UI
      const targetPlatforms = selectedAccountIds.map(id => {
        const isSplit = id.includes(':');
        const platformKey = isSplit ? id.split(':')[0] : null;
        const actualAccountId = isSplit ? id.split(':')[1] : id;
        const account = devAccounts.find(a => a.id === actualAccountId);
        let provider = account ? (account.provider === 'google' ? 'youtube' : account.provider) : 'unknown';
        if (isSplit && platformKey) provider = platformKey;
        return { platform: provider, accountId: actualAccountId };
      }).filter(p => p.platform !== 'unknown');

      const pendingPost = {
        title: "AI Optimized Post", // Cockpit uses DB anyway, this is just for UI placeholder
        description: "",
        videoFormat,
        aiTier,
        contentMode,
        customStyleText,
        platforms: targetPlatforms,
        isScheduled,
        scheduledAt,
        galleryFileId,
        galleryFileName,
        resumeHistoryId: reviewContext.historyId
      };

      localStorage.setItem('SS_PENDING_POST', JSON.stringify(pendingPost));
      localStorage.removeItem('SS_DRAFT_TITLE');
      localStorage.removeItem('SS_DRAFT_DESC');

      window.location.href = '/history?action=distribute';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setUploadStatus(` Error saving AI content: ${message}`);
      setIsUploading(false);
    }
  };

  const handleVisualScan = async (file: File) => {
    try {
      setUploadStatus(' Scanning video content with AI...');
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
    setUploadStatus(` Selected: ${fileName}`);
  };

  return (
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
              accounts={devAccounts}
              preferences={preferences}
              selectedAccountIds={selectedAccountIds}
              contentMode={contentMode}
              aiTier={aiTier}
              videoFormat={videoFormat}
              videoDuration={videoDuration}
              draftFileName={galleryFileName || draftFileName}
              onVisualScan={handleVisualScan}
              onTierChange={setAiTier}
              onModeChange={setContentMode}
              onToggleAccount={handleToggleAccount}
              onFileChange={(file) => {
                setGalleryFileId(null);
                setGalleryFileName(null);
                handleFileChange(file);
                setAiPreviews({});
              }}
              onGallerySelect={(fileId, fileName) => {
                handleGallerySelect(fileId, fileName);
                setAiPreviews({});
              }}
              onSubmit={handleMainAction}
              isScheduled={isScheduled}
              scheduledAt={scheduledAt}
              onSchedulingChange={(s, d) => { setIsScheduled(s); setScheduledAt(d); }}
              customStyleText={customStyleText}
              onCustomStyleChange={setCustomStyleText}
              hasCachedPreviews={Object.keys(aiPreviews).length > 0}
              onResumeReview={() => setIsReviewing(true)}
            />
        )}
        <SidebarInfo />
      </div>
    </div>
  );
}