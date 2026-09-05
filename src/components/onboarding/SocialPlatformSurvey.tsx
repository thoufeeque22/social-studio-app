'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Button, Stack, Checkbox, FormControlLabel } from '@mui/material';
import { completeOnboarding } from '@/app/(app)/actions/onboarding';
import { SURVEY_SOCIAL_PLATFORMS } from '@/lib/core/constants';

export const SocialPlatformSurvey: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line
    setOpen(true);
  }, []);

  const handleToggle = (platform: string) => {
    setSelected((prev) => 
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await completeOnboarding(selected);
      setOpen(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      await completeOnboarding([]);
      setOpen(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} maxWidth="sm" fullWidth>
      <DialogTitle component="div" sx={{ textAlign: 'center', pt: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Help Us Prioritize!</Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 4, px: 4 }}>
        <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
          Select the platforms you use to post videos so we can prioritize which integrations to build next.
        </Typography>

        <Stack spacing={1} sx={{ mb: 4 }}>
          {SURVEY_SOCIAL_PLATFORMS.map((platform) => (
            <FormControlLabel
              key={platform}
              control={<Checkbox checked={selected.includes(platform)} onChange={() => handleToggle(platform)} />}
              label={platform}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', mb: 2 }}>
          <Button disabled={loading} onClick={handleSkip} color="inherit">
            Skip for now
          </Button>
          <Button disabled={loading} variant="contained" onClick={handleSubmit}>
            Help Us Prioritize!
          </Button>
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
          You can always update this later in Settings &gt; Preferences.
        </Typography>
      </DialogContent>
    </Dialog>
  );
};
