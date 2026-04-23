'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import styles from './schedule.module.css';
import { 
  updateScheduledPost, 
  deleteScheduledPost, 
  publishNowAction 
} from '@/app/actions/history';
import { usePolling } from '@/hooks/usePolling';
import { AIContentReview } from '@/components/dashboard/AIContentReview';

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
  stagedFileId: string | null;
  platforms: PlatformResult[];
}

export default function SchedulePage() {
  const [posts, setPosts] = useState<PostHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingPost, setEditingPost] = useState<PostHistoryEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<Record<string, any>>({});
  const [isAILoading, setIsAILoading] = useState(false);

  // Helper to format date for datetime-local input in LOCAL time
  const formatToLocalDatetime = (dateStr: string) => {
    const date = new Date(dateStr);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  };

  const fetchSchedule = useCallback(async () => {
    try {
      // Add a timestamp to bypass any browser/Next.js client-side caching
      const res = await fetch(`/api/history?published=false&_t=${Date.now()}`);
      const data = await res.json();
      setPosts(data.data || []);
    } catch (err) {
      console.error('Failed to fetch schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    window.addEventListener('refresh-upcoming', fetchSchedule);
    
    return () => {
      window.removeEventListener('refresh-upcoming', fetchSchedule);
    };
  }, [fetchSchedule]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled post? The video file will be deleted.')) return;
    
    try {
      await deleteScheduledPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      window.dispatchEvent(new CustomEvent('refresh-upcoming'));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handlePublishNow = async (id: string) => {
    if (!confirm('Publish this post immediately?')) return;
    
    try {
      await publishNowAction(id);
      // It will move to history automatically when worker picks it up
      // For now, we just remove it from the list or refresh
      setPosts(prev => prev.filter(p => p.id !== id));
      window.dispatchEvent(new CustomEvent('refresh-upcoming'));
      alert('Post moved to publishing queue! Check History in a few moments.');
    } catch (err: any) {
      alert(`Failed to publish: ${err.message}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingPost) return;

    setIsSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      await updateScheduledPost(editingPost.id, {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        scheduledAt: formData.get('scheduledAt') as string,
      });
      setEditingPost(null);
      fetchSchedule();
      window.dispatchEvent(new CustomEvent('refresh-upcoming'));
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
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
      const previews = await getMultiPlatformAIPreviews(currentTitle, currentDesc, 'Hook', pNames);
      
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

  const handleConfirmReview = async (finalContent: Record<string, any>) => {
    if (!editingPost || !editingPost.stagedFileId) {
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
      window.dispatchEvent(new CustomEvent('refresh-upcoming'));
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
        </div>
        <p className={styles.subtitle}>
          Manage your upcoming content distribution
        </p>
      </div>

      {posts.length === 0 ? (
        <GlassCard>
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📅</div>
            <h3 className={styles.emptyTitle}>No scheduled posts</h3>
            <p className={styles.emptyDescription}>
              Plan your content ahead of time from the Dashboard, and it will appear here.
            </p>
          </div>
        </GlassCard>
      ) : (
        <div className={styles.timeline}>
          {posts.map((post) => (
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
                      {p.platform === 'youtube' ? '📺' : p.platform === 'instagram' ? '📸' : p.platform === 'facebook' ? '👥' : '🎵'} {p.platform}
                    </span>
                  ))}
                </div>

                <div className={styles.actionRow}>
                  <button 
                    className={`${styles.actionButton} ${styles.primaryAction}`}
                    onClick={() => handlePublishNow(post.id)}
                  >
                    🚀 Publish Now
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.secondaryAction}`}
                    onClick={() => setEditingPost(post)}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    className={`${styles.actionButton} ${styles.dangerAction}`}
                    onClick={() => handleDelete(post.id)}
                  >
                    🗑️ Cancel
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
            <form onSubmit={handleUpdate}>
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
                  ✨ {isAILoading ? 'Brainstorming...' : 'Brainstorm Strategies & Polish'}
                </button>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Title</label>
                <input 
                  name="title" 
                  defaultValue={editingPost.title} 
                  className={styles.formInput} 
                  required 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea 
                  name="description" 
                  defaultValue={editingPost.description || ''} 
                  className={styles.formTextarea} 
                  rows={3} 
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Scheduled Date & Time</label>
                <div 
                  className={styles.datePickerWrapper}
                  onClick={(e) => {
                    const input = e.currentTarget.querySelector('input');
                    if (input && 'showPicker' in input) (input as any).showPicker();
                  }}
                >
                  <span className={styles.dateIcon}>📅</span>
                  <input 
                    type="datetime-local" 
                    name="scheduledAt" 
                    defaultValue={formatToLocalDatetime(editingPost.scheduledAt)} 
                    className={styles.formInputWithIcon} 
                    required 
                  />
                </div>
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
