import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PLATFORMS } from '@/lib/core/constants';
import { AIWriteResult } from '@/lib/utils/ai-writer';

interface AIContentReviewProps {
  previews: Record<string, AIWriteResult>;
  onConfirm: (finalContent: Record<string, AIWriteResult>) => void;
  onBack: () => void;
  isProcessing: boolean;
}

export const AIContentReview: React.FC<AIContentReviewProps> = ({
  previews,
  onConfirm,
  onBack,
  isProcessing,
}) => {
  const [editedContent, setEditedContent] = useState<Record<string, AIWriteResult>>(previews);
  const platformIds = Object.keys(previews);
  const [activePlatform, setActivePlatform] = useState(platformIds[0]);
  const [newHashtag, setNewHashtag] = useState("");

  const handleUpdate = (field: keyof AIWriteResult, value: string | string[]) => {
    setEditedContent(prev => ({
      ...prev,
      [activePlatform]: {
        ...prev[activePlatform],
        [field]: value
      }
    }));
  };

  const activeData = editedContent[activePlatform];
  const activePlatformInfo = PLATFORMS.find(p => p.id === activePlatform) || PLATFORMS[0];

  return (
    <GlassCard style={{ padding: '2rem', animation: 'slideUp 0.4s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>✨ Review AI Strategy</h2>
        <span style={{ 
          fontSize: '0.75rem', 
          padding: '4px 10px', 
          borderRadius: '2rem', 
          background: 'hsla(var(--primary) / 0.1)', 
          color: 'hsl(var(--primary))',
          fontWeight: 600,
          border: '1px solid hsla(var(--primary) / 0.3)'
        }}>
          Step 2 of 2
        </span>
      </div>

      <div style={{ 
        padding: '1rem', 
        borderRadius: '0.75rem', 
        background: 'hsla(45, 100%, 50%, 0.05)', 
        border: '1px solid hsla(45, 100%, 50%, 0.2)',
        marginBottom: '1.5rem'
      }}>
        <p style={{ fontSize: '0.85rem', color: 'hsl(45, 100%, 40%)', margin: 0, lineHeight: 1.5 }}>
          <strong>⚠️ AI Content Disclaimer:</strong> Our Intelligence Layer generates platform-specific hooks. Captions may contain creative inaccuracies. Please verify hashtags and links before distributing.
        </p>
      </div>

      {/* Platform Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {platformIds.map(pid => {
          const p = PLATFORMS.find(info => info.id === pid);
          const isActive = activePlatform === pid;
          return (
            <button
              key={pid}
              onClick={() => setActivePlatform(pid)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '0.75rem',
                border: `1px solid ${isActive ? 'hsl(var(--primary))' : 'hsla(var(--border) / 0.5)'}`,
                background: isActive ? 'hsla(var(--primary) / 0.1)' : 'transparent',
                color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                cursor: 'pointer',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              <span>{p?.icon}</span>
              <span style={{ fontWeight: isActive ? 600 : 400 }}>{p?.name}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
            {activePlatform === 'youtube' ? 'Video Title' : 'Campaign Hook'}
          </label>
          <input 
            type="text"
            value={activeData.title}
            onChange={(e) => handleUpdate('title', e.target.value)}
            style={{ 
              background: 'hsla(var(--muted) / 0.3)', 
              padding: '0.8rem 1rem', 
              borderRadius: '0.75rem', 
              border: '1px solid hsla(var(--border) / 0.5)',
              color: 'white',
              fontSize: '0.95rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
            Description & Hashtags
          </label>
          <textarea 
            value={activeData.description}
            onChange={(e) => handleUpdate('description', e.target.value)}
            rows={5}
            style={{ 
              background: 'hsla(var(--muted) / 0.3)', 
              padding: '0.8rem 1rem', 
              borderRadius: '0.75rem', 
              border: '1px solid hsla(var(--border) / 0.5)',
              color: 'white',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              resize: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>
            Suggested Tags
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {activeData.hashtags.map((tag, i) => (
              <span key={i} style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem', 
                background: 'hsla(var(--muted) / 0.5)', 
                padding: '2px 8px', 
                borderRadius: '4px',
                color: 'hsl(var(--primary))'
              }}>
                {tag}
                <button
                  type="button"
                  onClick={() => {
                    const newTags = [...activeData.hashtags];
                    newTags.splice(i, 1);
                    handleUpdate('hashtags', newTags);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'currentColor',
                    cursor: 'pointer',
                    padding: 0,
                    marginLeft: '4px',
                    opacity: 0.7
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {(!['instagram', 'tiktok', 'global'].includes(activePlatform) || activeData.hashtags.length < 5) && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input
                type="text"
                placeholder="Add a tag..."
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newHashtag.trim()) {
                      let tag = newHashtag.trim();
                      if (!tag.startsWith('#')) tag = '#' + tag;
                      handleUpdate('hashtags', [...activeData.hashtags, tag]);
                      setNewHashtag('');
                    }
                  }
                }}
                style={{
                  background: 'hsla(var(--muted) / 0.3)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.5rem',
                  border: '1px solid hsla(var(--border) / 0.5)',
                  color: 'white',
                  fontSize: '0.8rem',
                  width: '150px'
                }}
              />
              <button
                type="button"
                onClick={() => {
                  if (newHashtag.trim()) {
                    let tag = newHashtag.trim();
                    if (!tag.startsWith('#')) tag = '#' + tag;
                    handleUpdate('hashtags', [...activeData.hashtags, tag]);
                    setNewHashtag('');
                  }
                }}
                style={{
                  background: 'hsla(var(--primary) / 0.2)',
                  color: 'hsl(var(--primary))',
                  border: 'none',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.8rem'
                }}
              >
                Add
              </button>
            </div>
          )}
          {['instagram', 'tiktok', 'global'].includes(activePlatform) && activeData.hashtags.length >= 5 && (
            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', marginTop: '0.25rem' }}>
              Max 5 tags reached for {activePlatformInfo.name}.
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '2.5rem' }}>
        <button
          onClick={onBack}
          disabled={isProcessing}
          style={{
            flex: 1,
            padding: '1rem',
            borderRadius: '0.75rem',
            border: '1px solid hsla(var(--border) / 0.5)',
            background: 'transparent',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ⬅ Back to Step 1
        </button>
        <button
          onClick={() => onConfirm(editedContent)}
          disabled={isProcessing}
          style={{
            flex: 2,
            padding: '1rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: 'hsl(var(--primary))',
            color: 'white',
            fontWeight: 700,
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px hsla(var(--primary) / 0.3)'
          }}
        >
          {isProcessing ? '🚀 Distributing...' : 'Confirm Strategy & Distribute'}
        </button>
      </div>
    </GlassCard>
  );
};
