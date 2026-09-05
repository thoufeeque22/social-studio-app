import React from 'react';
import { Box, Typography, Switch, FormControlLabel } from '@mui/material';

interface DisplayPreferencesProps {
  showTimeIndicator: boolean;
  onChange: (field: string, value: boolean) => void;
}

export const DisplayPreferences = ({ showTimeIndicator, onChange }: DisplayPreferencesProps) => {
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Display Settings
      </Typography>
      <FormControlLabel
        control={
          <Switch
            checked={showTimeIndicator}
            onChange={(e) => onChange('showTimeIndicator', e.target.checked)}
            data-testid="show-time-indicator-toggle"
          />
        }
        label="Show Global Time Indicator"
      />
    </Box>
  );
};
