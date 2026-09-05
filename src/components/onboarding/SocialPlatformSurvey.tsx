'use client';

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Typography, Button, Stack, Checkbox, FormControlLabel } from '@mui/material';
import { completeOnboarding } from '@/app/(app)/actions/onboarding';

const PLATFORMS = ['TikTok', 'Instagram', 'X/Twitter', 'LinkedIn', 'Facebook', 'Pinterest', 'Reddit'];

export const SocialPlatformSurvey: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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
          Which social media platforms do you use? We will prioritize our future integrations based on your feedback.
        </Typography>

        <Stack spacing={1} sx={{ mb: 4 }}>
          {PLATFORMS.map((platform) => (
            <FormControlLabel
              key={platform}
              control={<Checkbox checked={selected.includes(platform)} onChange={() => handleToggle(platform)} />}
              label={platform}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
          <Button disabled={loading} onClick={handleSkip} color="inherit">
            Skip for now
          </Button>
          <Button disabled={loading} variant="contained" onClick={handleSubmit}>
            Help Us Prioritize!
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
