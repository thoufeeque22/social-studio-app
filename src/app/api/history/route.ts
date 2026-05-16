import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';
import { logger } from '@/lib/core/logger';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(20),
  published: z.string().optional(), // 'true', 'false', or 'all'
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const result = querySchema.safeParse(Object.fromEntries(searchParams));

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: result.error.format() }, { status: 400 });
    }

    const { cursor, limit, published, search } = result.data;

    const isPublished = published === 'all' ? undefined : published === 'true' || published === undefined;

    const posts = await prisma.postHistory.findMany({
      where: { 
        userId: session.user.id,
        ...(published !== 'all' ? { isPublished } : {}),
        ...(search ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: { platforms: true },
      orderBy: published === 'false' ? { scheduledAt: 'asc' } : { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({ data, nextCursor });
  } catch (error: unknown) {
    logger.error('History API Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch history', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
