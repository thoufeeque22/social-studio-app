'use server';

import { protectedAction } from '@/lib/core/action-utils';
import { prisma } from '@/lib/core/prisma';
import { z } from 'zod';

const preferencesSchema = z.object({
  timezone: z.string().min(1).max(100),
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  hasCompletedOnboarding: z.boolean().optional(),
  onboardingSocialPlatforms: z.array(z.string()).optional(),
});

export async function getUserPreferencesAction() {
  return protectedAction(async function getUserPrefs(userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { preference: true }
      });
      return { success: true, preference: user?.preference || null };
    } catch {
      return { success: false, error: 'Failed to load preferences.' };
    }
  });
}

export async function updateUserPreferencesAction(data: {
  timezone: string;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
  hasCompletedOnboarding?: boolean;
  onboardingSocialPlatforms?: string[];
}) {
  return protectedAction(async function updateUserPrefs(userId) {
    try {
      const validated = preferencesSchema.parse(data);
      const preference = await prisma.userPreference.upsert({
        where: { userId },
        update: validated,
        create: { userId, ...validated }
      });
      return { success: true, preference };
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        return { success: false, error: 'Invalid preferences data.' };
      }
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Foreign key constraint')) {
        return { success: false, error: 'Your account is still syncing. Please refresh and try again.' };
      }
      return { success: false, error: 'Failed to update preferences.' };
    }
  });
}
