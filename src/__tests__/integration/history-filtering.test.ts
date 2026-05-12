/**
 * SCHEDULE & HISTORY INTEGRATION TESTS (ISSUE #518)
 * Verifies that the filtering and ordering logic for the History and Schedule tabs
 * correctly handles 'isPublished' state and 'scheduledAt' timestamps.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// 1. Mock Prisma to intercept database calls
vi.mock('../../lib/core/prisma', () => ({
  prisma: {
    postHistory: {
      findMany: vi.fn(),
    },
  },
}));

// 2. Mock Auth to provide a session
vi.mock('../../auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: 'test-user-518' } }),
}));

import { GET } from '../../app/api/history/route';
import { prisma } from '../../lib/core/prisma';

describe('History API - Schedule & History Filtering (Issue #518)', () => {
  const userId = 'test-user-518';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters by isPublished: true and orders by createdAt DESC for the History tab', async () => {
    const req = new NextRequest(new URL('http://localhost/api/history?published=true'));
    
    await GET(req);

    expect(prisma.postHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId,
        isPublished: true
      },
      orderBy: { createdAt: 'desc' }
    }));
  });

  it('filters by isPublished: false and orders by scheduledAt ASC for the Schedule tab', async () => {
    const req = new NextRequest(new URL('http://localhost/api/history?published=false'));
    
    await GET(req);

    expect(prisma.postHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId,
        isPublished: false
      },
      orderBy: { scheduledAt: 'asc' }
    }));
  });

  it('defaults to published=true when the parameter is missing', async () => {
    const req = new NextRequest(new URL('http://localhost/api/history'));
    
    await GET(req);

    expect(prisma.postHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId,
        isPublished: true
      }
    }));
  });

  it('correctly handles limit and cursor parameters with Zod validation', async () => {
    const req = new NextRequest(new URL('http://localhost/api/history?limit=10&cursor=last-id-123'));
    
    await GET(req);

    expect(prisma.postHistory.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 11, // limit + 1
      cursor: { id: 'last-id-123' },
      skip: 1
    }));
  });

  it('returns a 400 error for invalid query parameters', async () => {
    const req = new NextRequest(new URL('http://localhost/api/history?limit=999')); // Max is 50
    
    const response = await GET(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid query parameters');
  });
});
