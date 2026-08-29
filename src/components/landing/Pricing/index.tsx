'use client';

import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Grid, Chip, Snackbar, Alert } from '@mui/material';
import { PricingCard } from './PricingCard';
import { pricingTiers } from '../data';
import { useSearchParams } from 'next/navigation';
import { PowerPass } from './PowerPass';
import { PowerUserSection } from './PowerUserSection';
import { AgencySection } from './AgencySection';
import { ComparisonMatrix } from '@/components/pricing/ComparisonMatrix';

export const Pricing = () => {
  const coreTiers = pricingTiers.filter(t => ['free-starter', 'creator-pro', 'cloud-pro'].includes(t.id));
  const powerPass = pricingTiers.find(t => t.id === 'power-pass');
  const lifetimeTier = pricingTiers.find(t => t.id === 'lifetime-deal');
  const hackerTier = pricingTiers.find(t => t.id === 'free-hacker');
  const agencyTier = pricingTiers.find(t => t.id === 'agency-pro');

  const searchParams = useSearchParams();
  const [snackbar, setSnackbar] = useState(false);

  useEffect(() => {
    if (searchParams?.get('canceled') === 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSnackbar(true);
      window.history.replaceState({}, '', '/pricing');
    }
  }, [searchParams]);

  return (
    <Box id="pricing" sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.default' }}>
      <Snackbar open={snackbar} autoHideDuration={6000} onClose={() => setSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="info" sx={{ width: '100%' }}>Checkout was canceled. You have not been charged.</Alert>
      </Snackbar>
      <Container maxWidth="lg">
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Chip 
            label="🎉 Early Bird Launch Pricing: 50% off for first 1,000 users. Lock in your rate forever." 
            color="primary" 
            variant="outlined"
            sx={{ mb: 3, fontWeight: 700, borderWidth: 2 }} 
          />
          <Typography variant="h2" sx={{ fontWeight: 800, mb: 3 }}>
            Simple, Honest Pricing
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 750, mx: 'auto', fontWeight: 400 }}>
            No hidden fees. No middleman markup. Select the plan that fits your workflow.
          </Typography>
        </Box>

        <PowerPass powerPass={powerPass} />

        <Grid container spacing={4} sx={{ justifyContent: 'center', mb: 10 }}>
          {coreTiers.map((tier, index) => (
            <Grid size={{ xs: 12, md: 4 }} key={index}>
              <PricingCard tier={tier} />
            </Grid>
          ))}
        </Grid>

        <PowerUserSection lifetimeTier={lifetimeTier} hackerTier={hackerTier} />
      </Container>
      
      <ComparisonMatrix />

      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <AgencySection agencyTier={agencyTier} />
      </Container>
    </Box>
  );
};
