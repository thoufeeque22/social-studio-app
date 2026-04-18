import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishFacebookVideo, publishFacebookReel } from "@/lib/facebook";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { streamMultipartFormData } from "@/lib/streaming-parser";

export const maxDuration = 7200; // 2 hours

/**
 * FACEBOOK NATIVE UPLOAD HANDLER
 * Saves the video temporarily and hands the Tunnel URL to the Facebook Pages API.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let filePath: string | undefined;
    let fields: Record<string, string> = {};

    // Check if the file is already staged on the server
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.stagedFileId) {
        filePath = path.join(process.cwd(), "src/tmp", body.stagedFileId);
        fields = body;
      }
    }

    // Fallback if not staged
    if (!filePath) {
      const parsed = await streamMultipartFormData(req);
      filePath = parsed.filePath;
      fields = parsed.fields;
    }

    if (!filePath || !fsSync.existsSync(filePath)) {
      return NextResponse.json({ error: "No file uploaded or streaming failed" }, { status: 400 });
    }

    const title = fields.title;
    const description = fields.description;
    const accountId = fields.accountId;
    const videoFormat = fields.videoFormat || "short";

    // 2. Generate the Public URL for Facebook Crawler
    const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
    const fileId = path.basename(filePath);
    const videoUrl = `${baseUrl}/api/media/${fileId}`;

    console.log(`Instructing Facebook Page API to fetch from: ${videoUrl}`);

    // 3. Post to Facebook Page API (Reel or standard Video)
    const result = videoFormat === "short" 
      ? await publishFacebookReel({
          userId: session.user.id,
          videoUrl: videoUrl,
          description: description || "",
          accountId,
        })
      : await publishFacebookVideo({
          userId: session.user.id,
          videoUrl: videoUrl,
          title: title || fileId,
          description: description || "",
          accountId,
        });

    // 4. Cleanup temp file with extended delay for large files
    setTimeout(async () => {
      try {
        if (fsSync.existsSync(filePath)) {
          await fs.unlink(filePath);
          console.log(`Cleaned up temp Facebook file: ${fileId}`);
        }
      } catch (e) {
        console.error("Failed to cleanup temp file", e);
      }
    }, 600000); // 10 minutes buffer for large files

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Facebook Native Upload Error:", error);
    return NextResponse.json({ 
      error: error.message || "Facebook upload failed" 
    }, { status: 500 });
  }
}
