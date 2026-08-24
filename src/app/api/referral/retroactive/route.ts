import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/core/prisma';
import { processRetroactiveSocialReward, processRetroactivePaidReward } from '@/lib/referral/retroactive';
import { checkRateLimit } from '@/lib/core/ratelimit';
import { globalRateLimit } from '@/lib/core/ratelimit-config';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = session.user.id;

    // Rate Limiting
    try {
      await checkRateLimit(globalRateLimit, `retroactive-referral:${currentUserId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ error: message }, { status: 429 });
    }

    const { referralCode } = await req.json();
    if (!referralCode || typeof referralCode !== 'string') {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 400 });
    }

    // Fetch current user
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      include: { billingProfile: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (currentUser.referredById) {
      return NextResponse.json({ error: 'You have already used a referral code' }, { status: 400 });
    }

    // Look up referrer (with billing profile for performance)
    const referrer = await prisma.user.findFirst({
      where: {
        OR: [{ referralCode }, { id: referralCode }],
      },
      include: { billingProfile: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: 'Referral code not found' }, { status: 404 });
    }

    if (referrer.id === currentUserId) {
      return NextResponse.json({ error: 'You cannot use your own referral code' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update currentUser with referredById
      await tx.user.update({
        where: { id: currentUserId },
        data: { referredById: referrer.id },
      });

      // 2. Social Reward Catch-up
      await processRetroactiveSocialReward(tx, currentUserId, currentUser, referrer);

      // 3. Paid Reward Catch-up
      await processRetroactivePaidReward(tx, currentUser);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Retroactive Referral API Error]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
