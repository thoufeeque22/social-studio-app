"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getYouTubeStats } from "@/lib/youtube";
import { getInstagramStats } from "@/lib/instagram";

export async function getDashboardStats() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const userId = session.user.id;

  // 1. Total Posts (Local DB)
  const totalPosts = await prisma.postHistory.count({
    where: { userId }
  });

  // 2. Fetch platform stats in parallel
  const accounts = await prisma.account.findMany({
    where: { userId }
  });

  const platformPromises = accounts.map(async (acc) => {
    try {
      if (acc.provider === "google") {
        return { type: 'youtube', data: await getYouTubeStats(userId, acc.id) };
      } else if (acc.provider === "facebook") {
        return { type: 'instagram', data: await getInstagramStats(userId, acc.id) };
      }
      return null;
    } catch (err) {
      console.error(`Failed to fetch stats for ${acc.provider}:`, err);
      return null;
    }
  });

  const platformResults = await Promise.all(platformPromises);

  let totalReach = 0;
  let totalFollowers = 0;
  let activePlatforms = 0;

  platformResults.forEach(res => {
    if (!res || !res.data) return;
    activePlatforms++;
    if (res.type === 'youtube') {
      totalReach += res.data.views;
      totalFollowers += res.data.subscribers;
    } else if (res.type === 'instagram') {
      totalReach += res.data.reach;
      totalFollowers += res.data.followers;
    }
  });

  // 3. Fake Engagement Logic (until we have individual post metrics)
  const engagement = totalReach > 0 ? (totalFollowers / totalReach * 100).toFixed(1) : "0.0";

  return [
    { 
      label: 'Total Posts', 
      value: totalPosts.toString(), 
      change: '+100%', // Temporary hardcoded change
      icon: '📝' 
    },
    { 
      label: 'Total Reach', 
      value: formatNumber(totalReach), 
      change: '+12.5%', 
      icon: '🚀' 
    },
    { 
      label: 'Community', 
      value: formatNumber(totalFollowers), 
      change: `across ${activePlatforms} platforms`, 
      icon: '👥' 
    },
    { 
      label: 'Engagement', 
      value: `${engagement}%`, 
      change: 'Avg. Rate', 
      icon: '❤️' 
    },
  ];
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
