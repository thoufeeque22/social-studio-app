import React from 'react';

interface VideoFileDisplayProps {
  fileName: string | null;
  file?: File | null;
  format: 'short' | 'long';
  duration: number | null;
  isProcessing?: boolean;
  onRotate?: () => void;
  onCancel?: () => void;
}

export const VideoFileDisplay: React.FC<VideoFileDisplayProps> = ({ 
  fileName, 
  file,
  format, 
  duration,
  isProcessing = false,
  onRotate,
  onCancel
}) => {
  const previewUrl = React.useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  // Cleanup object URL when file changes or component unmounts
  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const formatDuration = (seconds: number | null): string => {
    if (seconds === null) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.round(seconds % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (!fileName) return null;

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
      marginBottom: '0.5rem'
    }}>
      {/* Video Preview */}
      {previewUrl && (
        <div style={{
          width: '100%',
          aspectRatio: format === 'short' ? '9/16' : '16/9',
          maxHeight: '300px',
          background: 'black',
          borderRadius: '0.75rem',
          overflow: 'hidden',
          border: '1px solid hsla(var(--border) / 0.5)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {isProcessing ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              color: 'hsl(var(--primary))'
            }}>
              <div className="animate-spin" style={{ fontSize: '2rem' }}>🔄</div>
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Re-encoding video...</span>
            </div>
          ) : (
            <video 
              key={previewUrl}
              src={previewUrl} 
              controls 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          )}
        </div>
      )}

      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
        padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
        background: isProcessing ? 'hsla(var(--primary) / 0.1)' : 'hsla(142, 71%, 45%, 0.1)', 
        border: `1px solid ${isProcessing ? 'hsla(var(--primary) / 0.3)' : 'hsla(142, 71%, 45%, 0.3)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem' }}>{isProcessing ? '🔄' : '✅'}</span>
          <span style={{ fontSize: '0.8rem', color: isProcessing ? 'hsl(var(--primary))' : 'hsl(142, 71%, 45%)' }}>
            <strong>{isProcessing ? 'Processing rotation...' : fileName}</strong> {isProcessing ? '' : 'attached'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {isProcessing && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              title="Cancel rotation"
              style={{
                background: 'hsla(var(--destructive) / 0.1)',
                border: 'none',
                color: 'hsl(var(--destructive))',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(var(--destructive) / 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'hsla(var(--destructive) / 0.1)'}
            >
              Cancel ✕
            </button>
          )}
          {!isProcessing && onRotate && (
            <button
              type="button"
              onClick={onRotate}
              title="Rotate 90° clockwise"
              style={{
                background: 'hsla(var(--foreground) / 0.1)',
                border: 'none',
                color: 'hsl(var(--foreground))',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'hsla(var(--foreground) / 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'hsla(var(--foreground) / 0.1)'}
            >
              Rotate ↻
            </button>
          )}
          <div style={{ 
            background: format === 'short' ? 'hsla(var(--primary) / 0.2)' : 'hsla(var(--muted) / 0.4)',
            color: format === 'short' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            border: `1px solid ${format === 'short' ? 'hsla(var(--primary) / 0.3)' : 'hsla(var(--border) / 0.5)'}`
          }}>
            {format === 'short' ? '⚡ Short-Form' : '📺 Long-Form'}
            {duration !== null && (
              <span style={{ marginLeft: '4px', opacity: 0.8, fontWeight: 500 }}>
                • {formatDuration(duration)}
              </span>
            )}
          </div>
        </div>
      </div>
      {isProcessing && (
        <div style={{
          height: '2px',
          background: 'hsla(var(--primary) / 0.1)',
          borderRadius: '99px',
          overflow: 'hidden'
        }}>
          <div className="animate-pulse" style={{
            height: '100%',
            width: '100%',
            background: 'hsl(var(--primary))',
            boxShadow: '0 0 10px hsl(var(--primary))'
          }} />
        </div>
      )}
    </div>
  );
};
