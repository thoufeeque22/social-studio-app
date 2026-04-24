import React from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { AIStyleSelector } from './AIStyleSelector';
import { PlatformSelection } from './PlatformSelection';
import { Account, VideoFormat, PlatformPreference } from '@/lib/core/types';
import { StyleMode } from '@/lib/core/constants';
import { VideoFormatSelector } from './VideoFormatSelector';

interface UploadFormProps {
  isUploading: boolean;
  uploadStatus: string | null;
  accounts: Account[];
  preferences: PlatformPreference[];
  selectedAccountIds: string[];
  successfulAccountIds: string[];
  platformStatuses: Record<string, 'pending' | 'uploading' | 'processing' | 'success' | 'failed'>;
  contentMode: StyleMode;
  videoFormat: VideoFormat;
  draftFileName: string | null;
  onModeChange: (mode: StyleMode) => void;
  onFormatChange: (format: VideoFormat) => void;
  onToggleAccount: (id: string) => void;
  onFileChange: (file: File) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  isScheduled: boolean;
  scheduledAt: string;
  onSchedulingChange: (isScheduled: boolean, date: string) => void;
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
  videoFormat,
  draftFileName,
  onModeChange,
  onFormatChange,
  onToggleAccount,
  onFileChange,
  onSubmit,
  isScheduled,
  scheduledAt,
  onSchedulingChange,
}) => {
  const isComplete = uploadStatus?.includes('successfully');

  return (
    <GlassCard id="create-post-section" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upload & Automate</h2>
      
      {uploadStatus && (
        <div style={{ marginBottom: '1.5rem' }}>
          {isComplete ? (
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
          ) : (
            <GlassCard style={{ padding: '1rem', borderColor: 'hsl(var(--primary))' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', margin: 0 }}>
                <span className="animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary))' }}></span>
                {uploadStatus}
              </p>
            </GlassCard>
          )}
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
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
              background: 'hsla(142, 71%, 45%, 0.1)', border: '1px solid hsla(142, 71%, 45%, 0.3)'
            }}>
              <span style={{ fontSize: '0.85rem' }}>✅</span>
              <span style={{ fontSize: '0.8rem', color: 'hsl(142, 71%, 45%)' }}>
                <strong>{draftFileName}</strong> attached
              </span>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="video-title" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Video Title</label>
          <input 
            id="video-title"
            type="text" 
            name="title" 
            placeholder="Enter a catchy title..."
            defaultValue={typeof window !== 'undefined' ? localStorage.getItem('SS_DRAFT_TITLE') || '' : ''}
            onChange={(e) => localStorage.setItem('SS_DRAFT_TITLE', e.target.value)}
            required
            style={{ 
              background: 'hsla(var(--muted) / 0.3)', 
              padding: '0.75rem 1rem', 
              borderRadius: '0.75rem', 
              border: '1px solid hsla(var(--border) / 0.5)',
              color: 'white',
              outline: 'none'
            }} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="video-description" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Description</label>
          <textarea 
            id="video-description"
            name="description" 
            placeholder="Tell your viewers about the video..."
            defaultValue={typeof window !== 'undefined' ? localStorage.getItem('SS_DRAFT_DESC') || '' : ''}
            onChange={(e) => localStorage.setItem('SS_DRAFT_DESC', e.target.value)}
            rows={3}
            style={{ 
              background: 'hsla(var(--muted) / 0.3)', 
              padding: '0.75rem 1rem', 
              borderRadius: '0.75rem', 
              border: '1px solid hsla(var(--border) / 0.5)',
              color: 'white',
              outline: 'none',
              resize: 'none'
            }} 
          />
        </div>

        <AIStyleSelector contentMode={contentMode} onModeChange={onModeChange} />
        
        {contentMode !== 'Manual' && (
          <div style={{ 
            padding: '0.75rem', 
            borderRadius: '0.75rem', 
            background: 'hsla(var(--primary) / 0.05)', 
            border: '1px solid hsla(var(--primary) / 0.15)',
            marginTop: '0.25rem'
          }}>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✨</span>
              <span><strong>AI Disclaimer:</strong> AI-generated content can be inaccurate. You will be prompted to <strong>Review Strategy</strong> before we post to your platforms.</span>
            </p>
          </div>
        )}
        
        <VideoFormatSelector videoFormat={videoFormat} onFormatChange={onFormatChange} />

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
          onToggleAccount={onToggleAccount} 
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
          disabled={isUploading || (accounts.length > 0 && selectedAccountIds.length === 0)}
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
            : contentMode !== 'Manual' 
              ? (isScheduled ? '✨ Review AI Strategy & Schedule' : '✨ Review AI Strategy') 
              : (isScheduled ? '📅 Schedule Post' : '🚀 Post Video')
          }
        </button>

        {contentMode !== 'Manual' && !isUploading && (
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

        {uploadStatus && (
          <div style={{ textAlign: 'center' }}>
            {isComplete ? (
              <Link 
                href="/history" 
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  fontSize: '0.85rem', 
                  color: 'hsl(var(--primary))', 
                  fontWeight: 600, 
                  textDecoration: 'underline',
                  textUnderlineOffset: '4px'
                }}
              >
                {uploadStatus} ↗
              </Link>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'hsl(var(--primary))', fontWeight: 500 }}>
                {uploadStatus}
              </p>
            )}
          </div>
        )}
      </form>
    </GlassCard>
  );
};
