import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UploadForm } from '../../components/dashboard/UploadForm';
import React from 'react';

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Film: () => <div data-testid="film-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
}));

describe('UploadForm Forward Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(''),
      setItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });
  });

  const mockProps: any = {
    isUploading: false,
    uploadStatus: null,
    accounts: [],
    preferences: [],
    selectedAccountIds: [],
    successfulAccountIds: [],
    platformStatuses: {},
    contentMode: 'Smart',
    aiTier: 'Manual',
    videoFormat: 'short',
    videoDuration: 45,
    draftFileName: 'test.mp4',
    onVisualScan: vi.fn(),
    onTierChange: vi.fn(),
    onModeChange: vi.fn(),
    onFormatChange: vi.fn(),
    onToggleAccount: vi.fn(),
    onFileChange: vi.fn(),
    onGallerySelect: vi.fn(),
    onSubmit: vi.fn(),
    isScheduled: false,
    scheduledAt: '',
    onSchedulingChange: vi.fn(),
    isComplete: false,
    customStyleText: '',
    onCustomStyleChange: vi.fn(),
    platformErrors: {},
    onAbort: vi.fn(),
    onAbortAll: vi.fn(),
    hasFailures: false,
  };

  it('does not render "Resume AI Review" button by default', () => {
    render(<UploadForm {...mockProps} />);
    expect(screen.queryByText(/Forward: Resume AI Review/i)).toBeNull();
  });

  it('renders "Resume Review" button when hasCachedPreviews is true', () => {
    render(<UploadForm {...mockProps} hasCachedPreviews={true} onResumeReview={vi.fn()} />);
    expect(screen.getByText(/Forward: Resume Review/i)).toBeTruthy();
  });

  it('calls onResumeReview when "Resume Review" button is clicked', () => {
    const onResumeReview = vi.fn();
    render(<UploadForm {...mockProps} hasCachedPreviews={true} onResumeReview={onResumeReview} />);
    
    const resumeButton = screen.getByText(/Forward: Resume Review/i);
    fireEvent.click(resumeButton);
    
    expect(onResumeReview).toHaveBeenCalledTimes(1);
  });

  it('hides "Resume AI Review" button when isUploading is true', () => {
    render(<UploadForm {...mockProps} hasCachedPreviews={true} isUploading={true} onResumeReview={vi.fn()} />);
    expect(screen.queryByText(/Forward: Resume AI Review/i)).toBeNull();
  });
});
