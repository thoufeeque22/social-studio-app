import fs from 'fs';
import path from 'path';
import { logger } from "@/lib/core/logger";

interface LocalPublishParams {
  userId: string;
  filePath: string;
  onProgress?: (progress: number) => void;
}

/**
 * DUMMY PLATFORM: Local Simulation
 * Simulates a platform upload by copying the file to a 'published' directory.
 * Useful for testing the worker and distribution pipeline in development.
 */
export const publishLocalReel = async ({ filePath, onProgress }: LocalPublishParams) => {
  logger.info(`🚀 [LOCAL-SIM] Starting simulated upload for: ${path.basename(filePath)}`);

  const publishedDir = path.join(process.cwd(), 'src/tmp/published');
  if (!fs.existsSync(publishedDir)) {
    fs.mkdirSync(publishedDir, { recursive: true });
  }

  const fileName = `published_${Date.now()}_${path.basename(filePath)}`;
  const destination = path.join(publishedDir, fileName);

  // Simulate upload progress
  for (let i = 1; i <= 10; i++) {
    await new Promise(resolve => setTimeout(resolve, 500)); // 5s total simulation
    const progress = i * 10;
    if (onProgress) onProgress(progress);
    logger.info(`📤 [LOCAL-SIM] Progress: ${progress}%`);
  }

  // "Publish" by copying the file
  fs.copyFileSync(filePath, destination);
  
  const permalink = `file://${destination}`;
  logger.info(`✅ [LOCAL-SIM] Simulated publish complete! Link: ${permalink}`);

  return {
    id: `local_${Date.now()}`,
    permalink
  };
};
