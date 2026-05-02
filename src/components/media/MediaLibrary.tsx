'use client';

import React, { useState, useEffect } from 'react';
import { Film, Search, Clock, HardDrive, AlertTriangle, Trash2, ExternalLink } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Heading } from '@/components/ui/Heading';

interface GalleryAsset {
  id: string;
  fileId: string;
  fileName: string;
  fileSize: number | null;
  expiresAt: string;
  createdAt: string;
  previewUrl?: string;
}

const MediaPreview: React.FC<{ src?: string; isGrid?: boolean }> = ({ src, isGrid }) => {
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
        width: isGrid ? '100%' : '48px', 
        height: isGrid ? (isVertical ? '210px' : '100px') : '48px', 
        borderRadius: '10px', 
        overflow: 'hidden',
        background: 'black', 
        position: 'relative',
        border: '1px solid hsla(var(--primary) / 0.1)',
        transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
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
            opacity: isHovered ? 1 : 0.8, 
            transition: 'opacity 0.3s ease' 
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'hsl(var(--primary))' }}>
          <Film size={isGrid ? 32 : 20} />
        </div>
      )}
      {src && (
        <div style={{ 
          position: 'absolute', bottom: '8px', right: '8px', 
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          borderRadius: '4px', padding: '2px 6px', fontSize: '10px', color: 'white',
          fontWeight: 600, border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {isVertical ? '9:16 PORTRAIT' : '16:9 LANDSCAPE'}
        </div>
      )}
    </div>
  );
};

export const MediaLibrary: React.FC = () => {
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



  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleDeleteAsset = async (fileId: string) => {
    if (!globalThis.confirm('Are you sure you want to permanentely remove this video from your staged media?')) return;
    
    try {
      const res = await fetch(`/api/media/${fileId}`, { method: 'DELETE' });
      if (res.ok) {
        setAssets(prev => prev.filter(a => a.fileId !== fileId));
        setSelectedIds(prev => prev.filter(id => id !== fileId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete asset');
      }
    } catch (err) {
      console.error(err);
      alert('Network error while deleting asset');
    }
  };

  const handleBulkDelete = async () => {
    if (!globalThis.confirm(`Are you sure you want to permanentely delete ${selectedIds.length} videos?`)) return;
    
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileIds: selectedIds })
      });

      if (res.ok) {
        setAssets(prev => prev.filter(a => !selectedIds.includes(a.fileId)));
        setSelectedIds([]);
      } else {
        alert('Bulk delete failed');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!globalThis.confirm('⚠️ WARNING: This will permanently delete EVERY video in your staged gallery. Are you absolutely sure?')) return;
    if (!globalThis.confirm('FINAL CONFIRMATION: Are you really sure you want to wipe your entire media gallery?')) return;
    
    try {
      const res = await fetch('/api/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteAll: true })
      });

      if (res.ok) {
        setAssets([]);
        setSelectedIds([]);
        alert('Gallery cleared successfully.');
      } else {
        alert('Failed to clear gallery');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleSelect = (fileId: string) => {
    setSelectedIds(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId) 
        : [...prev, fileId]
    );
  };

  const filteredAssets = assets.filter(asset => 
    asset.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: '-2rem', zIndex: 100, 
        background: 'hsla(var(--background) / 0.8)', backdropFilter: 'blur(16px)',
        padding: '1.5rem 2rem', margin: '0 -2rem 0 -2rem',
        borderBottom: '1px solid hsla(var(--border) / 0.5)'
      }}>
        <div>
          <Heading level={1}>Media Gallery</Heading>
          <p style={{ color: 'hsl(var(--muted-foreground))', margin: 0, fontSize: '0.9rem' }}>
            Manage your staged video assets and reused them across platforms.
          </p>
        </div>
        {assets.length > 0 && (
          <button 
            onClick={handleClearAll}
            style={{ 
              padding: '0.6rem 1rem', borderRadius: '0.5rem', 
              background: 'none', border: '1px solid #ef4444',
              color: '#ef4444', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <Trash2 size={16} />
            Clear Gallery
          </button>
        )}
      </header>

      <GlassCard style={{ padding: '1.5rem' }}>
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'hsl(var(--muted-foreground))' }} size={20} />
          <input 
            type="text" 
            placeholder="Search your library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', padding: '1rem 1rem 1rem 3rem', 
              borderRadius: '0.75rem', border: '1px solid hsla(var(--border) / 0.5)',
              background: 'hsla(var(--muted) / 0.2)', color: 'white',
              fontSize: '1rem'
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              Loading your media library...
            </div>
          ) : filteredAssets.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', color: 'hsl(var(--muted-foreground))' }}>
              <div style={{ marginBottom: '1rem', fontSize: '2rem' }}>🎬</div>
              <p>{searchQuery ? 'No matching videos found.' : 'Your media library is empty. Upload a video from the dashboard to get started!'}</p>
            </div>
          ) : (
            filteredAssets.map(asset => {
              const timeInfo = getRemainingTimeInfo(asset.expiresAt);
              return (
                <div 
                  key={asset.id}
                  style={{ 
                    padding: '0.5rem', borderRadius: '0.75rem', 
                    background: selectedIds.includes(asset.fileId) ? 'hsla(var(--primary) / 0.05)' : 'hsla(var(--foreground) / 0.03)',
                    border: selectedIds.includes(asset.fileId) ? '1px solid hsl(var(--primary))' : '1px solid hsla(var(--border) / 0.3)',
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {/* CHECKBOX OVERLAY */}
                  <div 
                    onClick={() => toggleSelect(asset.fileId)}
                    style={{ 
                      position: 'absolute', top: '1rem', left: '1rem', zIndex: 10,
                      width: '18px', height: '18px', borderRadius: '4px',
                      background: selectedIds.includes(asset.fileId) ? 'hsl(var(--primary))' : 'rgba(0,0,0,0.5)',
                      border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s ease'
                    }}
                  >
                    {selectedIds.includes(asset.fileId) && <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '1px' }} />}
                  </div>

                  <MediaPreview src={asset.previewUrl} isGrid />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {asset.fileName}
                      </p>
                    </div>
                  </div>

                  <div style={{ 
                    padding: '0.4rem 0.6rem', borderRadius: '0.4rem',
                    background: timeInfo.isExpiringSoon ? 'rgba(239, 68, 68, 0.1)' : 'hsla(var(--muted) / 0.3)',
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    color: timeInfo.isExpiringSoon ? '#ef4444' : 'hsl(var(--muted-foreground))',
                    fontSize: '0.65rem', fontWeight: timeInfo.isExpiringSoon ? 700 : 400
                  }}>
                    <span>{timeInfo.text}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button 
                      style={{ 
                        flex: 1, padding: '0.4rem', borderRadius: '0.4rem', 
                        background: 'hsla(var(--primary) / 0.1)', border: '1px solid hsla(var(--primary) / 0.2)',
                        color: 'hsl(var(--primary))', fontSize: '0.7rem', fontWeight: 600,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem'
                      }}
                      onClick={() => window.location.href = `/?staged=${asset.fileId}`}
                    >
                      Post
                    </button>
                    <button 
                      style={{ 
                        padding: '0.4rem', borderRadius: '0.4rem', 
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                      onClick={() => handleDeleteAsset(asset.fileId)}
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </GlassCard>

      <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'hsla(var(--warning) / 0.05)', border: '1px solid hsla(var(--warning) / 0.15)' }}>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'hsl(var(--warning))', textAlign: 'center' }}>
          <strong>Note:</strong> Social Studio uses a "Lean Gallery" approach. Videos are automatically purged after 7 days to keep performance high and storage costs low.
        </p>
      </div>

      {/* FIXED HUD - AGGRESSIVE VIEWPORT FIX */}
      {selectedIds.length > 0 && (
        <div style={{
          position: 'fixed', 
          bottom: '40px', 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: 'max-content',
          minWidth: '400px',
          maxWidth: '90vw',
          background: 'hsla(var(--card) / 0.9)', 
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid hsla(var(--primary) / 0.5)',
          padding: '1rem 2rem', 
          borderRadius: '1.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '2.5rem',
          boxShadow: '0 30px 70px rgba(0,0,0,0.7), 0 0 0 1px hsla(var(--primary) / 0.2)', 
          zIndex: 99999,
          animation: 'slideUpHUD 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✨</span>
            <span style={{ fontWeight: 700, color: 'white', fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
               {selectedIds.length} {selectedIds.length === 1 ? 'video' : 'videos'} selected
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => setSelectedIds([])}
              style={{ 
                background: 'none', border: 'none', 
                color: 'hsl(var(--muted-foreground))', 
                cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                padding: '0.5rem 1rem', borderRadius: '0.75rem',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'hsl(var(--muted-foreground))'}
            >
              Cancel
            </button>
            
            <button 
              onClick={handleBulkDelete}
              style={{ 
                background: '#EF4444', color: 'white', border: 'none', 
                padding: '0.85rem 2rem', borderRadius: '1.1rem', 
                fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: '0 10px 25px rgba(239, 68, 68, 0.4)',
                whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '0.75rem'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(239, 68, 68, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(239, 68, 68, 0.4)';
              }}
            >
              ⏹️ DELETE SELECTED
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUpHUD {
          from { transform: translate(-50%, 200%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
