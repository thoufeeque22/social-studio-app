'use client';

import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday
} from 'date-fns';
import { Tooltip } from '@mui/material';
import styles from './calendar.module.css';

interface PlatformResult {
  id: string;
  platform: string;
  accountId: string | null;
}

interface PostHistoryEntry {
  id: string;
  title: string;
  description: string | null;
  videoFormat: string;
  scheduledAt: string;
  createdAt: string;
  isPublished: boolean;
  stagedFileId: string | null;
  platforms: PlatformResult[];
}

interface CalendarViewProps {
  posts: PostHistoryEntry[];
  currentDate: Date;
  viewType: 'month' | 'week';
  onViewTypeChange: (type: 'month' | 'week') => void;
  onEditPost: (post: PostHistoryEntry) => void;
}

export function CalendarView({ 
  posts, 
  currentDate, 
  viewType, 
  onViewTypeChange, 
  onEditPost 
}: CalendarViewProps) {
  
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className={styles.calendarGrid}>
        {weekdays.map((day) => (
          <div key={day} className={styles.weekdayHeader}>
            {day}
          </div>
        ))}
        {calendarDays.map((day) => {
          const dayPosts = posts.filter((post) => {
            const date = post.scheduledAt ? new Date(post.scheduledAt) : new Date(post.createdAt);
            return isSameDay(date, day);
          });

          return (
            <div 
              key={day.toString()} 
              className={`
                ${styles.dayCell} 
                ${!isSameMonth(day, monthStart) ? styles.notCurrentMonth : ''}
                ${isToday(day) ? styles.today : ''}
              `}
            >
              <div className={styles.dayNumber}>{format(day, 'd')}</div>
              <div className={styles.postsContainer}>
                {dayPosts.map((post) => (
                  <Tooltip 
                    key={post.id} 
                    title={`${post.title}${post.isPublished ? ' (Published)' : ' (Scheduled)'}`} 
                    arrow
                  >
                    <div 
                      className={`
                        ${styles.calendarPost} 
                        ${post.videoFormat === 'short' ? styles.calendarPostShort : styles.calendarPostLong}
                        ${post.isPublished ? styles.publishedPost : ''}
                      `}
                      onClick={() => onEditPost(post)}
                    >
                      {post.isPublished && '✅ '}{post.title}
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(weekStart);
    const days = eachDayOfInterval({
      start: weekStart,
      end: weekEnd,
    });

    return (
      <div className={styles.weeklyGrid}>
        {days.map((day) => {
          const dayPosts = posts.filter((post) => {
            const date = post.scheduledAt ? new Date(post.scheduledAt) : new Date(post.createdAt);
            return isSameDay(date, day);
          });

          return (
            <div key={day.toString()} className={styles.weeklyDayRow}>
              <div className={styles.weeklyDayInfo}>
                <div className={styles.weeklyDayName}>{format(day, 'EEE')}</div>
                <div className={styles.weeklyDayNumber}>{format(day, 'd')}</div>
              </div>
              <div className={styles.weeklyPosts}>
                {dayPosts.length === 0 ? (
                  <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem', opacity: 0.5 }}>
                    No posts scheduled
                  </div>
                ) : (
                  dayPosts.map((post) => {
                    const date = post.scheduledAt ? new Date(post.scheduledAt) : new Date(post.createdAt);
                    return (
                      <div 
                        key={post.id} 
                        className={`${styles.calendarPost} ${post.isPublished ? styles.publishedPost : ''} ${post.videoFormat === 'short' ? styles.calendarPostShort : styles.calendarPostLong}`}
                        style={{ padding: '0.75rem', fontSize: '0.85rem' }}
                        onClick={() => onEditPost(post)}
                      >
                        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                          {post.isPublished && '✅ '}{post.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                          {format(date, 'h:mm a')} • {post.videoFormat === 'short' ? '⚡ Short' : '🎬 Long'}
                          {post.isPublished ? ' • Published' : ' • Scheduled'}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <div style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
          {viewType === 'month' ? 'Monthly Content Planner' : 'Weekly Distribution View'}
        </div>

        <div className={styles.viewControls}>
          <button 
            className={`${styles.viewButton} ${viewType === 'month' ? styles.activeView : ''}`}
            onClick={() => onViewTypeChange('month')}
          >
            Month
          </button>
          <button 
            className={`${styles.viewButton} ${viewType === 'week' ? styles.activeView : ''}`}
            onClick={() => onViewTypeChange('week')}
          >
            Week
          </button>
        </div>
      </div>

      {viewType === 'month' ? renderMonthView() : renderWeekView()}
    </div>
  );
}
