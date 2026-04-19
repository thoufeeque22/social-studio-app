import { handlePlatformUploadRequest } from "@/lib/core/platform-route-handler";
import { publishInstagramReel } from "@/lib/platforms/instagram";

export const maxDuration = 300;

/**
 * INSTAGRAM UPLOAD HANDLER
 * Uses the unified route handler to manage staging and SDK execution.
 */
export async function POST(req: any) {
  return handlePlatformUploadRequest({
    req,
    platform: "instagram",
    uploadLogic: async ({ userId, filePath, description, accountId, fields }) => {
      return publishInstagramReel({
        userId,
        filePath,
        caption: description,
        musicId: fields.musicId,
        accountId,
        creationId: fields.creationId,
      });
    }
  });
}
