"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetches the enabled platforms for the current authenticated user.
 */
export async function getUserPlatforms() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return [];
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { enabledPlatforms: true }
  });

  if (!user?.enabledPlatforms) {
    return [];
  }

  try {
    return JSON.parse(user.enabledPlatforms) as string[];
  } catch (e) {
    console.error("Failed to parse user platforms:", e);
    return [];
  }
}

/**
 * Updates the enabled platforms for the current authenticated user.
 */
export async function updateUserPlatforms(platforms: string[]) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      enabledPlatforms: JSON.stringify(platforms)
    }
  });

  revalidatePath("/");
  revalidatePath("/settings");
  
  return { success: true };
}
