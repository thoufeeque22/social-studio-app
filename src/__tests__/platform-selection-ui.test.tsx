import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlatformSelection } from '../components/dashboard/UploadForm/PlatformSelection';
import React from 'react';

describe('PlatformSelection UI', () => {
  const mockAccounts = [
    { id: '1', provider: 'google', accountName: 'YT Acc', isDistributionEnabled: true },
    { id: '2', provider: 'facebook', accountName: 'FB Acc', isDistributionEnabled: true }
  ];

  it('renders progress pulse when status is uploading', () => {
    const platformStatuses = {
      '1': 'uploading' as const
    };

    render(
      <PlatformSelection
        accounts={mockAccounts as any}
        selectedAccountIds={['1']}
        successfulAccountIds={[]}
        platformStatuses={platformStatuses}
        onToggleAccount={() => {}}
      />
    );

    // Check if the platform button has the progress strip
    const ytButton = screen.getByRole('button', { name: /youtube/i });
    expect(ytButton.outerHTML).toContain('width: 40%');
    expect(ytButton.innerHTML).toContain('animate-spin'); 
  });

  it('renders success checkmark when status is success', () => {
    const platformStatuses = {
      '1': 'success' as const
    };

    render(
      <PlatformSelection
        accounts={mockAccounts as any}
        selectedAccountIds={['1']}
        successfulAccountIds={['1']}
        platformStatuses={platformStatuses}
        onToggleAccount={() => {}}
      />
    );

    const ytButton = screen.getByRole('button', { name: /youtube/i });
    expect(ytButton.querySelector('polyline')).toBeTruthy();
  });

  it('renders error icon when status is failed', () => {
    const platformStatuses = {
      '1': 'failed' as const
    };

    render(
      <PlatformSelection
        accounts={mockAccounts as any}
        selectedAccountIds={['1']}
        successfulAccountIds={[]}
        platformStatuses={platformStatuses}
        onToggleAccount={() => {}}
      />
    );

    const ytButton = screen.getByRole('button', { name: /youtube/i });
    expect(ytButton.textContent).toContain('❌');
  });
});
