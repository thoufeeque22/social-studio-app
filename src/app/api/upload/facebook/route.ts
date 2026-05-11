import { NextRequest } from "next/server";
import { handlePlatformUploadRequest } from "@/lib/core/platform-route-handler";
import { publishFacebookVideo, publishFacebookReel } from "@/lib/platforms/facebook";

export const maxDuration = 300;

/**
 * FACEBOOK NATIVE UPLOAD HANDLER
 * Uses the unified route handler to manage staging and SDK execution.
 */
export async function POST(req: NextRequest) {
  return handlePlatformUploadRequest({
    req,
    platform: "facebook",
    uploadLogic: async ({ userId, filePath, title, description, videoFormat, accountId, fields }) => {
      if (videoFormat === 'short') {
        return publishFacebookReel({
          userId,
          filePath,
          description,
          accountId,
          videoId: fields.videoId,
        });
      } else {
        return publishFacebookVideo({
          userId,
          filePath,
          title,
          description,
          accountId,
          videoId: fields.videoId,
        });
      }
    }
  });
}
