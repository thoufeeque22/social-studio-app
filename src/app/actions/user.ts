"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetches all connected accounts for the current authenticated user.
 */
export async function getUserAccounts() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  return await prisma.account.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      accountName: true,
      isDistributionEnabled: true,
    }
  });
}

/**
 * Toggles the distribution status for a specific connected account.
 */
export async function toggleAccountDistribution(accountId: string, isEnabled: boolean) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.account.update({
    where: { 
      id: accountId,
      userId: session.user.id // Security check
    },
    data: {
      isDistributionEnabled: isEnabled
    }
  });

  revalidatePath("/");
  revalidatePath("/settings");
  
  return { success: true };
}
/**
 * Removes a connected account from the database.
 */
export async function disconnectAccount(accountId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.account.delete({
    where: { 
      id: accountId,
      userId: session.user.id // Security check
    }
  });

  revalidatePath("/");
  revalidatePath("/settings");
  
  return { success: true };
}
/**
 * Fetches platform preferences for the current user.
 */
export async function getPlatformPreferences() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  return await prisma.platformPreference.findMany({
    where: { userId: session.user.id }
  });
}

/**
 * Toggles the visibility/enablement of a platform in the settings dashboard.
 */
export async function togglePlatformPreference(platformId: string, isEnabled: boolean) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.platformPreference.upsert({
    where: { 
      userId_platformId: {
        userId: session.user.id,
        platformId: platformId
      }
    },
    update: { isEnabled },
    create: {
      userId: session.user.id,
      platformId: platformId,
      isEnabled
    }
  });

  revalidatePath("/settings");
  
  return { success: true };
}

/**
 * Fetches the preferred video format for the current user.
 */
export async function getVideoFormatPreference() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return "short";
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredVideoFormat: true }
  });

  return user?.preferredVideoFormat || "short";
}

/**
 * Updates the preferred video format for the current user.
 */
export async function updateVideoFormatPreference(format: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferredVideoFormat: format }
  });

  revalidatePath("/");
  
  return { success: true };
}
