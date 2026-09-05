import React from 'react';
import { Box, Typography, FormControlLabel, Switch } from '@mui/material';

interface NotificationPreferencesProps {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
  onChange: (field: string, value: boolean) => void;
}

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  emailNotifications,
  inAppNotifications,
  pushNotifications,
  onChange,
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Notifications</Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <FormControlLabel 
          control={<Switch name="emailNotifications" checked={emailNotifications} onChange={(e) => onChange('emailNotifications', e.target.checked)} />} 
          label="Email Notifications" 
        />
        <FormControlLabel 
          control={<Switch checked={inAppNotifications} onChange={(e) => onChange('inAppNotifications', e.target.checked)} />} 
          label="In-App Notifications" 
        />
        <FormControlLabel 
          control={<Switch checked={pushNotifications} onChange={(e) => onChange('pushNotifications', e.target.checked)} />} 
          label="Push Notifications" 
        />
      </Box>
    </Box>
  );
};
