import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logTokenEvent } from '@/lib/core/audit';
import { prisma } from '@/lib/core/prisma';

vi.mock('@/lib/core/prisma', () => ({
  prisma: {
    tokenAuditLog: {
      create: vi.fn(),
    },
  },
}));

describe('Audit Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully log a token event', async () => {
    const params = {
      userId: 'user_123',
      accountId: 'account_456',
      action: 'ACCESS' as const,
      provider: 'google',
      reason: 'Testing audit',
    };

    vi.mocked(prisma.tokenAuditLog.create).mockResolvedValue({} as any);

    await logTokenEvent(params);

    expect(prisma.tokenAuditLog.create).toHaveBeenCalledWith({
      data: {
        userId: params.userId,
        accountId: params.accountId,
        action: params.action,
        provider: params.provider,
        reason: params.reason,
      },
    });
  });

  it('should not throw if prisma.create fails', async () => {
    const params = {
      userId: 'user_123',
      action: 'REFRESH' as const,
    };

    vi.mocked(prisma.tokenAuditLog.create).mockRejectedValue(new Error('DB Error'));

    // Should not throw
    await expect(logTokenEvent(params)).resolves.not.toThrow();
    expect(prisma.tokenAuditLog.create).toHaveBeenCalled();
  });
});
