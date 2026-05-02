'use client';

/**
 * HISTORY PAGE
 * Displays a list of all past uploads and their platform links.
 * Supports:
 * - Single platform retries (Cloud retry)
 * - In-place physical upload resumption (Chunk retry)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { stageVideoFile, distributeToPlatforms } from '@/lib/upload/upload-utils';
import { getDraftFile } from '@/lib/upload/file-store';
import { useAccounts } from '@/hooks/useAccounts';
import { usePolling } from '@/hooks/usePolling';
import styles from './history.module.css';

interface PlatformResult {
  id: string;
  platform: string;
  accountName: string | null;
  platformPostId: string | null;
  permalink: string | null;
  status: string;
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
  const { accounts } = useAccounts();

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
    post.platforms.some(p => p.status === 'pending' || p.status === 'retrying')
  );

  usePolling({
    callback: async () => {
      const data = await fetchHistory();
      setPosts(data.data || []);
    },
    interval: hasActivePosts ? 5000 : 60000,
    isActive: posts.length > 0
  });

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchHistory(nextCursor);
    setPosts(prev => [...prev, ...(data.data || [])]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  };

  const [retryingIds, setRetryingIds] = useState<string[]>([]);

  const handleRetry = async (e: React.MouseEvent, p: PlatformResult) => {
    e.preventDefault();
    e.stopPropagation();
    if (retryingIds.includes(p.id)) return;

    setRetryingIds(prev => [...prev, p.id]);
    try {
      const { retryUploadAction } = await import('@/app/actions/history');
      const res = await retryUploadAction(p.id);
      if (res.success) {
        // Refresh history to see updating status
        const data = await fetchHistory();
        setPosts(data.data || []);
      } else {
        alert(`Retry failed: ${res.error}`);
      }
    } catch (err: any) {
      alert(`Retry error: ${err.message}`);
    } finally {
      setRetryingIds(prev => prev.filter(id => id !== p.id));
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
    // Resolve platform meta (Support for 'google' and legacy CUIDs)
    let resolvedPlatform = p.platform;
    if (resolvedPlatform === 'google') resolvedPlatform = 'youtube';
    
    // If it's a CUID (long string not in meta), try to find a match or use default
    if (!PLATFORM_META[resolvedPlatform] && resolvedPlatform.length > 15) {
      // Heuristic: If we don't know it, it might be an old record with a CUID
      // For this user's specific case, we'll try to show 'YouTube' as a safe default for unknown IDs
      resolvedPlatform = 'youtube';
    }

    const meta = PLATFORM_META[resolvedPlatform] || {
      icon: '🔗',
      label: p.platform.length > 15 ? 'External' : p.platform,
      className: styles.platformDefault,
    };

    const isFailed = p.status === 'failed';
    const isRetrying = p.status === 'retrying' || retryingIds.includes(p.id);
    const isPending = p.status === 'pending';
    
    // Stale check for the WHOLE POST: if pending and older than 20s (unlikely to still be active in same session)
    const postCreatedAt = new Date(post.createdAt).getTime();
    const isPostStale = post.platforms.some(p => p.status === 'pending') && (Date.now() - postCreatedAt > 20 * 1000) && !post.stagedFileId;
    
    const hasLink = !isFailed && !isRetrying && !isPending && !isPostStale && p.permalink;

    const pillClasses = [
      styles.platformPill,
      meta.className,
      isFailed ? styles.platformPillFailed : 
      isRetrying ? styles.platformPillRetrying : 
      (isPending && !isPostStale) ? styles.platformPillPending :
      isPostStale ? styles.platformPillStale :
      hasLink ? styles.platformPillSuccess : styles.platformPillNoLink,
      isFailed ? styles.failedTooltip : '',
    ].filter(Boolean).join(' ');

    const content = (
      <>
        <span className={styles.pillIcon}>
          {isRetrying || (isPending && !isPostStale) ? '⏳' : isPostStale ? '⚠️' : meta.icon}
        </span>
        <span className={styles.pillLabel}>
          {isPostStale ? `${meta.label} (Incomplete)` : meta.label}
        </span>
        {isFailed && (
          <button 
            className={styles.retryButton} 
            onClick={(e) => handleRetry(e, p)}
            title="Retry Upload"
          >
            🔄
          </button>
        )}
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

    return (
      <span
        key={p.id}
        className={pillClasses}
        data-error={isFailed ? p.errorMessage || 'Upload failed' : undefined}
        title={isFailed ? (p.errorMessage || 'Upload failed') : isRetrying ? 'Retrying upload...' : `Posted to ${meta.label}`}
      >
        {content}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className={styles.historyPage}>
        <div className={styles.loading}>Loading post history...</div>
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
          A timeline of all your published content with direct links
        </p>
        {/* Hidden file input for file selection during in-place resumption */}
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="video/*" />
      </div>

      {posts.length === 0 ? (
        <GlassCard>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📜</div>
            <h3 className={styles.emptyTitle}>No posts yet</h3>
            <p className={styles.emptyDescription}>
              When you publish content from the dashboard, it will appear here with direct links to each platform.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className={styles.timeline}>
          {posts.map((post) => {
            const successCount = post.platforms.filter(p => p.status === 'success').length;
            const failedCount = post.platforms.filter(p => p.status === 'failed').length;

            return (
              <div key={post.id} className={`${styles.postCard} ${post.platforms.some(p => p.status === 'pending') ? styles.activePost : ''}`}>
                <div className={styles.timelineDot} />
                <GlassCard className={styles.cardInner}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.postTitle}>
                        {post.platforms.some(p => p.status === 'pending') && <span className={styles.processingDot} />}
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
                      {/* Post-level Resume Button if Stale */}
                      {(() => {
                        const postCreatedAt = new Date(post.createdAt).getTime();
                        const isPostStale = post.platforms.some(p => p.status === 'pending') && (Date.now() - postCreatedAt > 20 * 1000) && !post.stagedFileId;
                        if (isPostStale) {
                          return (
                            <button 
                              className={styles.resumeButton}
                              onClick={() => handleInPlaceResume(post)}
                              disabled={activeResumingId === post.id}
                              style={{ marginLeft: '1rem' }}
                            >
                              {activeResumingId === post.id ? '⌛ Processing' : '🚀 Resume Upload'}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  <div className={styles.platformRow}>
                    {post.platforms.map(p => renderPlatformPill(p, post))}
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
    </div>
  );
}
