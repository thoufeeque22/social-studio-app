"use client";

import React, { useState, useEffect } from 'react';
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

  // 1. MODULAR LOGIC: Hooks handle the heavy lifting
  const { accounts, isLoading, preferences } = useAccounts(initialAccounts, initialPreferences);
  
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
  } = usePlatformSelection(accounts, preferences, isLoading);

  const {
    isUploading,
    uploadStatus,
    setUploadStatus,
    platformStatuses,
    platformErrors,
    successfulAccountIds,
    handleAbortPlatform,
    handleAbortAll,
    executeDistribution
  } = useDistributionEngine(accounts);

  // 2. LOCAL STATE: Only for UI-specific flows (Review, AI Tiers)
  const [aiTier, setAiTier] = useState<AITier>(initialAITier || 'Manual');
  const [contentMode, setContentMode] = useState<StyleMode>(
    (initialAIStyle && (initialAIStyle as string) !== 'Manual') ? initialAIStyle : 'Hook'
  );
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<Record<string, AIWriteResult>>({});
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [reviewContext, setReviewContext] = useState<ReviewContext | null>(null);

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

  // 4. HANDLERS: Orchestrating the flows
  const handleMainAction = async (formData: FormData, targetAccountIds?: string[]) => {
    if (!draftFileRef.current) {
      setUploadStatus("⚠️ Please select a video file first.");
      return;
    }

    try {
      setUploadStatus("⚙️ Preparing video...");
      const mappedPlatforms = (targetAccountIds || selectedAccountIds).map(id => ({
        platform: id.split(':')[0],
        accountId: id.split(':')[1] || id
      }));

      // A. Stage the file
      const { stagedFileId, fileName, historyId } = await stageVideoFile({
        file: draftFileRef.current,
        onStatusUpdate: setUploadStatus,
        metadata: {
          title: formData.get('title') as string,
          description: formData.get('description') as string,
          videoFormat,
          scheduledAt: isScheduled ? scheduledAt : undefined,
          isPublished: !isScheduled
        },
        platforms: mappedPlatforms,
        resumeHistoryId: resumeHistoryId || undefined
      });

      // B. AI Review Flow Logic
      if (aiTier !== 'Manual' && formData.get('skipReview') !== 'true') {
        const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
        setUploadStatus("🪄 Generating AI options...");
        const previews = await getMultiPlatformAIPreviews(
          formData.get('title') as string, 
          (formData.get('description') as string) || '', 
          aiTier, 
          contentMode, 
          mappedPlatforms.map(p => p.platform)
        );
        setAiPreviews(previews);
        setReviewContext({ stagedFileId, fileName, historyId, formData, targetAccountIds });
        setIsReviewing(true);
        return;
      }

      // C. Direct Distribution
      const distribution = await executeDistribution({
        stagedFileId,
        fileName,
        historyId,
        formData,
        selectedAccountIds,
        reviewedContent: aiPreviews,
        targetAccountIds
      });

      if (distribution?.platformResults.every(r => r.status === 'success')) {
        setUploadStatus('Distribution Complete: All successful! ✨');
        localStorage.removeItem('SS_DRAFT_TITLE');
        localStorage.removeItem('SS_DRAFT_DESC');
        handleFileChange(null as unknown as File); 
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setUploadStatus(`❌ Error: ${message}`);
    }
  };

  const handleConfirmReview = async (updatedPreviews: Record<string, AIWriteResult>) => {
    if (!reviewContext) return;
    setIsReviewing(false);
    setAiPreviews(updatedPreviews);
    
    const distribution = await executeDistribution({
      ...reviewContext!,
      selectedAccountIds,
      reviewedContent: updatedPreviews
    });

    if (distribution?.platformResults.every(r => r.status === 'success')) {
      setUploadStatus('Distribution Complete: All successful! ✨');
      handleFileChange(null as any);
    }
  };

  const handleVisualScan = async (file: File) => {
    try {
      setUploadStatus('🪄 Scanning video content with AI...');
      const frames = await extractVideoFrames(file);
      const platforms = preferences.filter(p => p.isEnabled);
      const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
      const previews = await getMultiPlatformAIPreviews('', '', 'Generate', contentMode, platforms.map(p => p.platformId), frames);
      setAiPreviews(previews);
      setIsReviewing(true);
    } catch (err) { console.error(err); } 
  };

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
              onSubmit={handleMainAction}
              isScheduled={isScheduled}
              scheduledAt={scheduledAt}
              onSchedulingChange={(s, d) => { setIsScheduled(s); setScheduledAt(d); }}
              hasFailures={Object.values(platformStatuses).some(s => s === 'failed' || s === 'cancelled')}
            />
          )}
          <SidebarInfo accounts={accounts} />
        </div>
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
    </>
  );
}
