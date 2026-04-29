import React from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { AIStyleSelector } from './AIStyleSelector';
import { PlatformSelection } from './PlatformSelection';
import { AITierSelector } from './AITierSelector';
import { VideoFileDisplay } from './VideoFileDisplay';
import { SchedulingSelector } from './SchedulingSelector';
import { useUploadForm } from '@/hooks/dashboard/useUploadForm';

import { StyleMode, AITier } from '@/lib/core/constants';
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
  onSubmit: (formData: FormData) => Promise<void>;
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
  const {
    title,
    description,
    titleUndo,
    descUndo,
    handleTitleChange,
    handleDescriptionChange,
    handleClearTitle,
    handleUndoTitle,
    handleClearDesc,
    handleUndoDesc
  } = useUploadForm();

  const isComplete = uploadStatus?.includes('Distribution Complete');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSubmit(formData);
  };

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
        onSubmit={handleSubmit} 
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="file-upload" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Video File</label>
          <VideoFileDisplay fileName={draftFileName} format={videoFormat} duration={videoDuration} />
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

        <AITierSelector selectedTier={aiTier} onChange={onTierChange} />

        {/* Title Input */}
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
                    const { getDraftFile } = await import('@/lib/upload/file-store');
                    const file = await getDraftFile();
                    if (!file) { alert("Please select a video file first."); return; }
                    await onVisualScan(file);
                  }}
                  style={{ background: 'hsla(var(--primary)/0.1)', border: '1px solid hsla(var(--primary)/0.3)', color: 'hsl(var(--primary))', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  🪄 Auto-Scan Video
                </button>
              )}
            </div>
            {titleUndo && (
              <button type="button" onClick={handleUndoTitle} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                ↩️ Undo Clear
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input 
              id="video-title"
              type="text" 
              name="title" 
              placeholder={aiTier === 'Generate' ? "Describe your video concept..." : "Catchy title..."}
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              required
              style={{ background: 'hsla(var(--muted) / 0.3)', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid hsla(var(--border) / 0.5)', color: 'white', width: '100%' }} 
            />
            {title && (
              <button type="button" onClick={handleClearTitle} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'hsla(var(--foreground)/0.1)', border: 'none', color: 'hsl(var(--muted-foreground))', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.7rem', cursor: 'pointer' }}>✕</button>
            )}
          </div>
        </div>

        {/* Description Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="video-description" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
              {aiTier === 'Generate' ? 'Context' : 'Description'}
            </label>
            {descUndo && (
              <button type="button" onClick={handleUndoDesc} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                ↩️ Undo Clear
              </button>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <textarea 
              id="video-description"
              name="description" 
              placeholder={aiTier === 'Generate' ? "Specific keywords or links..." : "Video description..."}
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={3}
              style={{ background: 'hsla(var(--muted) / 0.3)', padding: '0.75rem 2.5rem 0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid hsla(var(--border) / 0.5)', color: 'white', width: '100%', resize: 'none' }} 
            />
            {description && (
              <button type="button" onClick={handleClearDesc} style={{ position: 'absolute', right: '0.75rem', top: '0.75rem', background: 'hsla(var(--foreground)/0.1)', border: 'none', color: 'hsl(var(--muted-foreground))', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.7rem', cursor: 'pointer' }}>✕</button>
            )}
          </div>
        </div>

        {aiTier !== 'Manual' && <AIStyleSelector contentMode={contentMode} onModeChange={onModeChange} />}
        
        {aiTier !== 'Manual' && (
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'hsla(var(--primary)/0.05)', border: '1px solid hsla(var(--primary)/0.15)' }}>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✨</span>
              <span><strong>AI Strategy:</strong> {aiTier === 'Enrich' ? 'Refining draft' : 'Generating content'} in <strong>{contentMode}</strong> style.</span>
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

        <SchedulingSelector isScheduled={isScheduled} scheduledAt={scheduledAt} onChange={onSchedulingChange} />

        <button 
          type="submit" 
          disabled={isUploading}
          style={{ background: 'hsl(var(--primary))', color: 'white', border: 'none', padding: '1rem', borderRadius: '0.75rem', fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 12px hsla(var(--primary) / 0.2)', fontSize: '1rem' }}
        >
          {isUploading ? '📤 Processing...' : (hasFailures ? '🚀 Post to Remaining' : (aiTier !== 'Manual' ? '✨ Review AI Strategy' : '🚀 Post Video'))}
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
            style={{ background: 'transparent', border: '1px solid hsla(var(--border)/0.5)', color: 'hsl(var(--muted-foreground))', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            🚀 Skip Review & Post Directly
          </button>
        )}
      </form>
    </GlassCard>
  );
};
