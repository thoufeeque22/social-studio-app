import React from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { AIStyleSelector } from './AIStyleSelector';
import { PlatformSelection } from './PlatformSelection';
import { Account, VideoFormat } from '@/lib/types';
import { StyleMode } from '@/lib/constants';
import { VideoFormatSelector } from './VideoFormatSelector';

interface UploadFormProps {
  isUploading: boolean;
  uploadStatus: string | null;
  accounts: Account[];
  selectedAccountIds: string[];
  contentMode: StyleMode;
  videoFormat: VideoFormat;
  onModeChange: (mode: StyleMode) => void;
  onFormatChange: (format: VideoFormat) => void;
  onToggleAccount: (id: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  isUploading,
  uploadStatus,
  accounts,
  selectedAccountIds,
  contentMode,
  videoFormat,
  onModeChange,
  onFormatChange,
  onToggleAccount,
  onSubmit,
}) => {
  return (
    <GlassCard id="create-post-section" style={{ padding: '2rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Upload & Automate</h2>
      
      {uploadStatus && (
        <GlassCard style={{ padding: '1rem', marginBottom: '1.5rem', borderColor: 'hsl(var(--primary))' }}>
          <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
            <span className="animate-pulse" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary))' }}></span>
            {uploadStatus}
          </p>
        </GlassCard>
      )}

      <form 
        aria-label="Upload Form"
        onSubmit={onSubmit} 
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="file-upload" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Video File</label>
          <input 
            id="file-upload"
            type="file" 
            name="file" 
            accept="video/*" 
            required
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
        
        <VideoFormatSelector videoFormat={videoFormat} onFormatChange={onFormatChange} />

        {videoFormat === 'long' && accounts.some(a => selectedAccountIds.includes(a.id) && a.provider === 'facebook') && (
           <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'hsla(var(--primary)/0.1)', border: '1px solid hsla(var(--primary)/0.3)', marginBottom: '0.5rem' }}>
             <p style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))' }}>
               ⚠️ <strong>Note:</strong> Instagram Business API strictly requires vertical Reels. For Long-form content, we will post to your connected Facebook Pages and other platforms, but Instagram uploads may be restricted or formatted as Reels.
             </p>
           </div>
        )}

        <PlatformSelection 
          accounts={accounts} 
          selectedAccountIds={selectedAccountIds} 
          onToggleAccount={onToggleAccount} 
        />

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
            boxShadow: '0 4px 12px hsla(var(--primary) / 0.2)'
          }}
        >
          {isUploading ? '📤 Processing...' : '🚀 Post Video'}
        </button>
        
        {uploadStatus && (
          <p style={{ fontSize: '0.85rem', textAlign: 'center', color: 'hsl(var(--primary))', fontWeight: 500 }}>
            {uploadStatus}
          </p>
        )}
      </form>
    </GlassCard>
  );
};
