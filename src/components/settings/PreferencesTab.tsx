'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Box, Typography, Snackbar, Alert, CircularProgress } from '@mui/material';
import { GlassCard } from '@/components/ui/GlassCard';
import { getUserPreferencesAction, updateUserPreferencesAction } from '@/lib/actions/settings-preferences';
import { TimezonePicker } from '@/components/settings/TimezonePicker';
import { NotificationPreferences } from './NotificationPreferences';
import { PlatformPreferences } from './PlatformPreferences';
import { DisplayPreferences } from './DisplayPreferences';

const fetcher = async () => {
  try {
    const res = await getUserPreferencesAction();
    if (!res?.success) return null;
    return res.preference;
  } catch {
    return null;
  }
};

export const PreferencesTab = () => {
  const { data: preference, isLoading, mutate } = useSWR('userPreferences', fetcher);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const handleChange = async (field: string, value: string | boolean | string[]) => {
    if (preference === undefined) return;
    
    const newPrefs = {
      timezone: preference?.timezone || 'UTC',
      showTimeIndicator: preference?.showTimeIndicator ?? false,
      emailNotifications: preference?.emailNotifications ?? true,
      inAppNotifications: preference?.inAppNotifications ?? true,
      pushNotifications: preference?.pushNotifications ?? false,
      hasCompletedOnboarding: preference?.hasCompletedOnboarding ?? false,
      onboardingSocialPlatforms: preference?.onboardingSocialPlatforms ?? [],
      [field]: value
    };
    
    mutate(newPrefs as typeof preference, false);
    
    const res = await updateUserPreferencesAction(newPrefs);
    if (res.success && res.preference) {
      setSnackbar({ open: true, message: 'Preferences updated successfully', severity: 'success' });
      mutate(res.preference, false);
    } else {
      setSnackbar({ open: true, message: res.error || 'Failed to update preferences', severity: 'error' });
      mutate();
    }
  };

  const handlePlatformToggle = (platform: string) => {
    const current = preference?.onboardingSocialPlatforms || [];
    const next = current.includes(platform) ? current.filter((p: string) => p !== platform) : [...current, platform];
    handleChange('onboardingSocialPlatforms', next);
  };

  if (isLoading) return <CircularProgress />;

  return (
    <GlassCard style={{ padding: '2rem' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Preferences</Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>Customize your experience and notifications.</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <TimezonePicker
          value={preference?.timezone || 'UTC'}
          onChange={(tz) => handleChange('timezone', tz)}
        />
        
        <DisplayPreferences
          showTimeIndicator={preference?.showTimeIndicator ?? false}
          onChange={handleChange}
        />

        <NotificationPreferences
          emailNotifications={preference?.emailNotifications ?? true}
          inAppNotifications={preference?.inAppNotifications ?? true}
          pushNotifications={preference?.pushNotifications ?? false}
          onChange={handleChange}
        />

        <PlatformPreferences
          selectedPlatforms={preference?.onboardingSocialPlatforms || []}
          onChange={handlePlatformToggle}
        />
      </Box>
      
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </GlassCard>
  );
};
