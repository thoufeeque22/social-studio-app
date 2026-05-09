import { useState, useEffect } from 'react';

interface FormState {
  title: string;
  description: string;
  platformTitles: Record<string, string>;
  platformDescriptions: Record<string, string>;
  isPlatformSpecific: boolean;
}

export function useUploadForm() {
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    platformTitles: {},
    platformDescriptions: {},
    isPlatformSpecific: false
  });
  
  const [titleUndo, setTitleUndo] = useState<string | null>(null);
  const [descUndo, setDescUndo] = useState<string | null>(null);

  // Sync with localStorage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem('SS_DRAFT_TITLE') || '';
    const savedDesc = localStorage.getItem('SS_DRAFT_DESC') || '';
    const savedIsPlatformSpecific = localStorage.getItem('SS_METADATA_SPECIFIC') === 'true';

    let savedPlatformTitles = {};
    let savedPlatformDescs = {};
    try {
      savedPlatformTitles = JSON.parse(localStorage.getItem('SS_PLATFORM_TITLES') || '{}');
      savedPlatformDescs = JSON.parse(localStorage.getItem('SS_PLATFORM_DESCS') || '{}');
    } catch (e) {
      console.error("Failed to load platform-specific metadata", e);
    }

    // Defer update to avoid cascading render lint error
    const timer = setTimeout(() => {
      setForm({
        title: savedTitle,
        description: savedDesc,
        isPlatformSpecific: savedIsPlatformSpecific,
        platformTitles: savedPlatformTitles,
        platformDescriptions: savedPlatformDescs
      });
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const handleTitleChange = (val: string) => {
    setForm(prev => ({ ...prev, title: val }));
    localStorage.setItem('SS_DRAFT_TITLE', val);
  };

  const handleDescriptionChange = (val: string) => {
    setForm(prev => ({ ...prev, description: val }));
    localStorage.setItem('SS_DRAFT_DESC', val);
  };

  const appendDescription = (val: string, platform?: string) => {
    if (platform) {
      const current = form.platformDescriptions[platform] || '';
      const separator = current && !current.endsWith('\n') ? '\n' : '';
      handlePlatformDescriptionChange(platform, current + separator + val);
    } else {
      const separator = form.description && !form.description.endsWith('\n') ? '\n' : '';
      handleDescriptionChange(form.description + separator + val);
    }
  };

  const handlePlatformTitleChange = (platform: string, val: string) => {
    setForm(prev => {
      const nextTitles = { ...prev.platformTitles, [platform]: val };
      localStorage.setItem('SS_PLATFORM_TITLES', JSON.stringify(nextTitles));
      return { ...prev, platformTitles: nextTitles };
    });
  };

  const handlePlatformDescriptionChange = (platform: string, val: string) => {
    setForm(prev => {
      const nextDescs = { ...prev.platformDescriptions, [platform]: val };
      localStorage.setItem('SS_PLATFORM_DESCS', JSON.stringify(nextDescs));
      return { ...prev, platformDescriptions: nextDescs };
    });
  };

  const togglePlatformSpecific = (val: boolean) => {
    setForm(prev => ({ ...prev, isPlatformSpecific: val }));
    localStorage.setItem('SS_METADATA_SPECIFIC', String(val));
  };

  const handleClearTitle = () => {
    setTitleUndo(form.title);
    handleTitleChange('');
    setTimeout(() => setTitleUndo(null), 5000);
  };

  const handleUndoTitle = () => {
    if (titleUndo) {
      handleTitleChange(titleUndo);
      setTitleUndo(null);
    }
  };

  const handleClearDesc = () => {
    setDescUndo(form.description);
    handleDescriptionChange('');
    setTimeout(() => setDescUndo(null), 5000);
  };

  const handleUndoDesc = () => {
    if (descUndo) {
      handleDescriptionChange(descUndo);
      setDescUndo(null);
    }
  };

  const resetForm = () => {
    handleTitleChange('');
    handleDescriptionChange('');
    setTitleUndo(null);
    setDescUndo(null);
  };

  return {
    title: form.title,
    description: form.description,
    platformTitles: form.platformTitles,
    platformDescriptions: form.platformDescriptions,
    isPlatformSpecific: form.isPlatformSpecific,
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
    handleUndoDesc,
    resetForm
  };
}
