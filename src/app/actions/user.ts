"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
