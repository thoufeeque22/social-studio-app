import React from 'react';
import { Box, Typography, FormGroup, FormControlLabel, Checkbox } from '@mui/material';
import { SURVEY_SOCIAL_PLATFORMS } from '@/lib/core/constants';

interface PlatformPreferencesProps {
  selectedPlatforms: string[];
  onChange: (platform: string) => void;
}

export const PlatformPreferences: React.FC<PlatformPreferencesProps> = ({ selectedPlatforms, onChange }) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Platform Preferences</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Select the platforms you use to post videos.</Typography>
      <FormGroup sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 1 }}>
        {SURVEY_SOCIAL_PLATFORMS.map((platform) => (
          <FormControlLabel
            key={platform}
            control={
              <Checkbox 
                checked={selectedPlatforms.includes(platform)} 
                onChange={() => onChange(platform)} 
              />
            }
            label={platform}
          />
        ))}
      </FormGroup>
    </Box>
  );
};
