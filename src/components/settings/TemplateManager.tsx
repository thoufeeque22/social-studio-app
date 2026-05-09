import React, { useState, useEffect } from 'react';
import { Trash2, Loader2, Bookmark, Edit2, Check, X } from 'lucide-react';
import { getMetadataTemplates, deleteMetadataTemplate, updateMetadataTemplate } from '@/app/actions/metadata';

interface Template {
  id: string;
  name: string;
  content: string;
}

export const TemplateManager = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleStartEdit = (t: Template) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditContent(t.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditContent('');
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim() || !editContent.trim()) return;
    
    setIsUpdating(true);
    try {
      const updated = await updateMetadataTemplate(id, {
        name: editName,
        content: editContent
      });
      setTemplates(templates.map(t => t.id === id ? (updated as Template) : t));
      handleCancelEdit();
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template.');
    } finally {
      setIsUpdating(false);
    }
  };

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
              {editingId === t.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <input 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Name"
                    style={{ background: 'hsla(var(--muted)/0.5)', border: '1px solid hsla(var(--border)/0.5)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.85rem', color: 'white' }}
                  />
                  <textarea 
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    placeholder="Content"
                    rows={3}
                    style={{ background: 'hsla(var(--muted)/0.5)', border: '1px solid hsla(var(--border)/0.5)', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem', color: 'white', resize: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleUpdate(t.id)}
                      disabled={isUpdating}
                      style={{ background: 'hsl(var(--primary))', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                    >
                      {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> Save</>}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      style={{ background: 'hsla(var(--muted)/0.5)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Bookmark size={14} style={{ color: 'hsl(var(--primary))' }} />
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{t.name}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleStartEdit(t)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'hsl(var(--muted-foreground))',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'hsl(var(--primary))'}
                        onMouseLeave={e => e.currentTarget.style.color = 'hsl(var(--muted-foreground))'}
                      >
                        <Edit2 size={14} />
                      </button>
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
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
