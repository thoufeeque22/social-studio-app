import { useState, useEffect } from 'react';

export function useUploadForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [titleUndo, setTitleUndo] = useState<string | null>(null);
  const [descUndo, setDescUndo] = useState<string | null>(null);

  // Sync with localStorage on mount
  useEffect(() => {
    const savedTitle = localStorage.getItem('SS_DRAFT_TITLE') || '';
    const savedDesc = localStorage.getItem('SS_DRAFT_DESC') || '';
    setTitle(savedTitle);
    setDescription(savedDesc);
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    localStorage.setItem('SS_DRAFT_TITLE', val);
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    localStorage.setItem('SS_DRAFT_DESC', val);
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
    titleUndo,
    descUndo,
    handleTitleChange,
    handleDescriptionChange,
    handleClearTitle,
    handleUndoTitle,
    handleClearDesc,
    handleUndoDesc,
    resetForm
  };
}
