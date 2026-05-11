import { NextRequest } from "next/server";
import { handlePlatformUploadRequest } from "@/lib/core/platform-route-handler";
import { uploadToYouTube } from "@/lib/platforms/youtube";

export const maxDuration = 300; 

/**
 * YOUTUBE UPLOAD HANDLER
 * Uses the unified route handler to manage staging and SDK execution.
 */
export async function POST(req: NextRequest) {
  return handlePlatformUploadRequest({
    req,
    platform: "youtube",
    uploadLogic: async ({ userId, filePath, title, description, accountId, fields }) => {
      const result = await uploadToYouTube({
        userId,
        filePath,
        title,
        description,
        privacy: (fields.privacy as "public" | "private" | "unlisted") || "private",
        accountId,
        resumableUrl: fields.resumableUrl
      });
      return result.data;
    }
  });
}
