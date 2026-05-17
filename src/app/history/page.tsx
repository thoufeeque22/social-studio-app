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
import { useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import { SearchField } from '@/components/ui/SearchField';
import { stageVideoFile, distributeToPlatforms } from '@/lib/upload/upload-utils';
import { getDraftFile } from '@/lib/upload/file-store';
import { useAccounts } from '@/hooks/useAccounts';
import { usePolling } from '@/hooks/usePolling';
import { useUploadStatus } from '@/hooks/useUploadStatus';
import { AIWriteResult } from '@/lib/utils/ai-writer';
import { AITier, StyleMode } from '@/lib/core/constants';
import styles from './history.module.css';
import { z } from 'zod';

import HistoryIcon from '@mui/icons-material/History';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import ComputerIcon from '@mui/icons-material/Computer';
import SettingsIcon from '@mui/icons-material/Settings';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';

const PendingPostSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  videoFormat: z.string(),
  platforms: z.array(z.object({
    platform: z.string(),
    accountId: z.string().nullable(),
  })),
});

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

const PLATFORM_META: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  youtube:   { icon: <YouTubeIcon sx={{ fontSize: 18, color: '#FF0000' }} />, label: 'YouTube',   className: styles.platformYoutube },
  instagram: { icon: <InstagramIcon sx={{ fontSize: 18, color: '#E4405F' }} />, label: 'Instagram', className: styles.platformInstagram },
  facebook:  { icon: <FacebookIcon sx={{ fontSize: 18, color: '#1877F2' }} />, label: 'Facebook',  className: styles.platformFacebook },
  tiktok:    { icon: <MusicNoteIcon sx={{ fontSize: 18, color: '#000000' }} />, label: 'TikTok',    className: styles.platformTiktok },
  local:     { icon: <ComputerIcon sx={{ fontSize: 18, color: '#757575' }} />, label: 'Local Dev',  className: styles.platformLocal },
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

interface CockpitPost {
  title: string;
  description?: string;
  videoFormat: string;
  platforms: PlatformResult[];
  resumeHistoryId?: string;
  galleryFileId?: string;
  galleryFileName?: string;
  isScheduled?: boolean;
  scheduledAt?: string;
  aiTier?: string;
  skipReview?: boolean;
  contentMode?: StyleMode;
  customStyleText?: string;
  stagedFileId?: string;
  fileName?: string;
  historyId?: string;
}

function HistoryContent() {
  const [posts, setPosts] = useState<PostHistoryEntry[]>([]);
  const [pendingPost, setPendingPost] = useState<CockpitPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeResumingId, setActiveResumingId] = useState<string | null>(null);
  const [inPlaceStatus, setInPlaceStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cockpitStartedRef = useRef(false);
  const { accounts } = useAccounts();
  const searchParams = useSearchParams();
  const stagingStatus = useUploadStatus();
  
  useEffect(() => {
    const raw = localStorage.getItem('SS_PENDING_POST');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const result = PendingPostSchema.safeParse(parsed);
        if (result.success) {
          setPendingPost(parsed as CockpitPost);
        } else {
          console.error("Invalid pending post format", result.error);
          localStorage.removeItem('SS_PENDING_POST');
        }
      } catch (e) {
        console.error("Failed to parse pending post", e);
        localStorage.removeItem('SS_PENDING_POST');
      }
    }
  }, []);

  // Reconciliation: Clear pendingPost once it appears in the main list
  useEffect(() => {
    if (pendingPost && posts.length > 0) {
      const match = posts.find(p => 
        p.id === pendingPost.resumeHistoryId || 
        p.id === pendingPost.historyId ||
        (p.title === pendingPost.title && Math.abs(new Date(p.createdAt).getTime() - Date.now()) < 60000)
      );
      if (match) {
        setPendingPost(null);
        localStorage.removeItem('SS_PENDING_POST');
      }
    }
  }, [posts, pendingPost]);

  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);

  const fetchHistory = useCallback(async (cursor?: string, search?: string) => {
    const params = new URLSearchParams({ limit: '20' });
    if (cursor) params.set('cursor', cursor);
    if (search) params.set('search', search);
    params.set('_t', Date.now().toString()); // Cache buster

    const res = await fetch(`/api/history?${params.toString()}`);
    const data = await res.json();
    return data;
  }, []);

  const executeCockpitDistribution = useCallback(async (stagedFileId: string, fileName: string, historyId: string, post: CockpitPost, reviewedContent?: Record<string, AIWriteResult>) => {
    setInPlaceStatus("Launching Mission...");
    
    try {
      if (reviewedContent) {
        const { updatePlatformResultsAction } = await import('@/app/actions/history');
        await updatePlatformResultsAction(historyId, reviewedContent);
      }

      const selectedAccountIds = post.platforms.map((p: PlatformResult) => {
         const account = accounts.find(acc => acc.id === p.accountId);
         if (!account) {
           // Allow injected local-dev accounts to pass through
           if (p.accountId && String(p.accountId).startsWith('local-dev-')) {
             return p.accountId;
           }
           return null;
         }
         return (p.platform === 'facebook' || p.platform === 'instagram') ? `${p.platform}:${account.id}` : account.id;
      }).filter((id): id is string => id !== null);

      const fd = new FormData();
      fd.append('title', post.title || '');
      fd.append('description', post.description || '');

      setInPlaceStatus("Distributing to Platforms...");
      await distributeToPlatforms({
        stagedFileId,
        fileName,
        formData: fd,
        accounts,
        selectedAccountIds,
        contentMode: post.contentMode || 'Smart',
        videoFormat: post.videoFormat as "short" | "long",
        onStatusUpdate: setInPlaceStatus,
        historyId,
        reviewedContent,
        onAccountSuccess: async () => {
           const updated = await fetchHistory();
           setPosts(updated.data || []);
        }
      });

      setInPlaceStatus("Mission Accomplished!");
      // We no longer clear pendingPost or storage here; let the reconciliation effect handle it
      const data = await fetchHistory();
      setPosts(data.data || []);
      setTimeout(() => {
        setActiveResumingId(null);
        // Clear URL param
        window.history.replaceState({}, '', '/history');
      }, 2000);

    } catch (err: unknown) {
      setInPlaceStatus(` Distribution Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [accounts, fetchHistory]);

  const handleCockpitStart = useCallback(async () => {
    if (accounts.length === 0) {
      setInPlaceStatus("Waiting for platform accounts...");
      return;
    }
    
    const pending = localStorage.getItem('SS_PENDING_POST');
    if (!pending) {
      setInPlaceStatus("️ No pending post found in storage.");
      return;
    }
    
    const post = JSON.parse(pending) as CockpitPost;

    const hId = post.resumeHistoryId;
    if (hId) {
      setActiveResumingId(hId);
    } else {
      setActiveResumingId('cockpit-active');
    }

    setInPlaceStatus(" Synchronizing Activity Hub...");
    // REFRESH LIST TO SHOW THE NEW ROW
    try {
      const freshData = await fetchHistory();
      setPosts(freshData.data || []);
    } catch (e) { console.error("Initial list refresh failed", e); }
    
    try {
      setInPlaceStatus(" Accessing local video storage...");
      let stagedFileId = post.galleryFileId;
      let fileName = post.galleryFileName || '';
      let historyId = post.resumeHistoryId || '';

      // 1. Stage Physical File if needed
      if (!stagedFileId) {
        setInPlaceStatus(" Searching for draft file...");
        const file = await getDraftFile();
        if (!file) throw new Error("Video file not found in browser. Please re-select it on the dashboard.");
        
        setInPlaceStatus(` Initializing upload for ${file.name}...`);
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
          platforms: post.platforms.map(p => ({
            platform: p.platform,
            accountId: p.accountId || ''
          })),
          resumeHistoryId: post.resumeHistoryId
        });
        stagedFileId = stageResult.stagedFileId;
        fileName = stageResult.fileName;
        historyId = stageResult.historyId;
      }

      // 2. AI Generation if needed (Auto-Pilot)
      let reviewedContentToPass: Record<string, AIWriteResult> | undefined = undefined;
      if (post.aiTier !== 'Manual' && post.skipReview) {
        setInPlaceStatus(" Generating AI Strategy...");
        const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
        const targetPlatformNames = post.platforms.map((p: PlatformResult) => p.platform);
        
        const previews = await getMultiPlatformAIPreviews(
          post.title, 
          post.description || '', 
          post.aiTier as AITier, 
          post.contentMode || 'Smart', 
          targetPlatformNames, 
          [], 
          post.customStyleText
        );
        
        const { updatePlatformResultsAction } = await import('@/app/actions/history');
        await updatePlatformResultsAction(historyId, previews);
        reviewedContentToPass = previews;
      }

      // 3. Final Distribution
      await executeCockpitDistribution(stagedFileId, fileName, historyId, post, reviewedContentToPass);

    } catch (err: unknown) {
      setInPlaceStatus(` Cockpit Error: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => {
        setActiveResumingId(null);
      }, 5000);
    }
  }, [accounts, fetchHistory, executeCockpitDistribution]);

  useEffect(() => {
    const url = new URL(globalThis.window?.location.href || '');
    const action = url.searchParams.get('action');
    if (action === 'distribute' && !cockpitStartedRef.current && accounts.length > 0) {
      cockpitStartedRef.current = true;
      handleCockpitStart();
    }
  }, [accounts, handleCockpitStart]);

  // Initial load & search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      // Don't show global loading for background updates if we already have posts
      if (posts.length === 0) setIsLoading(true);
      
      fetchHistory(undefined, searchQuery).then(data => {
        setPosts(data.data || []);
        setNextCursor(data.nextCursor);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
    }, searchQuery ? 400 : 0); // Only debounce if searching

    return () => clearTimeout(timer);
  }, [searchQuery, fetchHistory, posts.length]);

  const hasActivePosts = posts.some(post => 
    post.platforms.some(p => ['pending', 'uploading', 'processing', 'retrying'].includes(p.status))
  );

  usePolling({
    callback: async () => {
      const data = await fetchHistory(undefined, searchQuery);
      setPosts(data.data || []);
    },
    interval: hasActivePosts ? 5000 : 15000,
    isActive: posts.length > 0
  });

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const data = await fetchHistory(nextCursor, searchQuery);
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
    } catch (err: unknown) {
      alert(`Retry error: ${err instanceof Error ? err.message : String(err)}`);
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
    } catch (err: unknown) {
      console.error("Cancel error:", err);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== resultId));
    }
  };

  const handleCancelAll = async (e: React.MouseEvent, historyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 1. Signal ABORT to other tabs IMMEDIATELY (Immediate Feedback)
    if (globalThis.localStorage) {
      const staging = localStorage.getItem('SS_STAGING_STATUS');
      if (staging) {
        try {
          const { historyId: stagedId } = JSON.parse(staging);
          if (stagedId === historyId) {
            localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({
              historyId,
              active: false,
              status: 'Stopped by user',
              timestamp: Date.now()
            }));
          }
        } catch (err) {
          console.error("Failed to parse staging status for abort", err);
        }
      }
    }

    setActiveResumingId(null);
    setInPlaceStatus(null);
    
    try {
      const { cancelAllUploadsAction } = await import('@/app/actions/history');
      await cancelAllUploadsAction(historyId);
      
      const data = await fetchHistory();
      setPosts(data.data || []);

      // Actually remove after a short delay to let other tabs see it
      setTimeout(() => {
        if (localStorage.getItem('SS_STAGING_STATUS')) {
          try {
            const current = JSON.parse(localStorage.getItem('SS_STAGING_STATUS')!);
            if (current.historyId === historyId && current.active === false) {
              localStorage.removeItem('SS_STAGING_STATUS');
            }
          } catch {
             localStorage.removeItem('SS_STAGING_STATUS');
          }
        }
      }, 1000);
      setPosts(data.data || []);
    } catch (err: unknown) {
      console.error("Cancel All error:", err);
    }
  };

  const handleInPlaceResume = async (post: PostHistoryEntry) => {
    setActiveResumingId(post.id);
    setInPlaceStatus(" Checking browser storage...");
    
    try {
      const file = await getDraftFile();
      
      if (!file) {
        setInPlaceStatus(" Please select the video file to resume...");
        if (fileInputRef.current) {
          fileInputRef.current.onchange = (e: Event) => {
             const target = e.target as HTMLInputElement;
             const selected = target.files?.[0];
             if (selected) executePipeline(post, selected);
          };
          fileInputRef.current.click();
        }
        return;
      }
      
      await executePipeline(post, file);
    } catch (err: unknown) {
      setInPlaceStatus(` Error: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActiveResumingId(null), 3000);
    }
  };

  const executePipeline = async (post: PostHistoryEntry, file: File) => {
    setInPlaceStatus(" Starting resumption...");
    try {
      const { stagedFileId, fileName, historyId } = await stageVideoFile({
        file,
        onStatusUpdate: setInPlaceStatus,
        metadata: { title: post.title, description: post.description || undefined, videoFormat: post.videoFormat },
        platforms: post.platforms.map(p => ({ 
          platform: p.platform, 
          accountId: p.accountId || accounts.find(acc => (acc.provider === 'google' ? 'youtube' : acc.provider) === p.platform)?.id || ''
        })).filter(p => p.accountId !== '') as { platform: string; accountId: string }[],
        resumeHistoryId: post.id
      });
      
      const selectedAccountIds = post.platforms.map(p => {
        const accountId = p.accountId || accounts.find(acc => (acc.provider === 'google' ? 'youtube' : acc.provider) === p.platform)?.id;
        if (!accountId) return null;
        return (p.platform === 'facebook' || p.platform === 'instagram') ? `${p.platform}:${accountId}` : accountId;
      }).filter((id): id is string => id !== null);

      await distributeToPlatforms({
        stagedFileId,
        fileName,
        formData: new FormData(), 
        accounts,
        selectedAccountIds,
        contentMode: 'Smart',
        videoFormat: post.videoFormat as "short" | "long",
        onStatusUpdate: setInPlaceStatus,
        historyId,
        onAccountSuccess: async () => {
           const updated = await fetchHistory();
           setPosts(updated.data || []);
        }
      });
      
      setInPlaceStatus(" All done!");
      const data = await fetchHistory();
      setPosts(data.data || []);
      setTimeout(() => setActiveResumingId(null), 2000);
    } catch (err: unknown) {
      setInPlaceStatus(` Error: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => setActiveResumingId(null), 5000);
    }
  };


  const renderPlatformPill = (p: PlatformResult, post: PostHistoryEntry) => {
    const resolvedPlatform = p.platform.toLowerCase();
    
    // Support multi-local platforms (local1, local2, etc)
    const basePlatform = resolvedPlatform.startsWith('local') ? 'local' : 
                        (resolvedPlatform === 'google' ? 'youtube' : resolvedPlatform);

    const meta = PLATFORM_META[basePlatform] || {
      icon: '',
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
        <span className={styles.pillIcon} style={{ display: 'flex', alignItems: 'center' }}>
          {isRetrying ? <RefreshIcon className="animate-spin" sx={{ fontSize: 16 }} /> : 
           isUploading ? <RocketLaunchIcon sx={{ fontSize: 16 }} /> : 
           (isPending && !isPostStale) ? <HistoryIcon className="animate-pulse" sx={{ fontSize: 16 }} /> : 
           isPostStale ? <HistoryIcon sx={{ fontSize: 16, opacity: 0.5 }} /> : 
           isCancelled ? <StopIcon sx={{ fontSize: 16 }} /> : 
           meta.icon}
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
              <RefreshIcon sx={{ fontSize: 14 }} />
            </button>
          )}
          {isPending && !isPostStale && (
            <button 
              className={styles.pillActionButton} 
              onClick={(e) => handleCancelPlatform(e, p.id)}
              title="Stop Platform Upload"
              style={{ color: '#EF4444' }}
            >
              <StopIcon sx={{ fontSize: 14 }} />
            </button>
          )}
          {isCancelled && (
            <button 
              className={styles.pillActionButton} 
              onClick={(e) => handleRetry(e, p)}
              title="Resume Stopped Upload"
            >
              <PlayArrowIcon sx={{ fontSize: 14 }} />
            </button>
          )}
        </div>

        {hasLink && <span className={styles.pillLink}><ArrowOutwardIcon sx={{ fontSize: 12 }} /></span>}
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

  // Optimized Timeline: Merge pendingPost if not already in posts
  const reconciledPosts = [...posts];
  if (pendingPost && !posts.some(p => p.id === pendingPost.resumeHistoryId || p.id === pendingPost.historyId || (p.title === pendingPost.title && Math.abs(new Date(p.createdAt).getTime() - Date.now()) < 120000))) {
    reconciledPosts.unshift({
      id: pendingPost.resumeHistoryId || pendingPost.historyId || 'optimistic-pending',
      title: pendingPost.title,
      description: pendingPost.description || null,
      videoFormat: pendingPost.videoFormat,
      createdAt: new Date().toISOString(),
      stagedFileId: pendingPost.galleryFileId || null,
      platforms: (pendingPost.platforms || []).map((p, idx) => ({
        id: `optimistic-p-${idx}`,
        platform: p.platform,
        accountName: null,
        platformPostId: null,
        permalink: null,
        status: 'pending',
        progress: 0,
        errorMessage: null,
        accountId: p.accountId
      })),
      isOptimistic: true
    } as any);
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

      <SearchField 
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search history by title or description..."
      />

      {reconciledPosts.length === 0 ? (
        <GlassCard>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <HistoryIcon sx={{ fontSize: 48, opacity: 0.5 }} />
            </div>
            <h3 className={styles.emptyTitle}>{searchQuery ? 'No matching activity' : 'No activity yet'}</h3>
            <p className={styles.emptyDescription}>
              {searchQuery ? `We couldn't find any posts matching "${searchQuery}"` : 'Upload a video from the dashboard to see its distribution status here.'}
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className={styles.timeline}>
          {reconciledPosts.map((post) => {
            const isOptimistic = (post as any).isOptimistic;
            const isActive = post.platforms.some(p => ['pending', 'uploading', 'processing', 'retrying'].includes(p.status));
            const allPending = post.platforms.every(p => p.status === 'pending');
            const isActiveStaging = stagingStatus.active && stagingStatus.historyId === post.id;

            return (
              <div key={post.id} data-testid={`history-post-${post.id}`} className={`${styles.postCard} ${isActive || isActiveStaging || isOptimistic ? styles.activePost : ''}`}>
                <div className={styles.timelineDot} />
                <GlassCard className={styles.cardInner} style={{ position: 'relative', overflow: 'hidden', opacity: isOptimistic ? 0.7 : 1 }}>
                  {/* LIVE STAGING PROGRESS */}
                  {isActiveStaging && (
                    <div className={styles.globalPrepBar} data-testid="preparation-bar">
                      <div 
                        className={styles.globalPrepProgress} 
                        data-testid="preparation-progress"
                        style={{ width: `${stagingStatus.percent || 0}%`, transition: 'width 0.3s ease' }} 
                      />
                      <span className={styles.globalPrepText} data-testid="preparation-status">
                        <RocketLaunchIcon className="animate-pulse" sx={{ fontSize: 16 }} /> {stagingStatus.status}
                      </span>
                    </div>
                  )}

                  {/* GLOBAL PREPARATION BAR (Fallback) */}
                  {!isActiveStaging && allPending && (isActive || isOptimistic) && (
                    <div className={styles.globalPrepBar} data-testid={isOptimistic ? "ghost-card-bar" : undefined}>
                      <div className={styles.globalPrepProgress} />
                      <span className={styles.globalPrepText}>
                        <SettingsIcon className="animate-spin" sx={{ fontSize: 16 }} /> {isOptimistic ? 'Initializing...' : 'Preparing for distribution...'}
                      </span>
                    </div>
                  )}

                  <div className={styles.cardHeader} style={(allPending && (isActive || isOptimistic)) || isActiveStaging ? { paddingTop: '1.75rem' } : {}}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className={styles.postTitle}>
                        {(isActive || isActiveStaging || isOptimistic) && <span className={styles.processingDot} />}
                        {post.title} {isOptimistic && <span style={{ opacity: 0.6, fontSize: '0.8em' }}>(Initializing)</span>}
                      </h3>
                      {post.description && (
                        <p className={styles.postDescription}>{post.description}</p>
                      )}
                    </div>
                    {!isOptimistic && (
                      <div className={styles.metaBadges}>
                        <span className={`${styles.formatBadge} ${post.videoFormat === 'short' ? styles.formatShort : styles.formatLong}`}>
                          {post.videoFormat === 'short' ? ' Short' : ' Long'}
                        </span>
                        <span className={styles.timestamp}>
                          {formatRelativeDate(post.createdAt)}
                        </span>
                        
                        {(isActive || isActiveStaging) && (
                          <button 
                            className={styles.stopAllButton}
                            onClick={(e) => handleCancelAll(e, post.id)}
                            title="Stop All active distributions for this post"
                          >
                            <StopIcon sx={{ fontSize: 16 }} /> STOP ALL
                          </button>
                        )}

                        {(() => {
                          const postCreatedAt = new Date(post.createdAt).getTime();
                          const isPostStale = post.platforms.some(p => p.status === 'pending') && (Date.now() - postCreatedAt > 60 * 1000) && !post.stagedFileId;
                          if (isPostStale && !isActiveStaging) {
                            return (
                              <button 
                                className={styles.resumeButton}
                                onClick={() => handleInPlaceResume(post)}
                                disabled={activeResumingId === post.id}
                                style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                              >
                                {activeResumingId === post.id ? <HistoryIcon className="animate-pulse" sx={{ fontSize: 16 }} /> : <RocketLaunchIcon sx={{ fontSize: 16 }} />}
                                {activeResumingId === post.id ? 'Processing' : 'Manual Resume'}
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  <div className={styles.platformRow}>
                    {[...post.platforms]
                      .sort((a, b) => a.platform.localeCompare(b.platform))
                      .map(p => renderPlatformPill(p, post))}
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

export default function HistoryPage() {
  return (
    <React.Suspense fallback={<div className={styles.historyPage}><div className={styles.loading}>Loading Activity Hub...</div></div>}>
      <HistoryContent />
    </React.Suspense>
  );
}
