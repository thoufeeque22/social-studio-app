import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginPage from '../../app/login/page';
import { signIn } from 'next-auth/react';

// Use the mocks from setup.ts, but specifically import signIn to check calls
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the login page with all social options', () => {
    render(<LoginPage />);
    
    expect(screen.getByText('Social Studio')).toBeInTheDocument();
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    expect(screen.getByText('Continue with Facebook')).toBeInTheDocument();
    expect(screen.getByText('Continue with TikTok')).toBeInTheDocument();
  });

  it('triggers Google sign-in immediately without showing the warning modal', () => {
    render(<LoginPage />);
    
    const googleBtn = screen.getByText('Continue with Google');
    fireEvent.click(googleBtn);

    // Should call signIn directly
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
    
    // Warning modal content should NOT be visible
    expect(screen.queryByText('Unified Identity Check')).not.toBeInTheDocument();
  });

  it('intercepts TikTok login and shows the warning modal', () => {
    render(<LoginPage />);
    
    const tiktokBtn = screen.getByText('Continue with TikTok');
    fireEvent.click(tiktokBtn);

    // Warning modal should appear
    expect(screen.getByText('Unified Identity Check')).toBeInTheDocument();
    expect(screen.getByText(/Logging in with tiktok/i)).toBeInTheDocument();

    // signIn should NOT have been called yet
    expect(signIn).not.toHaveBeenCalled();
  });

  it('allows user to bypass the warning and continue with TikTok', () => {
    render(<LoginPage />);
    
    // 1. Trigger warning
    fireEvent.click(screen.getByText('Continue with TikTok'));
    
    // 2. Click "Continue anyway"
    const continueBtn = screen.getByText(/Continue with tiktok anyway/i);
    fireEvent.click(continueBtn);

    // Now it should call signIn
    expect(signIn).toHaveBeenCalledWith('tiktok', { callbackUrl: '/' });
    
    // Modal should be gone
    expect(screen.queryByText('Unified Identity Check')).not.toBeInTheDocument();
  });

  it('allows user to go back to Google from the warning modal', () => {
    render(<LoginPage />);
    
    // 1. Trigger warning via Facebook
    fireEvent.click(screen.getByText('Continue with Facebook'));
    
    // 2. Click "Back to Google"
    const backBtn = screen.getByText(/Back to Google/i);
    fireEvent.click(backBtn);

    // It should call signIn for google instead of facebook
    expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/' });
    expect(signIn).not.toHaveBeenCalledWith('facebook', { callbackUrl: '/' });
    
    // Modal should be gone
    expect(screen.queryByText('Unified Identity Check')).not.toBeInTheDocument();
  });

  it('closes the modal when clicking the close button', () => {
    render(<LoginPage />);
    
    // 1. Trigger warning
    fireEvent.click(screen.getByText('Continue with TikTok'));
    expect(screen.getByText('Unified Identity Check')).toBeInTheDocument();

    // 2. Click Close (X)
    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);

    // Modal should be gone
    expect(screen.queryByText('Unified Identity Check')).not.toBeInTheDocument();
  });
});
