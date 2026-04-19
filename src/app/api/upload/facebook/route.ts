import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishFacebookVideo, publishFacebookReel } from "@/lib/platforms/facebook";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { streamMultipartFormData } from "@/lib/upload/streaming-parser";

export const maxDuration = 7200; // 2 hours

/**
 * FACEBOOK NATIVE UPLOAD HANDLER
 * Saves the video temporarily and pushes the binary data to Facebook's secure upload servers.
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

    const accountId = fields.accountId;
    const videoFormat = fields.videoFormat || "short";
    const fileName = path.basename(filePath);

    // 2. Mock mode check
    if (process.env.MOCK_UPLOAD === "true") {
      console.log("🚀 [MOCK MODE] Skipping actual Facebook API publish.");
      if (fsSync.existsSync(filePath)) await fs.unlink(filePath);
      return NextResponse.json({ success: true, data: { id: `mock-fb-${Date.now()}` } });
    }

    // 3. Orchestrate the Facebook Publishing (Push-based)
    let result;
    try {
      if (videoFormat === 'short') {
        result = await publishFacebookReel({
          userId: session.user.id,
          filePath,
          description: fields.description || "",
          accountId,
          videoId: fields.videoId,
        });
      } else {
        result = await publishFacebookVideo({
          userId: session.user.id,
          filePath,
          title: fields.title || fileName || "Untitled Video",
          description: fields.description || "",
          accountId,
          videoId: fields.videoId,
        });
      }

      return NextResponse.json({ success: true, data: result });
    } catch (apiError: any) {
      return NextResponse.json({ 
        success: false, 
        error: apiError.message,
        videoId: apiError.videoId || fields.videoId
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Facebook Native Upload Error:", error);
    return NextResponse.json({ 
      error: error.message || "Facebook upload failed" 
    }, { status: 500 });
  }
}
