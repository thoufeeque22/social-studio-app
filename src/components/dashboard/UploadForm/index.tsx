import React, { useState } from 'react';
import Link from 'next/link';
import MovieIcon from '@mui/icons-material/Movie';
import { GlassCard } from '@/components/ui/GlassCard';
import { AIStyleSelector } from './AIStyleSelector';
import { PlatformSelection } from './PlatformSelection';
import { AITierSelector } from './AITierSelector';
import { VideoFileDisplay } from './VideoFileDisplay';
import { SchedulingSelector } from './SchedulingSelector';
import { MediaPicker } from './MediaPicker';
import { MetadataTemplates } from './MetadataTemplates';
import { useUploadForm } from '@/hooks/dashboard/useUploadForm';

import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import YouTubeIcon from '@mui/icons-material/YouTube';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import InstagramIcon from '@mui/icons-material/Instagram';
import FacebookIcon from '@mui/icons-material/Facebook';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import RefreshIcon from '@mui/icons-material/Refresh';
import UploadIcon from '@mui/icons-material/Upload';
import LanguageIcon from '@mui/icons-material/Language';

import { StyleMode, AITier } from '@/lib/core/constants';
import { Account, PlatformPreference } from '@/lib/core/types';

export interface UploadFormProps {
  isUploading: boolean;
  uploadStatus: React.ReactNode;
  accounts: Account[];
  preferences: PlatformPreference[];
  selectedAccountIds: string[];
  contentMode: StyleMode;
  aiTier: AITier;
  videoFormat: 'short' | 'long';
  videoDuration: number | null;
  draftFileName: string | null;
  onVisualScan: (file: File) => Promise<void>;
  onTierChange: (tier: AITier) => void;
  onModeChange: (mode: StyleMode) => void;
  onToggleAccount: (id: string) => void;
  onFileChange: (file: File) => void;
  onGallerySelect: (fileId: string, fileName: string) => void;
  onSubmit: (formData: FormData) => Promise<void>;
  isScheduled: boolean;
  scheduledAt: string;
  onSchedulingChange: (isScheduled: boolean, date: string) => void;
  isComplete: boolean;
  customStyleText: string;
  onCustomStyleChange: (text: string) => void;
  hasCachedPreviews?: boolean;
  onResumeReview?: () => void;
}

export const UploadForm: React.FC<UploadFormProps> = ({
  isUploading,
  uploadStatus,
  accounts,
  preferences,
  selectedAccountIds,
  contentMode,
  aiTier,
  videoFormat,
  videoDuration,
  draftFileName,
  onVisualScan,
  onTierChange,
  onModeChange,
  onToggleAccount,
  onFileChange,
  onGallerySelect,
  onSubmit,
  isScheduled,
  scheduledAt,
  onSchedulingChange,
  isComplete,
  customStyleText,
  onCustomStyleChange,
  hasCachedPreviews,
  onResumeReview
}) => {
  const {
    title,
    description,
    platformTitles,
    platformDescriptions,
    isPlatformSpecific,
    titleUndo,
    descUndo,
    handleTitleChange,
    handleDescriptionChange,
    appendDescription,
    handlePlatformTitleChange,
    handlePlatformDescriptionChange,
    togglePlatformSpecific,
    handleClearTitle,
    handleUndoTitle,
    handleClearDesc,
    handleUndoDesc
  } = useUploadForm();

  // Derived selected platform names
  const selectedPlatforms = React.useMemo(() => {
    const platformsSet = new Set<string>();
    selectedAccountIds.forEach(id => {
      const isSplit = id.includes(':');
      const platformKey = isSplit ? id.split(':')[0] : null;
      const actualAccountId = isSplit ? id.split(':')[1] : id;
      const account = accounts.find(a => a.id === actualAccountId);
      if (isSplit && platformKey) {
        platformsSet.add(platformKey);
      } else if (account) {
        platformsSet.add(account.provider === 'google' ? 'youtube' : account.provider);
      }
    });
    return Array.from(platformsSet);
  }, [selectedAccountIds, accounts]);

  const [showGallery, setShowGallery] = useState(false);

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
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            borderRadius: '0.75rem',
            background: 'hsla(var(--primary) / 0.1)',
            border: '1px solid hsla(var(--primary) / 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'hsl(var(--foreground))', margin: 0 }}>
              <AutoAwesomeIcon sx={{ fontSize: 18, color: 'hsl(var(--primary))' }} />
              <div style={{ fontWeight: 600 }}>{uploadStatus}</div>
            </div>
            <Link 
              href="/history" 
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                background: 'hsl(var(--primary))', 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: '99px', 
                fontSize: '0.75rem', 
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                textDecoration: 'none',
                transition: 'transform 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              View History <span>→</span>
            </Link>
          </div>
        </div>
      )}

      <form 
        aria-label="Upload Form"
        onSubmit={handleSubmit} 
        style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="file-upload" style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Video File</label>
            {!isUploading && (
              <button 
                id="browse-gallery-btn"
                type="button"
                onClick={() => setShowGallery(true)}
                style={{ 
                  background: 'hsla(var(--primary) / 0.1)', 
                  border: '1px solid hsla(var(--primary) / 0.3)',
                  color: 'hsl(var(--primary))',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <MovieIcon sx={{ fontSize: 12 }} />
                Browse Gallery
              </button>
            )}
          </div>
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

        {showGallery && (
          <MediaPicker 
            onClose={() => setShowGallery(false)}
            onSelect={(asset) => {
              onGallerySelect(asset.fileId, asset.fileName);
              setShowGallery(false);
            }}
          />
        )}

        <AITierSelector selectedTier={aiTier} onChange={onTierChange} />

        {/* Platform-Specific Toggle (Manual Mode Only) */}
        {aiTier === 'Manual' && selectedPlatforms.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'hsla(var(--muted)/0.2)', borderRadius: '0.75rem', border: '1px solid hsla(var(--border)/0.3)' }}>
            <input 
              type="checkbox" 
              id="platform-specific-toggle"
              checked={isPlatformSpecific}
              onChange={(e) => togglePlatformSpecific(e.target.checked)}
              style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer', accentColor: 'hsl(var(--primary))' }}
            />
            <label htmlFor="platform-specific-toggle" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: isPlatformSpecific ? 'hsl(var(--primary))' : 'white' }}>
              Separate titles/descriptions per platform
            </label>
            <input type="hidden" name="isPlatformSpecific" value={String(isPlatformSpecific)} />
          </div>
        )}

        {!isPlatformSpecific ? (
          <>
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
                      Auto-Scan Video
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
                  data-testid="video-title"
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <label htmlFor="video-description" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    {aiTier === 'Generate' ? 'Context' : 'Description'}
                  </label>
                  {!isUploading && (
                    <MetadataTemplates 
                      onSelect={(val) => appendDescription(val)} 
                      currentContent={description} 
                    />
                  )}
                </div>
                {descUndo && (
                  <button type="button" onClick={handleUndoDesc} style={{ background: 'transparent', border: 'none', color: 'hsl(var(--primary))', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    ↩️ Undo Clear
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <textarea 
                  id="video-description"
                  data-testid="video-description"
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
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', background: 'hsla(var(--muted)/0.1)', borderRadius: '1rem', border: '1px solid hsla(var(--border)/0.3)' }}>
            {selectedPlatforms.map(platform => (
              <div key={platform} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      {platform === 'youtube' ? <YouTubeIcon sx={{ fontSize: 18, color: '#FF0000' }} /> : 
                       platform === 'tiktok' ? <MusicNoteIcon sx={{ fontSize: 18, color: 'white' }} /> : 
                       platform === 'instagram' ? <InstagramIcon sx={{ fontSize: 18, color: '#E4405F' }} /> : 
                       platform === 'facebook' ? <FacebookIcon sx={{ fontSize: 18, color: '#1877F2' }} /> : 
                       <LanguageIcon sx={{ fontSize: 18 }} />}
                    </span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'hsl(var(--primary))' }}>
                      {platform} Details
                    </span>
                  </div>
                  {!isUploading && (
                    <MetadataTemplates 
                      onSelect={(val) => appendDescription(val, platform)} 
                      currentContent={platformDescriptions[platform] || ''} 
                    />
                  )}
                </div>
                
                <input 
                  type="text"
                  name={`title_${platform}`}
                  placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} title...`}
                  value={platformTitles[platform] || ''}
                  onChange={(e) => handlePlatformTitleChange(platform, e.target.value)}
                  required
                  style={{ background: 'hsla(var(--muted) / 0.3)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid hsla(var(--border) / 0.5)', color: 'white', width: '100%' }}
                />
                
                <textarea 
                  name={`description_${platform}`}
                  placeholder={`${platform.charAt(0).toUpperCase() + platform.slice(1)} description...`}
                  value={platformDescriptions[platform] || ''}
                  onChange={(e) => handlePlatformDescriptionChange(platform, e.target.value)}
                  rows={2}
                  style={{ background: 'hsla(var(--muted) / 0.3)', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid hsla(var(--border) / 0.5)', color: 'white', width: '100%', resize: 'none' }}
                />
              </div>
            ))}
          </div>
        )}

        {aiTier !== 'Manual' && (
          <AIStyleSelector 
            contentMode={contentMode} 
            onModeChange={onModeChange} 
            customStyleText={customStyleText}
            onCustomStyleChange={onCustomStyleChange}
          />
        )}
        
        {aiTier !== 'Manual' && (
          <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: 'hsla(var(--primary)/0.05)', border: '1px solid hsla(var(--primary)/0.15)' }}>
            <p style={{ fontSize: '0.8rem', color: 'hsl(var(--primary))', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AutoAwesomeIcon sx={{ fontSize: 16 }} />
              <span><strong>AI Strategy:</strong> {aiTier === 'Enrich' ? 'Refining draft' : 'Generating content'} in <strong>{contentMode}</strong> style.</span>
            </p>
          </div>
        )}

        <PlatformSelection 
          accounts={accounts} 
          preferences={preferences}
          selectedAccountIds={selectedAccountIds} 
          onToggleAccount={onToggleAccount} 
        />

        <SchedulingSelector isScheduled={isScheduled} scheduledAt={scheduledAt} onChange={onSchedulingChange} />

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          {hasCachedPreviews && !isUploading && (
            <button
              type="button"
              onClick={onResumeReview}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1rem',
                borderRadius: '0.75rem',
                background: 'linear-gradient(135deg, hsla(var(--primary) / 0.2), hsla(var(--primary) / 0.1))',
                border: '1px solid hsla(var(--primary) / 0.3)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease',
                fontSize: '0.9rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'linear-gradient(135deg, hsla(var(--primary) / 0.3), hsla(var(--primary) / 0.15))';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'linear-gradient(135deg, hsla(var(--primary) / 0.2), hsla(var(--primary) / 0.1))';
              }}
            >
              <span>⏭️</span> Continue Reviewing
            </button>
          )}

          <button 
            type="submit" 
            disabled={isUploading}
            style={{ 
              flex: hasCachedPreviews ? 1.2 : 'none',
              background: 'hsl(var(--primary))', 
              color: 'white', 
              border: 'none', 
              padding: '1rem', 
              borderRadius: '0.75rem', 
              fontWeight: 700, 
              cursor: isUploading ? 'not-allowed' : 'pointer', 
              boxShadow: '0 4px 12px hsla(var(--primary) / 0.2)', 
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {isUploading ? <UploadIcon className="animate-pulse" /> : (aiTier !== 'Manual' ? (hasCachedPreviews ? <RefreshIcon /> : <AutoAwesomeIcon />) : <RocketLaunchIcon />)}
            {isUploading ? 'Processing...' : (aiTier !== 'Manual' ? (hasCachedPreviews ? 'Regenerate Strategy' : 'Review AI Strategy') : 'Post Video')}
          </button>
        </div>

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
              setTimeout(() => hidden.remove(), 100);
            }}
            style={{ background: 'transparent', border: '1px solid hsla(var(--border)/0.5)', color: 'hsl(var(--muted-foreground))', padding: '0.75rem', borderRadius: '0.75rem', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            <RocketLaunchIcon sx={{ fontSize: 16 }} /> Skip Review & Post Directly
          </button>
        )}
      </form>
    </GlassCard>
  );
};
