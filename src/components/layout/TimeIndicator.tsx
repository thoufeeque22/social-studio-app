'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Typography, Box } from '@mui/material';
import { getUserPreferencesAction } from '@/lib/actions/settings-preferences';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

const fetcher = async () => {
  try {
    const res = await getUserPreferencesAction();
    if (!res?.success) return null;
    return res.preference;
  } catch {
    return null;
  }
};

export const TimeIndicator = () => {
  const { data: preference } = useSWR('userPreferences', fetcher, {
    revalidateOnFocus: false,
  });
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Update every second to keep it accurate
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted || !preference?.showTimeIndicator) {
    return null;
  }

  const timezone = preference.timezone || 'UTC';

  let timeString = '';
  try {
    timeString = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(currentTime);
  } catch {
    timeString = 'Invalid';
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
      <AccessTimeIcon fontSize="small" sx={{ display: { xs: 'none', sm: 'block' } }} />
      <Typography variant="body2" data-testid="time-indicator" sx={{ whiteSpace: 'nowrap' }}>
        {timeString}
      </Typography>
    </Box>
  );
};
