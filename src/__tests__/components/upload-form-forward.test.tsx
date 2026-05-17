import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UploadForm, UploadFormProps } from '@/components/dashboard/UploadForm';
import { StyleMode, AITier } from '@/lib/core/constants';

// Mock dependencies
vi.mock('@/hooks/dashboard/useUploadForm', () => ({
  useUploadForm: () => ({
    title: '',
    description: '',
    platformTitles: {},
    platformDescriptions: {},
    isPlatformSpecific: false,
    handleTitleChange: vi.fn(),
    handleDescriptionChange: vi.fn(),
    togglePlatformSpecific: vi.fn(),
  }),
}));

describe('UploadForm Props Forwarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(''),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
      length: 0,
      key: vi.fn(),
    };
    Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, writable: true });
  });

  const mockProps: UploadFormProps = {
    isUploading: false,
    accounts: [],
    preferences: [],
    selectedAccountIds: [],
    contentMode: 'Smart' as StyleMode,
    aiTier: 'Manual' as AITier,
    videoFormat: 'short',
    videoDuration: 45,
    draftFileName: 'test.mp4',
    onVisualScan: vi.fn(),
    onTierChange: vi.fn(),
    onModeChange: vi.fn(),
    onToggleAccount: vi.fn(),
    onFileChange: vi.fn(),
    onGallerySelect: vi.fn(),
    onSubmit: vi.fn(),
    isScheduled: false,
    scheduledAt: '',
    onSchedulingChange: vi.fn(),
    customStyleText: '',
    onCustomStyleChange: vi.fn()
  };

  it('renders without crashing with minimal props', () => {
    render(<UploadForm {...mockProps} />);
    expect(screen.getByText('Video Title')).toBeDefined();
  });
});
