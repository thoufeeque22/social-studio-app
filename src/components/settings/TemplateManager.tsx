import React, { useState, useEffect } from 'react';
import { Trash2, Loader2, Bookmark } from 'lucide-react';
import { getMetadataTemplates, deleteMetadataTemplate } from '@/app/actions/metadata';

interface Template {
  id: string;
  name: string;
  content: string;
}

export const TemplateManager = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      const data = await getMetadataTemplates();
      setTemplates(data as Template[]);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this snippet?')) return;
    
    setDeletingId(id);
    try {
      await deleteMetadataTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template.');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <Loader2 className="animate-spin" style={{ color: 'hsl(var(--primary))' }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {templates.length === 0 ? (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          background: 'hsla(var(--muted)/0.1)', 
          borderRadius: '1rem',
          border: '1px dashed hsla(var(--border)/0.5)',
          color: 'hsl(var(--muted-foreground))',
          fontSize: '0.9rem'
        }}>
          No saved snippets yet. Save them from the Upload dashboard!
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {templates.map(t => (
            <div 
              key={t.id}
              style={{
                padding: '1rem',
                borderRadius: '0.75rem',
                background: 'hsla(var(--muted)/0.2)',
                border: '1px solid hsla(var(--border)/0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                position: 'relative'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bookmark size={14} style={{ color: 'hsl(var(--primary))' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(t.id)}
                  disabled={deletingId === t.id}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'hsla(var(--destructive)/0.7)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--destructive))'}
                  onMouseLeave={e => e.currentTarget.style.color = 'hsla(var(--destructive)/0.7)'}
                >
                  {deletingId === t.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
              <p style={{ 
                margin: 0, 
                fontSize: '0.8rem', 
                color: 'hsl(var(--muted-foreground))',
                whiteSpace: 'pre-wrap',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
                {t.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
