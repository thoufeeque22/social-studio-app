import { render, screen, fireEvent } from '@testing-library/react';
import { AINudge } from '@/components/ui/AINudge';
import { vi, describe, it, expect, beforeEach, afterAll } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('AINudge', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly when not dismissed', async () => {
    render(<AINudge featureKey="test_feature" message="Try this" />);
    expect(await screen.findByText('Try this')).toBeInTheDocument();
  });

  it('does not render if previously dismissed', () => {
    localStorage.setItem('ai_nudge_dismissed_test_feature', 'true');
    const { container } = render(<AINudge featureKey="test_feature" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dismisses when close button is clicked and saves to localStorage', async () => {
    render(<AINudge featureKey="test_feature" message="Try this" />);
    const closeButton = await screen.findByLabelText('Dismiss suggestion');
    
    fireEvent.click(closeButton);
    
    expect(localStorage.getItem('ai_nudge_dismissed_test_feature')).toBe('true');
    expect(screen.queryByText('Try this')).not.toBeInTheDocument();
  });

  it('calls onClick when the component body is clicked', async () => {
    const handleClick = vi.fn();
    render(<AINudge featureKey="test_feature" message="Try this" onClick={handleClick} />);
    
    const textElement = await screen.findByText('Try this');
    const body = textElement.parentElement!;
    fireEvent.click(body);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
