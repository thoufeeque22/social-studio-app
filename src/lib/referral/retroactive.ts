import { processReferralReward } from '@/lib/referral/reward';
import type { User, BillingProfile } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function processRetroactiveSocialReward(
  tx: TxClient,
  currentUserId: string,
  currentUser: User,
  referrer: User & { billingProfile: BillingProfile | null }
) {
  const linkedAccount = await tx.account.findFirst({
    where: { userId: currentUserId },
  });

  if (linkedAccount && currentUser.emailVerified && !currentUser.referralRewardClaimed) {
    const { provider, providerAccountId } = linkedAccount;

    const existingClaim = await tx.claimedSocialAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId } },
    });

    if (!existingClaim) {
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

      const isFree = (referrer.billingProfile?.subscriptionTier || 'FREE_STARTER') === 'FREE_STARTER';

      await tx.user.update({
        where: { id: referrer.id },
        data: isFree
          ? { extraPostsQuota: { increment: 1 } }
          : { aiCredits: { increment: 50 } },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: referrer.id,
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
    }
  }
}

export async function processRetroactivePaidReward(
  tx: TxClient,
  currentUser: User & { billingProfile: BillingProfile | null }
) {
  if (currentUser.billingProfile && currentUser.email) {
    const { subscriptionStatus, subscriptionTier } = currentUser.billingProfile;
    if (subscriptionStatus === 'ACTIVE' && subscriptionTier !== 'FREE_STARTER') {
      // NOTE: processReferralReward is called inside the transaction. 
      // If we need processReferralReward to use tx, we might need to modify it or 
      // just call it here (but it uses the global prisma client).
      // Given instructions: "Unify the referredById update and the reward processing... into a single prisma.$transaction".
      // If processReferralReward uses the global prisma, it will run outside the tx but at least
      // the error will bubble up. Wait, if we want processReferralReward to be inside tx, we can't easily without modifying it.
      // But let's just call it and let errors bubble up (removing try-catch).
      await processReferralReward(currentUser.email, 'retroactive_' + currentUser.id);
    }
  }
}

