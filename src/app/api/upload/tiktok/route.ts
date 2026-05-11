import { NextRequest } from "next/server";
import { handlePlatformUploadRequest } from "@/lib/core/platform-route-handler";
import { publishTikTokVideo } from "@/lib/platforms/tiktok";

export const maxDuration = 300;

/**
 * TIKTOK UPLOAD HANDLER
 * Uses the unified route handler to manage staging and SDK execution.
 */
export async function POST(req: NextRequest) {
  return handlePlatformUploadRequest({
    req,
    platform: "tiktok",
    uploadLogic: async ({ userId, filePath, title, accountId }) => {
      return publishTikTokVideo({
        userId,
        videoPath: filePath,
        title, // title is already formatted/truncated via the handler's formatPlatformCaption
        accountId,
      });
    }
  });
}
