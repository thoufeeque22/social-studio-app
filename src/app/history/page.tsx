'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from './history.module.css';

interface PlatformResult {
  id: string;
  platform: string;
  accountName: string | null;
  platformPostId: string | null;
  permalink: string | null;
  status: string;
  errorMessage: string | null;
}

interface PostHistoryEntry {
  id: string;
  title: string;
  description: string | null;
  videoFormat: string;
  createdAt: string;
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

  const fetchHistory = useCallback(async (cursor?: string) => {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);

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

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchHistory(nextCursor);
    setPosts(prev => [...prev, ...(data.data || [])]);
    setNextCursor(data.nextCursor);
    setLoadingMore(false);
  };

  const renderPlatformPill = (p: PlatformResult) => {
    const meta = PLATFORM_META[p.platform] || {
      icon: '🔗',
      label: p.platform,
      className: styles.platformDefault,
    };

    const isFailed = p.status === 'failed';
    const hasLink = !isFailed && p.permalink;

    const pillClasses = [
      styles.platformPill,
      meta.className,
      isFailed ? styles.platformPillFailed : hasLink ? styles.platformPillSuccess : styles.platformPillNoLink,
      isFailed ? styles.failedTooltip : '',
    ].filter(Boolean).join(' ');

    const content = (
      <>
        <span className={styles.pillIcon}>{meta.icon}</span>
        <span className={styles.pillLabel}>{meta.label}</span>
        {isFailed && <span className={styles.failedBadge}>✕</span>}
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
        title={isFailed ? (p.errorMessage || 'Upload failed') : `Posted to ${meta.label}`}
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
          <h1 className={styles.title}>Post History</h1>
        </div>
        <p className={styles.subtitle}>
          A timeline of all your published content with direct links
        </p>
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
              <div key={post.id} className={styles.postCard}>
                <div className={styles.timelineDot} />
                <GlassCard className={styles.cardInner}>
                  <div className={styles.cardHeader}>
                    <div>
                      <h3 className={styles.postTitle}>{post.title}</h3>
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
                    </div>
                  </div>
                  <div className={styles.platformRow}>
                    {post.platforms.map(renderPlatformPill)}
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
    </div>
  );
}
