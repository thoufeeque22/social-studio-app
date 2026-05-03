import { prisma } from "./prisma";

/**
 * SERVER-ONLY: Updates the progress of a platform distribution in the database.
 * Ensures progress only moves forward.
 */
export const updatePlatformProgress = async (historyId: string, platform: string, accountId: string, progress: number) => {
  try {
    const current = await prisma.postPlatformResult.findUnique({
      where: {
        postHistoryId_platform_accountId: {
          postHistoryId: historyId,
          platform,
          accountId
        }
      },
      select: { progress: true }
    });

    if (!current || progress > current.progress) {
      await prisma.postPlatformResult.update({
        where: {
          postHistoryId_platform_accountId: {
            postHistoryId: historyId,
            platform,
            accountId
          }
        },
        data: { progress }
      });
    }
  } catch (err) {
    // Silent fail for progress updates
  }
};
