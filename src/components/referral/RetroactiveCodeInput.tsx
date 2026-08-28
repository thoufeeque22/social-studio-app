'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import { useRouter } from 'next/navigation';

export function RetroactiveCodeInput() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/referral/retroactive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ referralCode: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit referral code');
      }

      setSuccess(true);
      
      // Refresh the page to hide the input and show updated quotas
      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Alert severity="success" sx={{ mb: 4 }}>
        Referral code applied successfully! Updating your rewards...
      </Alert>
    );
  }

  return (
    <Box sx={{ mb: 4, p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Typography variant="h6" gutterBottom>
        Did a friend refer you?
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Enter their referral code below to claim your sign-up rewards.
      </Typography>

      <form onSubmit={handleSubmit}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Enter referral code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={loading}
            fullWidth
            sx={{ maxWidth: { sm: '300px' } }}
          />
          <Button 
            variant="contained" 
            color="primary" 
            type="submit" 
            disabled={!code.trim() || loading}
            sx={{ minWidth: '120px' }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Apply Code'}
          </Button>
        </Stack>
      </form>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}
