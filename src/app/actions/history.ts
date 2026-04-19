'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export interface PlatformResultInput {
  platform: string;
  accountName?: string | null;
  platformPostId?: string | null;
  permalink?: string | null;
  status: 'success' | 'failed';
  errorMessage?: string | null;
}

export interface SavePostHistoryInput {
  title: string;
  description?: string;
  videoFormat: 'short' | 'long';
  platforms: PlatformResultInput[];
}

export async function savePostHistory(data: SavePostHistoryInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const postHistory = await prisma.postHistory.create({
    data: {
      userId: session.user.id,
      title: data.title,
      description: data.description,
      videoFormat: data.videoFormat,
      platforms: {
        create: data.platforms.map((p) => ({
          platform: p.platform,
          accountName: p.accountName || null,
          platformPostId: p.platformPostId || null,
          permalink: p.permalink || null,
          status: p.status,
          errorMessage: p.errorMessage || null,
        })),
      },
    },
    include: {
      platforms: true,
    },
  });

  return postHistory;
}
