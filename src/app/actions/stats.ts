"use server";

import { prisma } from "@/lib/core/prisma";
import { getYouTubeStats } from "@/lib/platforms/youtube";
import { getInstagramStats } from "@/lib/platforms/instagram";
import { protectedAction } from "@/lib/core/action-utils";

export async function getDashboardStats() {
  return protectedAction(async (userId) => {
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

    const platformResults = (await Promise.all(platformPromises)).filter(Boolean) as any[];

    let totalReach = 0;
    let totalFollowers = 0;
    let activePlatforms = 0;

    platformResults.forEach(res => {
      if (!res?.data) return;
      activePlatforms++;
      if (res.type === 'youtube') {
        const d = res.data as { views: number; subscribers: number };
        totalReach += d.views || 0;
        totalFollowers += d.subscribers || 0;
      } else if (res.type === 'instagram') {
        const d = res.data as { reach: number; followers: number };
        totalReach += d.reach || 0;
        totalFollowers += d.followers || 0;
      }
    });

    // 3. Fake Engagement Logic (until we have individual post metrics)
    const engagement = totalReach > 0 ? (totalFollowers / totalReach * 100).toFixed(1) : "0.0";

    return [
      { 
        label: 'Total Posts', 
        value: totalPosts.toString(), 
        change: '+100%', 
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
  });
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}
