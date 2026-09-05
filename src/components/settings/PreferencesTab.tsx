'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Box, Typography, Snackbar, Alert, CircularProgress, FormControlLabel, Switch, Checkbox, FormGroup } from '@mui/material';
import { GlassCard } from '@/components/ui/GlassCard';
import { getUserPreferencesAction, updateUserPreferencesAction } from '@/lib/actions/settings-preferences';
import { TimezonePicker } from '@/components/settings/TimezonePicker';

const PLATFORMS = ['TikTok', 'Instagram', 'X/Twitter', 'LinkedIn', 'Facebook', 'Pinterest', 'Reddit'];

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

        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Notifications</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel 
              control={<Switch name="emailNotifications" checked={preference?.emailNotifications ?? true} onChange={(e) => handleChange('emailNotifications', e.target.checked)} />} 
              label="Email Notifications" 
            />
            <FormControlLabel 
              control={<Switch checked={preference?.inAppNotifications ?? true} onChange={(e) => handleChange('inAppNotifications', e.target.checked)} />} 
              label="In-App Notifications" 
            />
            <FormControlLabel 
              control={<Switch checked={preference?.pushNotifications ?? false} onChange={(e) => handleChange('pushNotifications', e.target.checked)} />} 
              label="Push Notifications" 
            />
          </Box>
        </Box>

        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>Platform Preferences</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Select the platforms you use to post videos.</Typography>
          <FormGroup sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1 }}>
            {PLATFORMS.map((platform) => (
              <FormControlLabel
                key={platform}
                control={
                  <Checkbox 
                    checked={(preference?.onboardingSocialPlatforms || []).includes(platform)} 
                    onChange={() => handlePlatformToggle(platform)} 
                  />
                }
                label={platform}
              />
            ))}
          </FormGroup>
        </Box>
      </Box>
      
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </GlassCard>
  );
};
