import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarView } from '@/components/schedule/CalendarView';
import { format, addMonths } from 'date-fns';
import { vi, describe, it, expect } from 'vitest';

const mockPosts = [
  {
    id: '1',
    title: 'Post 1',
    description: 'Desc 1',
    videoFormat: 'short',
    scheduledAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    isPublished: false,
    stagedFileId: 'file1',
    platforms: [{ id: 'p1', platform: 'youtube', accountId: 'a1' }]
  },
  {
    id: '2',
    title: 'Post 2',
    description: 'Desc 2',
    videoFormat: 'long',
    scheduledAt: addMonths(new Date(), 1).toISOString(),
    createdAt: addMonths(new Date(), 1).toISOString(),
    isPublished: true,
    stagedFileId: 'file2',
    platforms: [{ id: 'p2', platform: 'instagram', accountId: 'a2' }]
  }
];

describe('CalendarView', () => {
  it('renders without crashing', () => {
    render(
      <CalendarView 
        posts={mockPosts} 
        currentDate={new Date()} 
        viewType="month"
        onEditPost={() => {}} 
      />
    );
  });

  it('shows posts on the correct day in month view', () => {
    render(
      <CalendarView 
        posts={mockPosts} 
        currentDate={new Date()} 
        viewType="month"
        onEditPost={() => {}} 
      />
    );
    expect(screen.getByText('Post 1')).toBeInTheDocument();
  });

  it('calls onEditPost when a post is clicked', () => {
    const onEditPost = vi.fn();
    render(
      <CalendarView 
        posts={mockPosts} 
        currentDate={new Date()} 
        viewType="month"
        onEditPost={onEditPost} 
      />
    );
    
    const post = screen.getByText('Post 1');
    fireEvent.click(post);
    
    expect(onEditPost).toHaveBeenCalledWith(mockPosts[0]);
  });

  it('shows checkmark for published posts', () => {
    // Render with currentDate set to next month where mockPost[1] is
    render(
      <CalendarView 
        posts={mockPosts} 
        currentDate={addMonths(new Date(), 1)} 
        viewType="month"
        onEditPost={() => {}} 
      />
    );
    
    expect(screen.getByText('✅ Post 2')).toBeInTheDocument();
  });
});
