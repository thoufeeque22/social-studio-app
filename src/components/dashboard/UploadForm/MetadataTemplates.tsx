import React, { useState, useEffect, useRef } from 'react';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import CircularProgress from '@mui/material/CircularProgress';
import { getMetadataTemplates, createMetadataTemplate } from '@/app/actions/metadata';

interface Template {
  id: string;
  name: string;
  content: string;
}

interface MetadataTemplatesProps {
  onSelect: (content: string) => void;
  currentContent: string;
}

export const MetadataTemplates: React.FC<MetadataTemplatesProps> = ({ onSelect, currentContent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchTemplates = async () => {
    setIsLoading(true);
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
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSaveAction = async () => {
    if (!newTemplateName.trim() || !currentContent.trim()) return;

    setIsSaving(true);
    try {
      const newTemplate = await createMetadataTemplate({
        name: newTemplateName,
        content: currentContent
      });
      setTemplates([newTemplate as Template, ...templates]);
      setNewTemplateName('');
      setShowSaveForm(false);
      setIsOpen(false); // Close menu on successful save
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Failed to save template.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Saved Snippets"
        data-testid="snippets-trigger"
        style={{
          background: 'hsla(var(--primary)/0.1)',
          border: '1px solid hsla(var(--primary)/0.3)',
          color: 'hsl(var(--primary))',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <BookmarkIcon sx={{ fontSize: 12 }} />
        Snippets
      </button>

      {isOpen && (
        <div 
          data-testid="snippets-menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            zIndex: 50,
            marginTop: '0.5rem',
            width: '280px',
            background: 'hsl(var(--card))',
            border: '1px solid hsla(var(--border)/0.5)',
            borderRadius: '0.75rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ 
            padding: '0.75rem', 
            borderBottom: '1px solid hsla(var(--border)/0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'hsla(var(--muted)/0.3)'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'hsl(var(--primary))' }}>Saved Snippets</span>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </button>
          </div>

          <div style={{ padding: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
            {isLoading ? (
              <div style={{ padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={20} sx={{ color: 'hsl(var(--primary))' }} />
              </div>
            ) : templates.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'hsl(var(--muted-foreground))' }}>
                No snippets saved yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {templates.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`snippet-item-${t.id}`}
                    onClick={() => {
                      onSelect(t.content);
                      setIsOpen(false);
                    }}
                    style={{
                      textAlign: 'left',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: 'transparent',
                      border: '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'hsla(var(--primary)/0.1)';
                      e.currentTarget.style.borderColor = 'hsla(var(--primary)/0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'white' }}>{t.name}</span>
                    <span style={{ 
                      fontSize: '0.7rem', 
                      color: 'hsl(var(--muted-foreground))',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%'
                    }}>
                      {t.content}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ padding: '0.75rem', borderTop: '1px solid hsla(var(--border)/0.3)', background: 'hsla(var(--muted)/0.1)' }}>
            {!showSaveForm ? (
              <button
                type="button"
                data-testid="save-snippet-form-trigger"
                onClick={() => setShowSaveForm(true)}
                disabled={!currentContent.trim()}
                style={{
                  width: '100%',
                  background: 'hsl(var(--primary))',
                  color: 'white',
                  border: 'none',
                  padding: '6px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: currentContent.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  opacity: currentContent.trim() ? 1 : 0.5
                }}
              >
                <AddIcon sx={{ fontSize: 14 }} />
                Save Current as Snippet
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input
                  autoFocus
                  type="text"
                  data-testid="new-snippet-name-input"
                  placeholder="Snippet name (e.g. Bio Link)"
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveAction();
                    }
                  }}
                  style={{
                    background: 'hsla(var(--muted)/0.5)',
                    border: '1px solid hsla(var(--border)/0.5)',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    color: 'white',
                    width: '100%'
                  }}
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    data-testid="confirm-save-snippet"
                    onClick={handleSaveAction}
                    disabled={isSaving || !newTemplateName.trim()}
                    style={{
                      flex: 1,
                      background: 'hsl(var(--primary))',
                      color: 'white',
                      border: 'none',
                      padding: '4px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {isSaving ? <CircularProgress size={12} /> : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSaveForm(false)}
                    style={{
                      background: 'hsla(var(--muted)/0.5)',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

};
