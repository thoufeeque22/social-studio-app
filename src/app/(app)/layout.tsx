import React from 'react';
import LayoutWrapper from "@/components/layout/LayoutWrapper";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { redirect } from "next/navigation";
import { SocialPlatformSurvey } from "@/components/onboarding/SocialPlatformSurvey";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect('/login');
  }
  
  let isFreeTier = true;
  let tierName = "Free Starter";
  
  const profile = await prisma.billingProfile.findUnique({
    where: { userId: session.user.id },
    select: { subscriptionTier: true, subscriptionStatus: true }
  });
  
  if (profile) {
    if (profile.subscriptionStatus === "ACTIVE" && profile.subscriptionTier !== "FREE_STARTER" && profile.subscriptionTier !== "FREE_HACKER") {
      isFreeTier = false;
    }
    
    // Format FREE_STARTER -> Free Starter
    tierName = profile.subscriptionTier
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  const preferences = await prisma.userPreference.findUnique({
    where: { userId: session.user.id }
  });
  const needsOnboarding = !preferences?.hasCompletedOnboarding;

  return (
    <LayoutWrapper session={session} isFreeTier={isFreeTier} tierName={tierName}>
      {needsOnboarding && <SocialPlatformSurvey />}
      {children}
    </LayoutWrapper>
  );
}
