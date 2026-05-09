import { useState, useEffect } from 'react';

export function useUploadForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [platformTitles, setPlatformTitles] = useState<Record<string, string>>({});
  const [platformDescriptions, setPlatformDescriptions] = useState<Record<string, string>>({});
  const [isPlatformSpecific, setIsPlatformSpecific] = useState(false);
  const [titleUndo, setTitleUndo] = useState<string | null>(null);
  const [descUndo, setDescUndo] = useState<string | null>(null);

  // Sync with localStorage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem('SS_DRAFT_TITLE') || '';
    const savedDesc = localStorage.getItem('SS_DRAFT_DESC') || '';
    setTitle(savedTitle);
    setDescription(savedDesc);
    
    const savedIsPlatformSpecific = localStorage.getItem('SS_METADATA_SPECIFIC') === 'true';
    setIsPlatformSpecific(savedIsPlatformSpecific);

    try {
      const savedPlatformTitles = JSON.parse(localStorage.getItem('SS_PLATFORM_TITLES') || '{}');
      const savedPlatformDescs = JSON.parse(localStorage.getItem('SS_PLATFORM_DESCS') || '{}');
      setPlatformTitles(savedPlatformTitles);
      setPlatformDescriptions(savedPlatformDescs);
    } catch (e) {
      console.error("Failed to load platform-specific metadata", e);
    }
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    localStorage.setItem('SS_DRAFT_TITLE', val);
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    localStorage.setItem('SS_DRAFT_DESC', val);
  };

  const handlePlatformTitleChange = (platform: string, val: string) => {
    setPlatformTitles(prev => {
      const next = { ...prev, [platform]: val };
      localStorage.setItem('SS_PLATFORM_TITLES', JSON.stringify(next));
      return next;
    });
  };

  const handlePlatformDescriptionChange = (platform: string, val: string) => {
    setPlatformDescriptions(prev => {
      const next = { ...prev, [platform]: val };
      localStorage.setItem('SS_PLATFORM_DESCS', JSON.stringify(next));
      return next;
    });
  };

  const togglePlatformSpecific = (val: boolean) => {
    setIsPlatformSpecific(val);
    localStorage.setItem('SS_METADATA_SPECIFIC', String(val));
  };

  const handleClearTitle = () => {
    setTitleUndo(title);
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
    setDescUndo(description);
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
    title,
    description,
    platformTitles,
    platformDescriptions,
    isPlatformSpecific,
    titleUndo,
    descUndo,
    handleTitleChange,
    handleDescriptionChange,
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
