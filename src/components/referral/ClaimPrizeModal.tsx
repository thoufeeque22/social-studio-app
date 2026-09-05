'use client';

import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, Typography, Button, Stack, CircularProgress } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CloudIcon from '@mui/icons-material/Cloud';
import KeyIcon from '@mui/icons-material/Key';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClaimPrizeModal: React.FC<Props> = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleClaim = async (choice: 'CLOUD_PRO' | 'LIFETIME_DEAL') => {
    setLoading(choice);
    try {
      const res = await fetch('/api/referral/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice })
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error || 'Failed to claim prize');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
      <DialogTitle component="div" sx={{ textAlign: 'center', pt: 4 }}>
        <AutoAwesomeIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Choose Your Reward</Typography>
      </DialogTitle>
      <DialogContent sx={{ pb: 4, px: 4 }}>
        <Typography color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
          You did it! You successfully referred 5 active creators. Choose how you want to scale.
        </Typography>

        <Stack spacing={3}>
          <Box sx={{ border: '2px solid', borderColor: 'primary.main', borderRadius: 2, p: 3, cursor: 'pointer', transition: '0.2s', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => !loading && handleClaim('CLOUD_PRO')}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ p: 1.5, bgcolor: 'primary.light', borderRadius: 2, color: 'primary.dark' }}>
                <CloudIcon />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>100% Free Cloud Pro</Typography>
                <Typography variant="body2" color="text.secondary">We&apos;ll cover the infrastructure. Keep generating content on our servers for free.</Typography>
              </Box>
              {loading === 'CLOUD_PRO' ? <CircularProgress size={24} /> : <Button variant="contained">Select</Button>}
            </Stack>
          </Box>

          <Box sx={{ border: '2px solid', borderColor: 'secondary.main', borderRadius: 2, p: 3, cursor: 'pointer', transition: '0.2s', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => !loading && handleClaim('LIFETIME_DEAL')}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Box sx={{ p: 1.5, bgcolor: 'secondary.light', borderRadius: 2, color: 'secondary.dark' }}>
                <KeyIcon />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Lifetime BYOK</Typography>
                <Typography variant="body2" color="text.secondary">Bring your own API keys. Infinite scalability at wholesale OpenAI prices.</Typography>
              </Box>
              {loading === 'LIFETIME_DEAL' ? <CircularProgress size={24} color="secondary" /> : <Button variant="contained" color="secondary">Select</Button>}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};
