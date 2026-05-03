'use client';

/**
 * HISTORY PAGE - Activity Hub
 * Displays a list of all past uploads and their platform links.
 * Supports:
 * - Single platform retries (Cloud retry)
 * - Single platform cancellation
 * - Stop All functionality
 * - In-place physical upload resumption (Chunk retry)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { GlassCard } from '@/components/ui/GlassCard';
import { stageVideoFile, distributeToPlatforms } from '@/lib/upload/upload-utils';
import { getDraftFile } from '@/lib/upload/file-store';
import { useAccounts } from '@/hooks/useAccounts';
import { usePolling } from '@/hooks/usePolling';
import { AIContentReview } from '@/components/dashboard/AIContentReview';
import styles from './history.module.css';

interface PlatformResult {
  id: string;
  platform: string;
  accountName: string | null;
  platformPostId: string | null;
  permalink: string | null;
  status: string;
  progress: number;
  errorMessage: string | null;
  accountId: string | null;
}

interface PostHistoryEntry {
  id: string;
  title: string;
  description: string | null;
  videoFormat: string;
  createdAt: string;
  stagedFileId: string | null;
  platforms: PlatformResult[];
}

const PLATFORM_META: Record<string, { icon: string; label: string; className: string }> = {
  youtube:   { icon: '📺', label: 'YouTube',   className: styles.platformYoutube },
  instagram: { icon: '📸', label: 'Instagram', className: styles.platformInstagram },
  facebook:  { icon: '👥', label: 'Facebook',  className: styles.platformFacebook },
  tiktok:    { icon: '🎵', label: 'TikTok',    className: styles.platformTiktok },
};

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export default function HistoryPage() {
  const [posts, setPosts] = useState<PostHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeResumingId, setActiveResumingId] = useState<string | null>(null);
  const [inPlaceStatus, setInPlaceStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCockpitActive, setIsCockpitActive] = useState(false);
  const [cockpitReviews, setCockpitReviews] = useState<Record<string, any>>({});
  const [isReviewingCockpit, setIsReviewingCockpit] = useState(false);
  const [cockpitContext, setCockpitContext] = useState<any>(null);
  const cockpitStartedRef = useRef(false);
  const { accounts } = useAccounts();

  useEffect(() => {
    const url = new URL(globalThis.window?.location.href || '');
    const action = url.searchParams.get('action');
    if (action === 'distribute' && !cockpitStartedRef.current && accounts.length > 0) {
      cockpitStartedRef.current = true;
      handleCockpitStart();
    }
  }, [accounts]);

  const fetchHistory = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    params.set('_t', Date.now().toString()); // Cache buster

    const res = await fetch(`/api/history?${params.toString()}`);
    const data = await res.json();
    return data;
  }, []);

  useEffect(() => {
    fetchHistory().then((data) => {
      setPosts(data.data || []);
      setNextCursor(data.nextCursor);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [fetchHistory]);

  const hasActivePosts = posts.some(post => 
    post.platforms.some(p => ['pending', 'uploading', 'processing', 'retrying'].includes(p.status))
  );

  usePolling({
    callback: async () => {
      const data = await fetchHistory();
      setPosts(data.data || []);
    },
    interval: hasActivePosts ? 5000 : 15000,
    isActive: posts.length > 0
  });

  // High-speed cross-tab sync for HUD
  useEffect(() => {
    const sync = () => {
      if (globalThis.localStorage) {
        const staging = localStorage.getItem('SS_STAGING_STATUS');
        if (staging) {
          const { status, timestamp, active } = JSON.parse(staging);
          if (active && Date.now() - timestamp < 30000) {
            if (!activeResumingId) setActiveResumingId('cross-tab-sync');
            setInPlaceStatus(status);
          } else if (activeResumingId === 'cross-tab-sync') {
            setActiveResumingId(null);
            setInPlaceStatus(null);
          }
        } else if (activeResumingId === 'cross-tab-sync') {
          setActiveResumingId(null);
          setInPlaceStatus(null);
        }
      }
    };
    const itv = setInterval(sync, 500);
    return () => clearInterval(itv);
  }, [activeResumingId]);

  const isProcessing = (post: PostHistoryEntry) => {
    return post.platforms.every(p => p.status === 'pending') && 
           (Date.now() - new Date(post.createdAt).getTime() < 120000); // 2 min threshold
  };

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchHistory(nextCursor);
    setPosts(prev => [...prev, ...(data.data || [])]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  };

  const [processingIds, setProcessingIds] = useState<string[]>([]);

  const handleRetry = async (e: React.MouseEvent, p: PlatformResult) => {
    e.preventDefault();
    e.stopPropagation();
    if (processingIds.includes(p.id)) return;

    setProcessingIds(prev => [...prev, p.id]);
    try {
      const { retryUploadAction } = await import('@/app/actions/history');
      const res = await retryUploadAction(p.id);
      if (res.success) {
        const data = await fetchHistory();
        setPosts(data.data || []);
      } else {
        alert(`Retry failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Retry error: ${err.message}`);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== p.id));
    }
  };

  const handleCancelPlatform = async (e: React.MouseEvent, resultId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (processingIds.includes(resultId)) return;

    setProcessingIds(prev => [...prev, resultId]);
    try {
      const { cancelPlatformUploadAction } = await import('@/app/actions/history');
      await cancelPlatformUploadAction(resultId);
      const data = await fetchHistory();
      setPosts(data.data || []);
    } catch (err: any) {
      console.error("Cancel error:", err);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== resultId));
    }
  };

  const handleCancelAll = async (e: React.MouseEvent, historyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const { cancelAllUploadsAction } = await import('@/app/actions/history');
      await cancelAllUploadsAction(historyId);
      const data = await fetchHistory();
      setPosts(data.data || []);
    } catch (err: any) {
      console.error("Cancel All error:", err);
    }
  };

  const handleCockpitStart = async () => {
    if (accounts.length === 0) {
      setInPlaceStatus("⏳ Waiting for platform accounts...");
      return;
    }
    
    const pending = localStorage.getItem('SS_PENDING_POST');
    if (!pending) {
      setInPlaceStatus("⚠️ No pending post found in storage.");
      return;
    }
    
    setIsCockpitActive(true);
    const post = JSON.parse(pending);
    setCockpitContext(post);

    const hId = post.resumeHistoryId;
    if (hId) {
      setActiveResumingId(hId);
    } else {
      setActiveResumingId('cockpit-active');
    }

    setInPlaceStatus("📡 Synchronizing Activity Hub...");
    // REFRESH LIST TO SHOW THE NEW ROW
    try {
      const freshData = await fetchHistory();
      setPosts(freshData.data || []);
    } catch (e) { console.error("Initial list refresh failed", e); }
    
    try {
      setInPlaceStatus("📂 Accessing local video storage...");
      let stagedFileId = post.galleryFileId;
      let fileName = post.galleryFileName || '';
      let historyId = post.resumeHistoryId || '';

      // 1. Stage Physical File if needed
      if (!stagedFileId) {
        setInPlaceStatus("🔍 Searching for draft file...");
        const file = await getDraftFile();
        if (!file) throw new Error("Video file not found in browser. Please re-select it on the dashboard.");
        
        setInPlaceStatus(`📤 Initializing upload for ${file.name}...`);
        const stageResult = await stageVideoFile({
          file,
          onStatusUpdate: setInPlaceStatus,
          metadata: {
            title: post.title,
            description: post.description,
            videoFormat: post.videoFormat,
            scheduledAt: post.isScheduled ? post.scheduledAt : undefined,
            isPublished: false
          },
          platforms: post.platforms,
          resumeHistoryId: post.resumeHistoryId
        });
        stagedFileId = stageResult.stagedFileId;
        fileName = stageResult.fileName;
        historyId = stageResult.historyId;
      }

      // 2. AI Generation if needed
      if (post.aiTier !== 'Manual') {
        setInPlaceStatus("🪄 Generating AI options...");
        const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
        const previews = await getMultiPlatformAIPreviews(
          post.title,
          post.description || '',
          post.aiTier,
          post.contentMode,
          post.platforms.map((p: any) => p.platform),
          undefined,
          post.customStyleText
        );
        setCockpitReviews(previews);
        setCockpitContext({ ...post, stagedFileId, fileName, historyId });
        setIsReviewingCockpit(true);
        setInPlaceStatus("📋 Waiting for content review...");
        return; // Wait for user to confirm AI
      }

      // 3. Final Distribution
      await executeCockpitDistribution(stagedFileId, fileName, historyId, post);

    } catch (err: any) {
      setInPlaceStatus(`❌ Cockpit Error: ${err.message}`);
      setTimeout(() => {
        setIsCockpitActive(false);
        setActiveResumingId(null);
      }, 5000);
    }
  };

  const executeCockpitDistribution = async (stagedFileId: string, fileName: string, historyId: string, post: any, reviewedContent?: any) => {
    setInPlaceStatus("🚀 Launching Mission...");
    
    try {
      if (reviewedContent) {
        const { updatePlatformResultsAction } = await import('@/app/actions/history');
        await updatePlatformResultsAction(historyId, reviewedContent);
      }

      const selectedAccountIds = post.platforms.map((p: any) => {
         const account = accounts.find(acc => (acc.provider === 'google' ? 'youtube' : acc.provider) === p.platform);
         if (!account) return null;
         return (p.platform === 'facebook' || p.platform === 'instagram') ? `${p.platform}:${account.id}` : account.id;
      }).filter(Boolean);

      setInPlaceStatus("🛰️ Distributing to Platforms...");
      await distributeToPlatforms({
        stagedFileId,
        fileName,
        formData: new FormData(),
        accounts,
        selectedAccountIds,
        contentMode: post.contentMode,
        videoFormat: post.videoFormat,
        onStatusUpdate: setInPlaceStatus,
        historyId,
        reviewedContent,
        onAccountSuccess: async () => {
           const updated = await fetchHistory();
           setPosts(updated.data || []);
        }
      });

      setInPlaceStatus("✨ Mission Accomplished!");
      localStorage.removeItem('SS_PENDING_POST');
      const data = await fetchHistory();
      setPosts(data.data || []);
      setTimeout(() => {
        setIsCockpitActive(false);
        setActiveResumingId(null);
        // Clear URL param
        window.history.replaceState({}, '', '/history');
      }, 2000);

    } catch (err: any) {
      setInPlaceStatus(`❌ Distribution Error: ${err.message}`);
    }
  };

  const handleConfirmCockpitReview = async (updatedPreviews: any) => {
    setIsReviewingCockpit(false);
    if (cockpitContext) {
      await executeCockpitDistribution(
        cockpitContext.stagedFileId,
        cockpitContext.fileName,
        cockpitContext.historyId,
        cockpitContext,
        updatedPreviews
      );
    }
  };

  const handleInPlaceResume = async (post: PostHistoryEntry) => {
    setActiveResumingId(post.id);
    setInPlaceStatus("🔍 Checking browser storage...");
    
    try {
      let file = await getDraftFile();
      
      if (!file) {
        setInPlaceStatus("📂 Please select the video file to resume...");
        if (fileInputRef.current) {
          fileInputRef.current.onchange = (e: any) => {
             const selected = e.target.files?.[0];
             if (selected) executePipeline(post, selected);
          };
          fileInputRef.current.click();
        }
        return;
      }
      
      await executePipeline(post, file);
    } catch (err: any) {
      setInPlaceStatus(`❌ Error: ${err.message}`);
      setTimeout(() => setActiveResumingId(null), 3000);
    }
  };

  const executePipeline = async (post: PostHistoryEntry, file: File) => {
    setInPlaceStatus("🚀 Starting resumption...");
    try {
      const { stagedFileId, fileName, historyId } = await stageVideoFile({
        file,
        onStatusUpdate: setInPlaceStatus,
        metadata: { title: post.title, description: post.description || undefined, videoFormat: post.videoFormat },
        platforms: post.platforms.map(p => ({ 
          platform: p.platform, 
          accountId: (p as any).accountId || accounts.find(acc => (acc.provider === 'google' ? 'youtube' : acc.provider) === p.platform)?.id
        })).filter(p => p.accountId) as any,
        resumeHistoryId: post.id
      });
      
      const selectedAccountIds = post.platforms.map(p => {
        const accountId = (p as any).accountId || accounts.find(acc => (acc.provider === 'google' ? 'youtube' : acc.provider) === p.platform)?.id;
        if (!accountId) return null;
        return (p.platform === 'facebook' || p.platform === 'instagram') ? `${p.platform}:${accountId}` : accountId;
      }).filter(Boolean) as string[];

      await distributeToPlatforms({
        stagedFileId,
        fileName,
        formData: new FormData(), 
        accounts,
        selectedAccountIds,
        contentMode: 'Hook',
        videoFormat: post.videoFormat as any,
        onStatusUpdate: setInPlaceStatus,
        historyId,
        onAccountSuccess: async () => {
           const updated = await fetchHistory();
           setPosts(updated.data || []);
        }
      });
      
      setInPlaceStatus("✨ All done!");
      const data = await fetchHistory();
      setPosts(data.data || []);
      setTimeout(() => setActiveResumingId(null), 2000);
    } catch (err: any) {
      setInPlaceStatus(`❌ Error: ${err.message}`);
      setTimeout(() => setActiveResumingId(null), 5000);
    }
  };

  const renderPlatformPill = (p: PlatformResult, post: PostHistoryEntry) => {
    let resolvedPlatform = p.platform;
    if (resolvedPlatform === 'google') resolvedPlatform = 'youtube';
    
    if (!PLATFORM_META[resolvedPlatform] && resolvedPlatform.length > 15) {
      resolvedPlatform = 'youtube';
    }

    const meta = PLATFORM_META[resolvedPlatform] || {
      icon: '🔗',
      label: p.platform === 'unknown' ? 'Platform' : (p.platform.length > 15 ? 'External' : p.platform),
      className: styles.platformDefault,
    };

    const isFailed = p.status === 'failed';
    const isCancelled = p.status === 'cancelled';
    const isRetrying = p.status === 'retrying' || processingIds.includes(p.id);
    const isUploading = p.status === 'uploading';
    const isPending = p.status === 'pending' || p.status === 'processing';
    
    const postCreatedAt = new Date(post.createdAt).getTime();
    const isPostStale = p.status === 'pending' && (Date.now() - postCreatedAt > 60 * 1000) && !post.stagedFileId;
    
    const hasLink = !isFailed && !isRetrying && !isPending && !isUploading && !isCancelled && !isPostStale && p.permalink;

    const pillClasses = [
      styles.platformPill,
      meta.className,
      isFailed ? styles.platformPillFailed : 
      isCancelled ? styles.platformPillCancelled :
      isRetrying ? styles.platformPillRetrying : 
      isUploading ? styles.platformPillUploading :
      (isPending && !isPostStale) ? styles.platformPillPending :
      isPostStale ? styles.platformPillStale :
      hasLink ? styles.platformPillSuccess : styles.platformPillNoLink,
      isFailed ? styles.failedTooltip : '',
    ].filter(Boolean).join(' ');

    const showProgress = (isPending || isUploading) && !isPostStale && p.progress > 0;

    const content = (
      <>
        {showProgress && (
           <div 
             className={styles.pillProgressBar} 
             style={{ width: `${p.progress}%` }} 
           />
        )}
        <span className={styles.pillIcon}>
          {isRetrying ? '⏳' : isUploading ? '📤' : (isPending && !isPostStale) ? '⏳' : isPostStale ? '⏳' : isCancelled ? '⏹️' : meta.icon}
        </span>
        <span className={styles.pillLabel}>
          {isPostStale ? `${meta.label} (Waiting for Video)` : 
           isCancelled ? `${meta.label} (Stopped)` : 
           (isPending && !isPostStale) ? (p.progress > 0 ? `${meta.label} (Distributing)` : `${meta.label} (In Queue)`) : 
           meta.label}
          {showProgress && <span className={styles.progressPercent}>{Math.round(p.progress)}%</span>}
        </span>
        
        {/* ACTION BUTTONS */}
        <div className={styles.pillActions}>
          {isFailed && (
            <button 
              className={styles.pillActionButton} 
              onClick={(e) => handleRetry(e, p)}
              title="Retry Upload"
            >
              🔄
            </button>
          )}
          {isPending && !isPostStale && (
            <button 
              className={styles.pillActionButton} 
              onClick={(e) => handleCancelPlatform(e, p.id)}
              title="Stop Platform Upload"
              style={{ color: '#EF4444' }}
            >
              ⏹️
            </button>
          )}
          {isCancelled && (
            <button 
              className={styles.pillActionButton} 
              onClick={(e) => handleRetry(e, p)}
              title="Resume Stopped Upload"
            >
              ▶️
            </button>
          )}
        </div>

        {hasLink && <span className={styles.pillLink}>↗</span>}
      </>
    );

    if (hasLink) {
      return (
        <a
          key={p.id}
          href={p.permalink!}
          target="_blank"
          rel="noopener noreferrer"
          className={pillClasses}
          title={`View on ${meta.label}`}
        >
          {content}
        </a>
      );
    }

    const getTooltip = () => {
      if (isFailed) return p.errorMessage || 'Upload failed';
      if (isRetrying) return 'Retrying upload...';
      if (isPending && !isPostStale) return 'Waiting for background worker to pick up this task...';
      if (isPostStale) return 'Waiting for the physical video file to reach the cockpit...';
      return `Status: ${p.status}${p.progress > 0 ? ` (${p.progress}%)` : ''}`;
    };

    return (
      <span
        key={p.id}
        className={pillClasses}
        data-error={isFailed ? p.errorMessage || 'Upload failed' : undefined}
        title={getTooltip()}
      >
        {content}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.historyPage}>
        <div className={styles.loading}>Loading Activity Hub...</div>
      </div>
    );
  }

  return (
    <div className={styles.historyPage}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Activity Hub</h1>
        </div>
        <p className={styles.subtitle}>
          Track and manage your video distribution in real-time.
        </p>
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="video/*" />
      </div>

      {posts.length === 0 ? (
        <GlassCard>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📜</div>
            <h3 className={styles.emptyTitle}>No activity yet</h3>
            <p className={styles.emptyDescription}>
              Upload a video from the dashboard to see its distribution status here.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className={styles.timeline}>
          {posts.map((post) => {
            const isActive = post.platforms.some(p => ['pending', 'uploading', 'processing', 'retrying'].includes(p.status));
            const allPending = post.platforms.every(p => p.status === 'pending');

            return (
              <div key={post.id} className={`${styles.postCard} ${isActive ? styles.activePost : ''}`}>
                <div className={styles.timelineDot} />
                <GlassCard className={styles.cardInner} style={{ position: 'relative', overflow: 'hidden' }}>
                  {/* GLOBAL PREPARATION BAR */}
                  {allPending && isActive && (
                    <div className={styles.globalPrepBar}>
                      <div className={styles.globalPrepProgress} />
                      <span className={styles.globalPrepText}>⚙️ Preparing for distribution...</span>
                    </div>
                  )}
                  
                  <div className={styles.cardHeader} style={allPending && isActive ? { paddingTop: '1.75rem' } : {}}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className={styles.postTitle}>
                        {isActive && <span className={styles.processingDot} />}
                        {post.title}
                      </h3>
                      {post.description && (
                        <p className={styles.postDescription}>{post.description}</p>
                      )}
                    </div>
                    <div className={styles.metaBadges}>
                      <span className={`${styles.formatBadge} ${post.videoFormat === 'short' ? styles.formatShort : styles.formatLong}`}>
                        {post.videoFormat === 'short' ? '⚡ Short' : '🎬 Long'}
                      </span>
                      <span className={styles.timestamp}>
                        {formatRelativeDate(post.createdAt)}
                      </span>
                      
                      {isActive && (
                        <button 
                          className={styles.stopAllButton}
                          onClick={(e) => handleCancelAll(e, post.id)}
                          title="Stop All active distributions for this post"
                        >
                          ⏹️ STOP ALL
                        </button>
                      )}

                      {(() => {
                        const postCreatedAt = new Date(post.createdAt).getTime();
                        const isPostStale = post.platforms.some(p => p.status === 'pending') && (Date.now() - postCreatedAt > 60 * 1000) && !post.stagedFileId;
                        if (isPostStale) {
                          return (
                            <button 
                              className={styles.resumeButton}
                              onClick={() => handleInPlaceResume(post)}
                              disabled={activeResumingId === post.id}
                              style={{ marginLeft: '1rem' }}
                            >
                              {activeResumingId === post.id ? '⌛ Processing' : '🚀 Manual Resume'}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  {activeResumingId === post.id && (
                    <div className={styles.inPlaceUploadProgress}>
                      <div className={styles.progressBarWrapper}>
                        <div 
                          className={styles.progressBarFill} 
                          style={{ width: inPlaceStatus?.includes('%') ? inPlaceStatus.match(/(\d+)%/)?.[1] + '%' : '100%' }}
                        />
                      </div>
                      <p className={styles.progressBarStatus}>{inPlaceStatus}</p>
                    </div>
                  )}

                  <div className={styles.platformRow}>
                    {post.platforms.map(p => renderPlatformPill(p, post))}
                  </div>
                </GlassCard>
              </div>
            );
          })}

          {nextCursor && (
            <button
              className={styles.loadMoreButton}
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          )}
        </div>
      )}

      {/* FLOATING HUD (Ported from Dashboard for physical upload tracking) */}
      {activeResumingId && inPlaceStatus && (typeof inPlaceStatus === 'string' ? !inPlaceStatus.includes('All done') : true) && (
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
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'white', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inPlaceStatus}</div>
            </div>
          </div>
          <button 
            type="button" 
            aria-label="Stop all active uploads"
            onClick={() => {
               // Logic to stop in-place upload
               setActiveResumingId(null);
               setInPlaceStatus(null);
            }} 
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
    </div>
  );
}
