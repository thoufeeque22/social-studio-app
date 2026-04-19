import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishTikTokVideo } from "@/lib/platforms/tiktok";
import { generatePostContent, StyleMode } from "@/lib/utils/ai-writer";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { streamMultipartFormData } from "@/lib/upload/streaming-parser";

export const maxDuration = 7200; // 2 hours

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fields: Record<string, string> = {};

    // Check if the file is already staged
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.stagedFileId) {
        filePath = path.join(process.cwd(), "src/tmp", body.stagedFileId);
        fields = body;
        fileName = body.fileName;
      }
    }

    if (!filePath) {
      const parsed = await streamMultipartFormData(req);
      filePath = parsed.filePath;
      fileName = parsed.fileName;
      fields = parsed.fields;
    }

    if (!filePath || !fsSync.existsSync(filePath)) {
      return NextResponse.json({ error: "No file uploaded or streaming failed" }, { status: 400 });
    }

    const rawCaption = fields.title;
    const rawDescription = fields.description;
    const contentMode = (fields.contentMode as StyleMode) || "Manual";
    const accountId = fields.accountId;

    // 3. Enrich through Intelligence Layer
    const enrichedContent = await generatePostContent(
      contentMode,
      rawCaption || fileName || "Untitled Video",
      rawDescription,
      "tiktok"
    );

    const finalCaption = `${enrichedContent.title}\n\n${enrichedContent.description}\n\n${enrichedContent.hashtags.join(" ")}`;
    
    // TikTok V2 API strictly requires post_info.title to be <= 150 characters.
    // If it exceeds this, they throw "The request post info is empty or incorrect"
    const truncatedCaption = finalCaption.length > 145 
        ? finalCaption.substring(0, 145) + "..." 
        : finalCaption;

    // If MOCK_UPLOAD is enabled, skip the actual API call
    if (process.env.MOCK_UPLOAD === "true") {
      console.log("🚀 [MOCK MODE] Skipping actual TikTok API publish.");
      const mockResult = {
        publish_id: `mock-tt-${Date.now()}`,
      };
      
      // Cleanup temp files immediately
      if (fsSync.existsSync(filePath)) await fs.unlink(filePath);

      return NextResponse.json({ success: true, data: mockResult });
    }

    // 4. Orchestrate the TikTok Publishing Flow
    const result = await publishTikTokVideo({
      userId: session.user.id,
      videoPath: filePath, // Pass the local file path for binary chunk upload
      title: truncatedCaption, // Pass the safely truncated caption
      accountId,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("TikTok Upload Error:", error);
    return NextResponse.json({ 
      error: error.message || "TikTok upload failed" 
    }, { status: 500 });
  }
}
