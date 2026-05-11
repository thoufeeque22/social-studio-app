import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as roadmapGET } from '../../app/api/roadmap/route';
import { GET as launchGET } from '../../app/api/launch/route';
import { render, screen } from '@testing-library/react';
import { UploadForm, UploadFormProps } from '../../components/dashboard/UploadForm';
import React from 'react';

// Mock Auth
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'u1' } }),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Pencil: () => <div data-testid="pencil-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
  Film: () => <div data-testid="film-icon" />,
  Sparkles: () => <div data-testid="sparkles-icon" />,
  Wand2: () => <div data-testid="wand-icon" />,
  Layout: () => <div data-testid="layout-icon" />,
  Calendar: () => <div data-testid="calendar-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  History: () => <div data-testid="history-icon" />,
  ArrowRight: () => <div data-testid="arrow-right-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  LogOut: () => <div data-testid="logout-icon" />,
  Bookmark: () => <div data-testid="bookmark-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
  User: () => <div data-testid="user-icon" />,
  MoreHorizontal: () => <div data-testid="more-icon" />,
  ChevronRight: () => <div data-testid="chevron-right-icon" />,
  Globe: () => <div data-testid="globe-icon" />,
  Shield: () => <div data-testid="shield-icon" />,
}));

describe('Project Management & UI Humanization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(''),
      setItem: vi.fn(),
      clear: vi.fn(),
      removeItem: vi.fn(),
      key: vi.fn(),
      length: 0,
    };
    Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage });
  });

  describe('API Security (Production Lockdown)', () => {
    it('returns 404 for Roadmap API in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const res = await roadmapGET();
      expect(res.status).toBe(404);
      vi.unstubAllEnvs();
    });

    it('returns 404 for Launch API in production', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      const res = await launchGET();
      expect(res.status).toBe(404);
      vi.unstubAllEnvs();
    });
  });

  describe('UploadForm UI (Dynamic Metadata)', () => {
    const mockProps: UploadFormProps = {
      isUploading: false,
      uploadStatus: null,
      accounts: [],
      preferences: [],
      selectedAccountIds: [],
      successfulAccountIds: [],
      platformStatuses: {},
      platformErrors: {},
      contentMode: 'Smart',
      aiTier: 'Manual',
      videoFormat: 'short',
      videoDuration: 45, // 45 seconds
      draftFileName: 'dance.mp4',
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
      onAbort: vi.fn(),
      onAbortAll: vi.fn(),
      hasFailures: false,
    };

    it('renders the Short-Form badge with duration', () => {
      render(<UploadForm {...mockProps} />);
      expect(screen.getByText(/Short-Form/i)).toBeTruthy();
      expect(screen.getByText(/• 45s/i)).toBeTruthy();
    });

    it('renders the Long-Form badge with formatted duration (minutes)', () => {
      render(<UploadForm {...mockProps} videoFormat="long" videoDuration={125} />);
      expect(screen.getByText(/Long-Form/i)).toBeTruthy();
      expect(screen.getByText(/• 2m 5s/i)).toBeTruthy();
    });
    
    it('renders the Long-Form badge with formatted duration (hours)', () => {
      render(<UploadForm {...mockProps} videoFormat="long" videoDuration={3665} />);
      expect(screen.getByText(/• 1h 1m 5s/i)).toBeTruthy();
    });

    it('does not show VideoFormatSelector (it was removed)', () => {
      render(<UploadForm {...mockProps} />);
      // VideoFormatSelector had "Target Video Format" label
      expect(screen.queryByText(/Target Video Format/i)).toBeNull();
    });
  });
});

