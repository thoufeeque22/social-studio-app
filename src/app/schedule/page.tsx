'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from './schedule.module.css';
import { 
  updateScheduledPost, 
  deleteScheduledPost, 
  publishNowAction 
} from '@/app/actions/history';
import { usePolling } from '@/hooks/usePolling';
import { AIContentReview } from '@/components/dashboard/AIContentReview';
import { AIWriteResult } from '@/lib/utils/ai-writer';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import YouTubeIcon from '@mui/icons-material/YouTube';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InfoIcon from '@mui/icons-material/Info';
import ViewHeadlineIcon from '@mui/icons-material/ViewHeadline';

import { CalendarView } from '@/components/schedule/CalendarView';

interface PlatformResult {
  id: string;
  platform: string;
  accountId: string | null;
}

interface PostHistoryEntry {
  id: string;
  title: string;
  description: string | null;
  videoFormat: string;
  scheduledAt: string;
  createdAt: string;
  isPublished: boolean;
  stagedFileId: string | null;
  platforms: PlatformResult[];
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <YouTubeIcon sx={{ fontSize: 16, color: '#FF0000' }} />,
  instagram: <InstagramIcon sx={{ fontSize: 16, color: '#E4405F' }} />,
  facebook: <FacebookIcon sx={{ fontSize: 16, color: '#1877F2' }} />,
  tiktok: <MusicNoteIcon sx={{ fontSize: 16, color: '#000000' }} />
};

function ScheduleContent() {
  const searchParams = useSearchParams();
  const targetId = searchParams.get('id');
  
  const [posts, setPosts] = useState<PostHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<PostHistoryEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<Record<string, AIWriteResult>>({});
  const [isAILoading, setIsAILoading] = useState(false);
  const [viewMode, setViewMode] = useState<'timeline' | 'calendar'>('timeline');

  // Helper to format date for datetime-local input in LOCAL time
  const formatToLocalDatetime = (dateStr: string) => {
    const date = new Date(dateStr);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  };

  const fetchSchedule = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        published: viewMode === 'calendar' ? 'all' : 'false',
        _t: Date.now().toString()
      });
      
      // If we have a target ID or in calendar mode, increase limit
      if (targetId || viewMode === 'calendar') {
        params.set('limit', '100');
      }

      const res = await fetch(`/api/history?${params.toString()}`);
      const data = await res.json();
      setPosts(data.data || []);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, [targetId, viewMode]);

  // Determine if we need high-frequency polling
  const hasActivePosts = posts.some(p => {
    const scheduledTime = new Date(p.scheduledAt).getTime();
    const now = Date.now();
    // Active if in the past or within the next 30 seconds
    return scheduledTime <= now + 30000;
  });

  usePolling({
    callback: fetchSchedule,
    interval: hasActivePosts ? 5000 : 30000,
    isActive: posts.length > 0
  });

  useEffect(() => {
    fetchSchedule();
    
    // Listen for the same refresh event used on the dashboard
    globalThis.addEventListener('refresh-upcoming', fetchSchedule);
    
    return () => {
      globalThis.removeEventListener('refresh-upcoming', fetchSchedule);
    };
  }, [fetchSchedule]);

  // Handle Auto-Scroll and Highlight
  useEffect(() => {
    if (!isLoading && targetId && posts.length > 0) {
      const element = document.getElementById(`post-${targetId}`);
      if (element) {
        const timer = setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [isLoading, targetId, posts]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled post? The video file will be deleted.')) return;
    
    try {
      await deleteScheduledPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      globalThis.dispatchEvent(new CustomEvent('refresh-upcoming'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to delete: ${message}`);
    }
  };

  const handlePublishNow = async (id: string) => {
    if (!confirm('Publish this post immediately?')) return;
    
    try {
      await publishNowAction(id);
      // It will move to history automatically when worker picks it up
      // For now, we just remove it from the list or refresh
      setPosts(prev => prev.filter(p => p.id !== id));
      globalThis.dispatchEvent(new CustomEvent('refresh-upcoming'));
      alert('Post moved to publishing queue! Check History in a few moments.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Failed to publish: ${message}`);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingPost) return;

    setIsSaving(true);
    try {
      await updateScheduledPost(editingPost.id, {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        scheduledAt: formData.get('scheduledAt') as string,
      });
      setEditingPost(null);
      fetchSchedule();
      globalThis.dispatchEvent(new CustomEvent('refresh-upcoming'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Update failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAIBrainstorm = async () => {
    if (!editingPost) return;
    setIsAILoading(true);
    try {
      const pNames = editingPost.platforms.map(p => p.platform);
      
      const form = document.querySelector('form');
      const formData = form ? new FormData(form) : null;
      const currentTitle = formData?.get('title') as string || editingPost.title;
      const currentDesc = formData?.get('description') as string || editingPost.description || '';

      const { getMultiPlatformAIPreviews } = await import('@/app/actions/ai');
      const previews = await getMultiPlatformAIPreviews(currentTitle, currentDesc, 'Enrich', 'Smart', pNames);
      
      if (previews) {
        setAiPreviews(previews);
        setIsReviewing(true);
      }
    } catch (err) {
      alert('AI Brainstorm failed.');
      console.error(err);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleConfirmReview = async (finalContent: Record<string, AIWriteResult>) => {
    if (!editingPost?.stagedFileId) {
       alert("Error: Missing file reference. Cannot save platform-specific metadata.");
       return;
    }
    
    setIsSaving(true);
    try {
      const { saveStagedMetadata } = await import('@/app/actions/history');
      await saveStagedMetadata(editingPost.stagedFileId, finalContent);
      
      const firstPlatform = Object.keys(finalContent)[0];
      const newGlobalTitle = finalContent[firstPlatform]?.title || editingPost.title;
      
      await updateScheduledPost(editingPost.id, {
        title: newGlobalTitle,
      });

      setIsReviewing(false);
      setEditingPost(null);
      fetchSchedule();
      globalThis.dispatchEvent(new CustomEvent('refresh-upcoming'));
    } catch (err) {
      alert('Failed to save AI metadata sidecar');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.schedulePage}>
        <div className={styles.loading}>Loading scheduled posts...</div>
      </div>
    );
  }

  return (
    <div className={styles.schedulePage}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Scheduled Posts</h1>
          <div style={{ display: 'flex', background: 'hsla(var(--muted)/0.1)', padding: '4px', borderRadius: '10px', border: '1px solid hsla(var(--border)/0.4)' }}>
            <button 
              onClick={() => setViewMode('timeline')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'timeline' ? 'hsla(var(--primary)/0.15)' : 'transparent',
                color: viewMode === 'timeline' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <ViewHeadlineIcon sx={{ fontSize: 18 }} /> Timeline
            </button>
            <button 
              onClick={() => setViewMode('calendar')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '8px',
                border: 'none',
                background: viewMode === 'calendar' ? 'hsla(var(--primary)/0.15)' : 'transparent',
                color: viewMode === 'calendar' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <CalendarMonthIcon sx={{ fontSize: 18 }} /> Calendar
            </button>
          </div>
        </div>
        <p className={styles.subtitle}>
          Manage your upcoming content distribution
        </p>
      </div>

      {posts.length === 0 ? (
        <GlassCard>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <CalendarMonthIcon sx={{ fontSize: 48, opacity: 0.5 }} />
            </div>
            <h3 className={styles.emptyTitle}>No scheduled posts</h3>
            <p className={styles.emptyDescription}>
              Plan your content ahead of time from the Dashboard, and it will appear here.
            </p>
          </div>
        </GlassCard>
      ) : viewMode === 'calendar' ? (
        <CalendarView 
          posts={posts} 
          onEditPost={(post) => setEditingPost(post)} 
        />
      ) : (
        <div className={styles.timeline}>
          {posts.map((post) => (
            <div 
              key={post.id} 
              id={`post-${post.id}`}
              className={`${styles.postCard} ${targetId === post.id ? styles.highlightedPost : ''}`}
              data-testid={`schedule-post-${post.id}`}
            >
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
                      {new Date(post.scheduledAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>

                <div className={styles.platformRow}>
                  {post.platforms.map(p => (
                    <span key={post.id + p.platform} className={styles.platformPill}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {PLATFORM_ICONS[p.platform] || <InfoIcon sx={{ fontSize: 16 }} />}
                        {p.platform}
                      </span>
                    </span>
                  ))}
                </div>

                <div className={styles.actionRow}>
                  <button 
                    className={`${styles.actionButton} ${styles.primaryAction}`}
                    onClick={() => handlePublishNow(post.id)}
                  >
                    <RocketLaunchIcon sx={{ fontSize: 18 }} /> Publish Now
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.secondaryAction}`}
                    onClick={() => setEditingPost(post)}
                  >
                    <EditIcon sx={{ fontSize: 18 }} /> Edit
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.dangerAction}`}
                    onClick={() => handleDelete(post.id)}
                  >
                    <DeleteIcon sx={{ fontSize: 18 }} /> Cancel
                  </button>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      )}

      {/* AI Review Modal */}
      {isReviewing && editingPost && (
        <div className={styles.modalOverlay}>
          <div style={{ width: '100%', maxWidth: '800px' }}>
            <AIContentReview 
              previews={aiPreviews}
              onBack={() => setIsReviewing(false)}
              onConfirm={handleConfirmReview}
              isProcessing={isSaving}
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && !isReviewing && (
        <div className={styles.modalOverlay}>
          <GlassCard className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Edit Scheduled Post</h2>
            <form action={handleUpdate}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={handleAIBrainstorm}
                  disabled={isAILoading}
                  style={{
                    background: 'hsla(var(--primary)/0.1)',
                    color: 'hsl(var(--primary))',
                    border: '1px solid hsla(var(--primary)/0.3)',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                    opacity: isAILoading ? 0.7 : 1
                  }}
                >
                  <RocketLaunchIcon sx={{ fontSize: 18 }} /> {isAILoading ? 'Brainstorming...' : 'Brainstorm Strategies & Polish'}
                </button>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-title" className={styles.formLabel}>Title</label>
                <input 
                  id="edit-title"
                  name="title" 
                  defaultValue={editingPost.title} 
                  className={styles.formInput} 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-description" className={styles.formLabel}>Description</label>
                <textarea 
                  id="edit-description"
                  name="description" 
                  defaultValue={editingPost.description || ''} 
                  className={styles.formTextarea} 
                  rows={3} 
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="edit-scheduledAt" className={styles.formLabel}>Scheduled Date & Time</label>
                <label 
                  htmlFor="edit-scheduledAt"
                  className={styles.datePickerWrapper}
                >
                  <span className={styles.dateIcon}>
                    <CalendarMonthIcon sx={{ fontSize: 20 }} />
                  </span>
                  <input 
                    id="edit-scheduledAt"
                    type="datetime-local" 
                    name="scheduledAt" 
                    defaultValue={formatToLocalDatetime(editingPost.scheduledAt)} 
                    className={styles.formInputWithIcon} 
                    required 
                  />
                </label>
              </div>
              
              <div className={styles.formActions}>
                <button 
                  type="button" 
                  className={`${styles.actionButton} ${styles.secondaryAction}`}
                  onClick={() => setEditingPost(null)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`${styles.actionButton} ${styles.primaryAction}`}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className={styles.schedulePage}><div className={styles.loading}>Loading scheduled posts...</div></div>}>
      <ScheduleContent />
    </Suspense>
  );
}
