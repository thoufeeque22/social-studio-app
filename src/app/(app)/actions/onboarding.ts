'use server';

import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { revalidatePath } from "next/cache";
import { SURVEY_SOCIAL_PLATFORMS } from "@/lib/core/constants";

const MAX_PLATFORMS = 10;

export async function completeOnboarding(platforms: string[]) {
  if (!Array.isArray(platforms)) {
    throw new Error("Invalid input");
  }
  
  if (platforms.length > MAX_PLATFORMS) {
    throw new Error("Too many platforms selected");
  }
  
  const isValid = platforms.every(p => typeof p === 'string' && (SURVEY_SOCIAL_PLATFORMS as readonly string[]).includes(p));
  if (!isValid) {
    throw new Error("Invalid platform selected");
  }

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
