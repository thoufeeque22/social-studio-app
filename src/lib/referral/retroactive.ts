import { prisma } from '@/lib/core/prisma';
import { processReferralReward } from '@/lib/referral/reward';
import type { User, BillingProfile } from '@prisma/client';

export async function processRetroactiveSocialReward(
  currentUserId: string,
  currentUser: User,
  referrerId: string
) {
  const linkedAccount = await prisma.account.findFirst({
    where: { userId: currentUserId },
  });

  if (linkedAccount && currentUser.emailVerified && !currentUser.referralRewardClaimed) {
    const { provider, providerAccountId } = linkedAccount;

    const existingClaim = await prisma.claimedSocialAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    });

    if (!existingClaim) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.claimedSocialAccount.create({
            data: { provider, providerAccountId },
          });

          await tx.user.update({
            where: { id: currentUserId },
            data: {
              referralRewardClaimed: true,
              extraPostsQuota: { increment: 1 },
            },
          });

          const rProfile = await tx.billingProfile.findUnique({
            where: { userId: referrerId },
          });
          const isFree = (rProfile?.subscriptionTier || 'FREE_STARTER') === 'FREE_STARTER';

          await tx.user.update({
            where: { id: referrerId },
            data: isFree
              ? { extraPostsQuota: { increment: 1 } }
              : { aiCredits: { increment: 50 } },
          });

          await tx.notification.createMany({
            data: [
              {
                userId: referrerId,
                type: 'SUCCESS',
                message: isFree
                  ? 'Your friend signed up! You received +1 Extra Post Quota.'
                  : 'Your friend signed up! You received +50 AI Credits.',
              },
              {
                userId: currentUserId,
                type: 'SUCCESS',
                message: 'You received +1 Extra Post Quota for signing up via referral!',
              },
            ],
          });
        });
      } catch (error) {
        console.error('[Retroactive Referral] Social account already claimed or error:', error);
      }
    }
  }
}

export async function processRetroactivePaidReward(currentUser: User & { billingProfile: BillingProfile | null }) {
  if (currentUser.billingProfile && currentUser.email) {
    const { subscriptionStatus, subscriptionTier } = currentUser.billingProfile;
    if (subscriptionStatus === 'ACTIVE' && subscriptionTier !== 'FREE_STARTER') {
      try {
        await processReferralReward(currentUser.email, 'retroactive_' + currentUser.id);
      } catch (error) {
        console.error('[Retroactive Referral] Failed to process paid reward:', error);
      }
    }
  }
}
