import React from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { AIStyleSelector } from './AIStyleSelector';
import { PlatformSelection } from './PlatformSelection';

import { StyleMode, AITier, AI_TIERS } from '@/lib/core/constants';
import { extractVideoFrames } from '@/lib/utils/video-analysis';
import { Account, PlatformPreference } from '@/lib/core/types';

interface UploadFormProps {
  isUploading: boolean;
  uploadStatus: string | null;
  accounts: Account[];
  preferences: PlatformPreference[];
  selectedAccountIds: string[];
  successfulAccountIds: string[];
  platformStatuses: Record<string, 'pending' | 'uploading' | 'processing' | 'success' | 'failed' | 'cancelled'>;
  contentMode: StyleMode;
  aiTier: AITier;
  videoFormat: 'short' | 'long';
  videoDuration: number | null;
  draftFileName: string | null;
  onVisualScan: (file: File) => Promise<void>;
  onTierChange: (tier: AITier) => void;
  onModeChange: (mode: StyleMode) => void;
  onFormatChange: (format: 'short' | 'long') => void;
  onToggleAccount: (id: string) => void;
  onAbort: (id: string) => void;
  onAbortAll: () => void;
  onFileChange: (file: File) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isScheduled: boolean;
  scheduledAt: string;
  onSchedulingChange: (isScheduled: boolean, date: string) => void;
  hasFailures?: boolean;
  platformErrors?: Record<string, string>;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  isUploading,
  uploadStatus,
  accounts,
  preferences,
  selectedAccountIds,
  successfulAccountIds,
  platformStatuses,
  contentMode,
  aiTier,
  videoFormat,
  videoDuration,
  draftFileName,
  onVisualScan,
  onTierChange,
  onModeChange,
  onFormatChange,
  onToggleAccount,
  onAbort,
  onAbortAll,
  onFileChange,
  onSubmit,
  isScheduled,
  scheduledAt,
  onSchedulingChange,
  hasFailures = false,
  platformErrors = {},
}) => {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isScanning, setIsScanning] = React.useState(false);

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };
  
  // Sync with localStorage on mount and when changed externally (Resume Flow)
  React.useEffect(() => {
    const savedTitle = localStorage.getItem('SS_DRAFT_TITLE') || '';
    const savedDesc = localStorage.getItem('SS_DRAFT_DESC') || '';
    setTitle(savedTitle);
    setDescription(savedDesc);
  }, []);

  const [titleUndo, setTitleUndo] = React.useState<string | null>(null);
  const [descUndo, setDescUndo] = React.useState<string | null>(null);

  const handleClearTitle = () => {
    setTitleUndo(title);
    setTitle('');
    localStorage.setItem('SS_DRAFT_TITLE', '');
    setTimeout(() => setTitleUndo(null), 5000);
  };

  const handleUndoTitle = () => {
    if (titleUndo) {
      setTitle(titleUndo);
      localStorage.setItem('SS_DRAFT_TITLE', titleUndo);
      setTitleUndo(null);
    }
  };

  const handleClearDesc = () => {
    setDescUndo(description);
    setDescription('');
    localStorage.setItem('SS_DRAFT_DESC', '');
    setTimeout(() => setDescUndo(null), 5000);
  };

  const handleUndoDesc = () => {
    if (descUndo) {
      setDescription(descUndo);
      localStorage.setItem('SS_DRAFT_DESC', descUndo);
      setDescUndo(null);
    }
  };

  const isComplete = uploadStatus?.includes('Distribution Complete');

  return (
    <GlassCard id="create-post-section" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upload & Automate</h2>
      
      {uploadStatus && isComplete && (
        <div style={{ marginBottom: '1.5rem' }}>
          <Link 
            href="/history" 
            target="_blank"
            rel="noopener noreferrer"
            style={{ 
              display: 'block',
              textDecoration: 'none', 
              padding: '1rem',
              borderRadius: '0.75rem',
              background: 'hsla(var(--primary) / 0.1)',
              border: '1px solid hsla(var(--primary) / 0.3)',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.background = 'hsla(var(--primary) / 0.15)';
              e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.background = 'hsla(var(--primary) / 0.1)';
              e.currentTarget.style.borderColor = 'hsla(var(--primary) / 0.3)';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'hsl(var(--foreground))', margin: 0 }}>
                <span style={{ fontSize: '1.1rem' }}>✨</span>
                <span>{uploadStatus}</span>
              </p>
              <div style={{ 
                background: 'hsl(var(--primary))', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '99px', 
                fontSize: '0.7rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                View History <span>→</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      <form 
        aria-label="Upload Form"
        onSubmit={onSubmit} 
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="file-upload" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Video File</label>
          {draftFileName && (
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
              background: 'hsla(142, 71%, 45%, 0.1)', border: '1px solid hsla(142, 71%, 45%, 0.3)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem' }}>✅</span>
                <span style={{ fontSize: '0.8rem', color: 'hsl(142, 71%, 45%)' }}>
                  <strong>{draftFileName}</strong> attached
                </span>
              </div>
              <div style={{ 
                background: videoFormat === 'short' ? 'hsla(var(--primary) / 0.2)' : 'hsla(var(--muted) / 0.4)',
                color: videoFormat === 'short' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                border: `1px solid ${videoFormat === 'short' ? 'hsla(var(--primary) / 0.3)' : 'hsla(var(--border) / 0.5)'}`
              }}>
                {videoFormat === 'short' ? '⚡ Short-Form' : '📺 Long-Form'}
                {videoDuration !== null && (
                  <span style={{ marginLeft: '4px', opacity: 0.8, fontWeight: 500 }}>
                    • {formatDuration(videoDuration)}
                  </span>
                )}
              </div>
            </div>
          )}
          <input 
            id="file-upload"
            type="file" 
            name="file" 
            accept="video/*" 
            required={!draftFileName}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChange(file);
            }}
            style={{ 
              background: 'hsla(var(--muted) / 0.3)', 
              padding: '1rem', 
              borderRadius: '0.75rem', 
              border: '1px dashed hsla(var(--border) / 0.5)',
              cursor: 'pointer'
            }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>AI Strategy</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {AI_TIERS.map(tier => (
              <button
                key={tier}
                type="button"
                onClick={() => onTierChange(tier)}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  border: `2px solid ${aiTier === tier ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
                  background: aiTier === tier ? 'hsla(var(--primary) / 0.2)' : 'hsla(var(--muted) / 0.3)',
                  color: aiTier === tier ? 'white' : 'hsl(var(--muted-foreground))',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: aiTier === tier ? 700 : 500,
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: aiTier === tier ? '0 0 15px hsla(var(--primary) / 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{tier === 'Manual' ? '✍️' : tier === 'Enrich' ? '🪄' : '🤖'}</span>
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="video-title" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                {aiTier === 'Generate' ? 'Video Prompt' : 'Video Title'}
              </label>
              {aiTier === 'Generate' && !isUploading && (
                <button
                  type="button"
                  onClick={async () => {
                    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
                    const file = fileInput?.files?.[0];
                    if (!file && !draftFileName) {
                      alert("Please select a video file first to scan.");
                      return;
                    }

                    try {
                      let targetFile: File | null | undefined = file;
                      if (!targetFile && draftFileName) {
                         const { getDraftFile } = await import('@/lib/upload/file-store');
                         targetFile = await getDraftFile();
                      }
                      
                      if (!targetFile) throw new Error("Video file not found. Please re-select the file.");
                      await onVisualScan(targetFile);
                    } catch (err: any) {
                      console.error("Visual Scan failed:", err);
                      alert(err.message || "Failed to scan video.");
                    }
                  }}
                  style={{
                    background: 'hsla(var(--primary) / 0.1)',
                    border: '1px solid hsla(var(--primary) / 0.3)',
                    color: 'hsl(var(--primary))',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span>🪄</span> Auto-Scan Video
                </button>
              )}
              {isUploading && uploadStatus?.includes('Scanning') && (
                <span style={{ fontSize: '0.7rem', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="animate-pulse">✨</span> Scanning Content...
                </span>
              )}
            </div>
            {titleUndo && (
              <button 
                type="button" 
                onClick={handleUndoTitle}
                className="fade-in"
                style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>↩️</span> Undo Clear
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input 
              id="video-title"
              type="text" 
              name="title" 
              placeholder={aiTier === 'Generate' ? "Describe what you want the video to be about..." : "Enter a catchy title..."}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                localStorage.setItem('SS_DRAFT_TITLE', e.target.value);
              }}
              required
              style={{ 
                background: 'hsla(var(--muted) / 0.3)', 
                padding: '0.75rem 2.5rem 0.75rem 1rem', 
                borderRadius: '0.75rem', 
                border: '1px solid hsla(var(--border) / 0.5)',
                color: 'white',
                outline: 'none',
                width: '100%'
              }} 
            />
            {title && (
              <button 
                type="button"
                onClick={handleClearTitle}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'hsla(var(--foreground) / 0.1)',
                  border: 'none',
                  color: 'hsl(var(--muted-foreground))',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'hsla(var(--foreground) / 0.2)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'hsla(var(--foreground) / 0.1)'; e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="video-description" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              {aiTier === 'Generate' ? 'Additional Context' : 'Description'}
            </label>
            {descUndo && (
              <button 
                type="button" 
                onClick={handleUndoDesc}
                className="fade-in"
                style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>↩️</span> Undo Clear
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <textarea 
              id="video-description"
              name="description" 
              placeholder={aiTier === 'Generate' ? "Add any specific keywords, links, or context..." : "Tell your viewers about the video..."}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                localStorage.setItem('SS_DRAFT_DESC', e.target.value);
              }}
              rows={3}
              style={{ 
                background: 'hsla(var(--muted) / 0.3)', 
                padding: '0.75rem 2.5rem 0.75rem 1rem', 
                borderRadius: '0.75rem', 
                border: '1px solid hsla(var(--border) / 0.5)',
                color: 'white',
                outline: 'none',
                resize: 'none',
                width: '100%'
              }} 
            />
            {description && (
              <button 
                type="button"
                onClick={handleClearDesc}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '0.75rem',
                  background: 'hsla(var(--foreground) / 0.1)',
                  border: 'none',
                  color: 'hsl(var(--muted-foreground))',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'hsla(var(--foreground) / 0.2)'; e.currentTarget.style.color = 'white'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'hsla(var(--foreground) / 0.1)'; e.currentTarget.style.color = 'hsl(var(--muted-foreground))'; }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {aiTier !== 'Manual' && <AIStyleSelector contentMode={contentMode} onModeChange={onModeChange} />}
        
        {aiTier !== 'Manual' && (
          <div style={{ 
            padding: '0.75rem', 
            borderRadius: '0.75rem', 
            background: 'hsla(var(--primary) / 0.05)', 
            border: '1px solid hsla(var(--primary) / 0.15)',
            marginTop: '0.25rem'
          }}>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✨</span>
              <span><strong>AI Strategy:</strong> We will {aiTier === 'Enrich' ? 'refine your draft' : 'generate content'} using the <strong>{contentMode}</strong> style. You will be prompted to <strong>Review Strategy</strong> before we post.</span>
            </p>
          </div>
        )}
        
        {videoFormat === 'long' && selectedAccountIds.some(id => id.startsWith('instagram:')) && (
           <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'hsla(var(--primary)/0.1)', border: '1px solid hsla(var(--primary)/0.3)', marginBottom: '0.5rem' }}>
             <p style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))' }}>
               ⚠️ <strong>Note:</strong> Instagram Business API strictly requires vertical Reels. For Long-form content, we will post to your connected Facebook Pages and other platforms, but Instagram uploads may be restricted or formatted as Reels.
             </p>
           </div>
        )}

        <PlatformSelection 
          accounts={accounts} 
          preferences={preferences}
          selectedAccountIds={selectedAccountIds} 
          successfulAccountIds={successfulAccountIds}
          platformStatuses={platformStatuses}
          platformErrors={platformErrors}
          onToggleAccount={onToggleAccount} 
          onAbort={onAbort}
        />

        <div style={{ 
          padding: '1rem', 
          borderRadius: '0.75rem', 
          background: 'hsla(var(--muted)/0.3)', 
          border: '1px solid hsla(var(--border)/0.3)' 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={isScheduled}
                onChange={(e) => onSchedulingChange(e.target.checked, scheduledAt)}
                style={{ marginRight: '0.5rem', width: '1.1rem', height: '1.1rem' }}
              />
              Schedule for later
            </label>
            {isScheduled && (
              <div 
                style={{ 
                  position: 'relative', 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  width: '100%',
                  maxWidth: '300px'
                }}
                onClick={(e) => {
                  const input = e.currentTarget.querySelector('input');
                  if (input && 'showPicker' in input) (input as any).showPicker();
                }}
              >
                <span style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none', fontSize: '1rem' }}>📅</span>
                <input 
                  type="datetime-local" 
                  value={scheduledAt}
                  onChange={(e) => onSchedulingChange(true, e.target.value)}
                  min={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                  required
                  style={{ 
                    background: 'hsla(var(--background)/0.5)', 
                    border: '1px solid hsla(var(--border)/0.5)',
                    borderRadius: '0.5rem',
                    padding: '0.5rem 0.75rem 0.5rem 2.5rem',
                    color: 'white',
                    fontSize: '0.85rem',
                    outline: 'none',
                    width: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isUploading}
          style={{ 
            background: 'hsl(var(--primary))', 
            color: 'white', 
            border: 'none', 
            padding: '1rem', 
            borderRadius: '0.75rem', 
            fontWeight: 700,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            marginTop: '0.5rem',
            transition: 'all 0.2s',
            boxShadow: '0 4px 12px hsla(var(--primary) / 0.2)',
            fontSize: '1rem'
          }}
        >
          {isUploading 
            ? '📤 Processing...' 
            : (() => {
                const failedOrCancelled = Object.entries(platformStatuses)
                  .filter(([id, status]) => (status === 'failed' || status === 'cancelled') && selectedAccountIds.includes(id));
                
                if (failedOrCancelled.length > 0) {
                  return '🚀 Post to Remaining Channels';
                }
                return aiTier !== 'Manual' 
                  ? (isScheduled ? '✨ Review AI Strategy & Schedule' : '✨ Review AI Strategy') 
                  : (isScheduled ? '📅 Schedule Post' : '🚀 Post Video');
              })()
          }
        </button>

        {aiTier !== 'Manual' && !isUploading && (
          <button
            type="button"
            onClick={(e) => {
              const form = (e.currentTarget.closest('form') as HTMLFormElement);
              const hidden = document.createElement('input');
              hidden.type = 'hidden';
              hidden.name = 'skipReview';
              hidden.value = 'true';
              form.appendChild(hidden);
              form.requestSubmit();
              hidden.remove();
            }}
            style={{
              background: 'transparent',
              border: '1px solid hsla(var(--border)/0.5)',
              color: 'hsl(var(--muted-foreground))',
              padding: '0.75rem',
              borderRadius: '0.75rem',
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {isScheduled ? '🚀 Skip Review & Schedule Directly' : '🚀 Skip Review & Post Directly'}
          </button>
        )}

      </form>
    </GlassCard>
  );
};
