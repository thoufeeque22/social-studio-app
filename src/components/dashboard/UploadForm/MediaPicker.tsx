'use client';

import React, { useState, useEffect } from 'react';
import { Film, Calendar, Check, X, Search, Clock, HardDrive, AlertTriangle } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';

interface GalleryAsset {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number | null;
  expiresAt: string;
  createdAt: string;
  previewUrl?: string;
}

const MediaPreview: React.FC<{ src?: string }> = ({ src }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isHovered && videoRef.current) {
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current) {
      videoRef.current.pause();
      if (videoRef.current.currentTime > 0) {
        videoRef.current.currentTime = 0;
      }
    }
  }, [isHovered]);

  const handleMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setAspectRatio(video.videoWidth / video.videoHeight);
  };

  const isVertical = aspectRatio !== null && aspectRatio < 0.9;

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
      style={{ 
        width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden',
        background: 'black', position: 'relative',
        border: '1px solid hsla(var(--primary) / 0.1)'
      }}
    >
      {src ? (
        <video 
          ref={videoRef}
          src={`${src}#t=0.1`} 
          muted 
          playsInline 
          loop
          onLoadedMetadata={handleMetadata}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: isVertical ? 'contain' : 'cover', 
            opacity: isHovered ? 1 : 0.7 
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))' }}><Film size={18} /></div>
      )}
    </div>
  );
};

interface MediaPickerProps {
  onSelect: (asset: GalleryAsset) => void;
  onClose: () => void;
}

export const MediaPicker: React.FC<MediaPickerProps> = ({ onSelect, onClose }) => {
  const [assets, setAssets] = useState<GalleryAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/media')
      .then(res => res.json())
      .then(data => {
        setAssets(data.data || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const filteredAssets = assets.filter(asset => 
    asset.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getRemainingTimeInfo = (expiresAt: string) => {
    const remaining = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.max(0, Math.floor(remaining / (1000 * 60 * 60)));
    const mins = Math.max(0, Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)));
    const isExpiringSoon = hours < 24;
    
    let text = `${hours}h ${mins}m left`;
    if (hours > 24) {
      text = `${Math.floor(hours / 24)}d ${hours % 24}h left`;
    }
    
    return { text, isExpiringSoon };
  };

  const handleDeleteAsset = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation(); // Don't trigger selection
    if (!globalThis.confirm('Delete this video?')) return;
    
    try {
      const res = await fetch(`/api/media/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.fileId !== fileId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <GlassCard style={{ 
        width: '100%', maxWidth: '600px', maxHeight: '80vh', 
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        padding: '1.5rem', position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ 
            position: 'absolute', right: '1.5rem', top: '1.5rem',
            background: 'none', border: 'none', color: 'white', cursor: 'pointer' 
          }}
        >
          <X size={24} />
        </button>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Film className="text-primary" size={20} />
          Choose from Staged Media
        </h3>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} size={16} />
          <input 
            type="text" 
            placeholder="Search filenames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', 
              borderRadius: '0.75rem', border: '1px solid hsla(var(--border) / 0.5)',
              background: 'hsla(var(--muted) / 0.3)', color: 'white'
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              Loading media library...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              {searchQuery ? 'No matching videos found.' : 'No staged videos yet. Upload your first video!'}
            </div>
          ) : (
            filteredAssets.map(asset => (
              <div 
                key={asset.id}
                onClick={() => onSelect(asset)}
                style={{ 
                  padding: '1rem', borderRadius: '0.75rem', 
                  background: 'hsla(var(--foreground) / 0.05)',
                  border: '1px solid hsla(var(--border) / 0.3)',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: '1rem'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(var(--primary) / 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'hsla(var(--foreground) / 0.05)'}
              >
                <MediaPreview src={asset.previewUrl} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 500, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {asset.fileName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <HardDrive size={12} />
                      {formatSize(asset.fileSize)}
                    </span>
                    {(() => {
                      const timeInfo = getRemainingTimeInfo(asset.expiresAt);
                      return (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: timeInfo.isExpiringSoon ? '#ef4444' : 'hsl(var(--muted-foreground))', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.25rem',
                          fontWeight: timeInfo.isExpiringSoon ? 600 : 400
                        }}>
                          {timeInfo.isExpiringSoon ? <AlertTriangle size={12} /> : <Clock size={12} />}
                          {timeInfo.text}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    onClick={(e) => handleDeleteAsset(e, asset.fileId)}
                    style={{ 
                      background: 'none', border: 'none', color: '#ef4444', 
                      cursor: 'pointer', padding: '0.5rem', borderRadius: '0.4rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    title="Delete permanently"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div style={{ color: 'hsl(var(--primary))' }}>
                    <Check size={18} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '1.5rem', padding: '0.75rem', borderRadius: '0.5rem', background: 'hsla(var(--warning) / 0.1)', border: '1px solid hsla(var(--warning) / 0.2)' }}>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'hsl(var(--warning))', textAlign: 'center' }}>
            Videos are automatically purged after 7 days to save space.
          </p>
        </div>
      </GlassCard>
    </div>
  );
};
