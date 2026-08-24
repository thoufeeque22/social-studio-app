 
import React from 'react';
import { redirect } from 'next/navigation';
import { Box, Typography, Stack, Divider, Paper } from '@mui/material';
import { auth } from '@/auth';
import { prisma } from '@/lib/core/prisma';
import { ReferralCopier } from '@/components/referral/ReferralCopier';
import { ReferralSquad } from '@/components/referral/ReferralSquad';
import { ReferralProgress } from '@/components/referral/ReferralProgress';

import { ensureReferralCode } from '@/lib/referral/generateCode';
import { computeReferralHistory } from '@/lib/referral/history';
import { ReferralHeader } from '@/components/referral/ReferralHeader';
import { ReferralProTip } from '@/components/referral/ReferralProTip';
import { RetroactiveCodeInput } from '@/components/referral/RetroactiveCodeInput';

export default async function ReferralPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      referrals: {
        include: { billingProfile: true }
      },
      billingProfile: true
    }
  });

  if (!user) {
    redirect('/login');
  }

  const { referralUrl } = await ensureReferralCode(user);
  const history = computeReferralHistory(user.referrals);
  const activeCount = history.filter(h => h.status === 'Active').length;

  const subscriptionTier = user.billingProfile?.subscriptionTier || 'FREE_STARTER';
  const progressPercent = Math.min((activeCount / 5) * 100, 100);
  const isGrandPrize = activeCount >= 5;

  const isFree = subscriptionTier.startsWith('FREE_');
  const isLifetime = subscriptionTier === 'LIFETIME_DEAL';
  const isCloudPro = subscriptionTier === 'CLOUD_PRO';
  
  const hasClaimed = isLifetime || isCloudPro || user.lifetimeUnlock;

  const progressDesc = isFree
    ? 'Get 5 paid referrals for Lifetime BYOK, or maintain 5 active to keep a Pro plan free forever.'
    : (isLifetime
        ? 'You already have Lifetime Access! Every paid referral you bring in grants you a massive +1,000 AI Credits.'
        : 'Get 5 total paid referrals for Lifetime BYOK, or maintain 5 active to keep your current subscription 100% free forever.');

  return (
    <Box sx={{ maxWidth: '800px', mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Paper elevation={0} sx={{ 
        borderRadius: 3, 
        overflow: 'hidden', 
        border: '1px solid', 
        borderColor: 'divider',
        mb: 4
      }}>
        <ReferralHeader isFree={isFree} isLifetime={isLifetime} />

        <Box sx={{ p: { xs: 3, md: 6 } }}>
          <Stack spacing={5}>
            {!user.referredById && <RetroactiveCodeInput />}
            
            <ReferralCopier referralUrl={referralUrl} />

            <ReferralProTip isFree={isFree} />

            <ReferralProgress 
              quotaRemaining={user.extraPostsQuota}
              aiCredits={user.aiCredits}
              isFree={isFree}
              isLifetime={isLifetime}
              activeCount={activeCount}
              progressPercent={progressPercent}
              isGrandPrize={isGrandPrize}
              progressDesc={progressDesc}
              hasClaimed={hasClaimed}
              earnedFreeMonths={user.earnedFreeMonths}
            />

            <Divider />

            <ReferralSquad history={history} />
            
            <Typography variant="body2" color="text.secondary" align="center" sx={{ display: 'block', pt: 2 }}>
              By sharing your link, you agree to our <a href="/referral-terms" style={{ color: 'inherit', textDecoration: 'underline' }}>Referral Program Terms</a>.
            </Typography>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
