'use client';

import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  addWeeks,
  subWeeks,
  isToday
} from 'date-fns';
import { IconButton, Tooltip } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
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
  onEditPost: (post: PostHistoryEntry) => void;
}

export function CalendarView({ posts, onEditPost }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<'month' | 'week'>('month');

  const nextPeriod = () => {
    if (viewType === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const prevPeriod = () => {
    if (viewType === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(subWeeks(currentDate, 1));
    }
  };

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
                        className={`${styles.calendarPost} ${post.isPublished ? styles.publishedPost : ''}`}
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
        <div className={styles.navigation}>
          <IconButton onClick={prevPeriod} size="small">
            <ChevronLeftIcon />
          </IconButton>
          <div className={styles.currentPeriod}>
            {viewType === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : `Week of ${format(startOfWeek(currentDate), 'MMM d, yyyy')}`
            }
          </div>
          <IconButton onClick={nextPeriod} size="small">
            <ChevronRightIcon />
          </IconButton>
          <button 
            className={styles.viewButton} 
            onClick={() => setCurrentDate(new Date())}
            style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}
          >
            Today
          </button>
        </div>

        <div className={styles.viewControls}>
          <button 
            className={`${styles.viewButton} ${viewType === 'month' ? styles.activeView : ''}`}
            onClick={() => setViewType('month')}
          >
            Month
          </button>
          <button 
            className={`${styles.viewButton} ${viewType === 'week' ? styles.activeView : ''}`}
            onClick={() => setViewType('week')}
          >
            Week
          </button>
        </div>
      </div>

      {viewType === 'month' ? renderMonthView() : renderWeekView()}
    </div>
  );
}
