import { handlePlatformUploadRequest } from "@/lib/core/platform-route-handler";
import { NextResponse } from "next/server";

export const maxDuration = 300; 

/**
 * LOCAL SIMULATOR UPLOAD HANDLER
 * Uses the unified route handler to simulate an upload for local testing.
 */
export async function POST(req: any) {
  return handlePlatformUploadRequest({
    req,
    platform: "local" as any, // Bypass strict typing for simulator
    uploadLogic: async ({ accountId, fields, onProgress }) => {
      // Use the existing simulation logic from server-distributor
      // Note: server-distributor's distributeSinglePlatform expects (historyId, platform, stagedFileId, fileName, accountId)
      // BUT platform-route-handler passes different arguments to uploadLogic.
      // Wait, platform-route-handler passes: { userId, filePath, title, description, videoFormat, accountId, fields, onProgress }
      
      const p = fields.actualPlatform || 'local1';
      
      // We'll write a simple loop here to simulate it and call onProgress
      console.log(`🚀 [LOCAL-SIM-API] Starting simulated upload for ${p}...`);
      for (let i = 1; i <= 5; i++) {
        await new Promise(r => setTimeout(r, 800));
        if (onProgress) onProgress(i * 20);
      }
      
      console.log(`✅ [LOCAL-SIM-API] Simulated publish complete for ${p}!`);
      
      return {
        id: `sim-${p}-${Date.now()}`,
        permalink: `http://localhost:3000/simulator/${p}/${Date.now()}`
      };
    }
  });
}
