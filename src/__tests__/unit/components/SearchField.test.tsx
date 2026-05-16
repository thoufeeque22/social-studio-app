import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchField } from '@/components/ui/SearchField';
import React from 'react';

describe('SearchField', () => {
  it('renders correctly with placeholder', () => {
    render(<SearchField value="" onChange={() => {}} placeholder="Search history..." />);
    expect(screen.getByPlaceholderText('Search history...')).toBeDefined();
  });

  it('displays the correct value', () => {
    render(<SearchField value="test query" onChange={() => {}} />);
    expect(screen.getByDisplayValue('test query')).toBeDefined();
  });

  it('calls onChange when typing', () => {
    const handleChange = vi.fn();
    render(<SearchField value="" onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new search' } });
    
    expect(handleChange).toHaveBeenCalledWith('new search');
  });
});
