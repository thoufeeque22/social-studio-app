'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { revalidatePath } from "next/cache";

export async function completeOnboarding(platforms: string[]) {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await prisma.userPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      hasCompletedOnboarding: true,
      onboardingSocialPlatforms: platforms,
    },
    update: {
      hasCompletedOnboarding: true,
      onboardingSocialPlatforms: platforms,
    }
  });

  revalidatePath("/");
}
