"use server";

import { prisma } from "@/lib/core/prisma";
import { protectedAction, revalidateDashboard } from "@/lib/core/action-utils";

/**
 * Fetches all connected accounts for the current authenticated user.
 */
export async function getUserAccounts() {
  return protectedAction(async (userId) => {
    return await prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        accountName: true,
        isDistributionEnabled: true,
      }
    });
  }).catch(() => []); // Graceful fallback to empty list
}

/**
 * Toggles the distribution status for a specific connected account.
 */
export async function toggleAccountDistribution(accountId: string, isEnabled: boolean) {
  return protectedAction(async (userId) => {
    await prisma.account.update({
      where: { 
        id: accountId,
        userId // Security check
      },
      data: {
        isDistributionEnabled: isEnabled
      }
    });

    await revalidateDashboard();
    return { success: true };
  });
}

/**
 * Removes a connected account from the database.
 */
export async function disconnectAccount(accountId: string) {
  return protectedAction(async (userId) => {
    await prisma.account.delete({
      where: { 
        id: accountId,
        userId // Security check
      }
    });

    await revalidateDashboard();
    return { success: true };
  });
}

/**
 * Fetches platform preferences for the current user.
 */
export async function getPlatformPreferences() {
  return protectedAction(async (userId) => {
    return await prisma.platformPreference.findMany({
      where: { userId }
    });
  }).catch(() => []);
}

/**
 * Toggles the visibility/enablement of a platform in the settings dashboard.
 */
export async function togglePlatformPreference(platformId: string, isEnabled: boolean) {
  return protectedAction(async (userId) => {
    await prisma.platformPreference.upsert({
      where: { 
        userId_platformId: {
          userId,
          platformId: platformId
        }
      },
      update: { isEnabled },
      create: {
        userId,
        platformId: platformId,
        isEnabled
      }
    });

    await revalidateDashboard();
    return { success: true };
  });
}

/**
 * Fetches the preferred video format for the current user.
 */
export async function getVideoFormatPreference() {
  return protectedAction(async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredVideoFormat: true }
    });

    return user?.preferredVideoFormat || "short";
  }).catch(() => "short");
}

/**
 * Updates the preferred video format for the current user.
 */
export async function updateVideoFormatPreference(format: string) {
  return protectedAction(async (userId) => {
    await prisma.user.update({
      where: { id: userId },
      data: { preferredVideoFormat: format }
    });

    await revalidateDashboard();
    return { success: true };
  });
}

/**
 * Fetches the preferred AI style for the current user.
 */
export async function getAIStylePreference() {
  return protectedAction(async (userId) => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferredAIStyle: true }
    });

    return (user?.preferredAIStyle as any) || "Manual";
  }).catch(() => "Manual");
}

/**
 * Updates the preferred AI style for the current user.
 */
export async function updateAIStylePreference(style: string) {
  return protectedAction(async (userId) => {
    await prisma.user.update({
      where: { id: userId },
      data: { preferredAIStyle: style }
    });

    await revalidateDashboard();
    return { success: true };
  });
}
