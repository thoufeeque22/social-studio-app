import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as roadmapGET } from '../../app/api/roadmap/route';
import { GET as launchGET } from '../../app/api/launch/route';
import { render, screen } from '@testing-library/react';
import { UploadForm } from '../../components/dashboard/UploadForm';
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
}));

describe('Project Management & UI Humanization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    const mockLocalStorage = {
      getItem: vi.fn().mockReturnValue(''),
      setItem: vi.fn(),
      clear: vi.fn(),
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
    const mockProps: any = {
      isUploading: false,
      uploadStatus: null,
      accounts: [],
      preferences: [],
      selectedAccountIds: [],
      successfulAccountIds: [],
      platformStatuses: {},
      contentMode: 'Hook',
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
      onSubmit: vi.fn(),
      isScheduled: false,
      scheduledAt: '',
      onSchedulingChange: vi.fn(),
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
