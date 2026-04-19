import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishInstagramReel } from "@/lib/instagram";
import { generatePostContent, StyleMode } from "@/lib/ai-writer";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { streamMultipartFormData } from "@/lib/streaming-parser";

export const maxDuration = 7200; // 2 hours

/**
 * INSTAGRAM UPLOAD HANDLER
 * This route manages the temporary storage and Meta Graph API orchestration
 * for publishing Instagram Reels.
 */
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
    const musicId = (fields.musicId as string) || undefined;
    const accountId = fields.accountId;

    // 2. Generate the Public URL for Meta Crawler
    let baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);

    const fileId = path.basename(filePath);
    const videoUrl = `${baseUrl}/api/media/${encodeURIComponent(fileId)}`;

    console.log(`Instructing Instagram to fetch from: ${videoUrl}`);

    // 3. Enrich through Intelligence Layer
    const enrichedContent = await generatePostContent(
      contentMode,
      rawCaption || fileName || "Untitled Video",
      rawDescription,
      "instagram"
    );

    const finalCaption = `${enrichedContent.title}\n\n${enrichedContent.description}\n\n${enrichedContent.hashtags.join(" ")}`;

    // If MOCK_UPLOAD is enabled, skip the actual API call
    if (process.env.MOCK_UPLOAD === "true") {
      console.log("🚀 [MOCK MODE] Skipping actual Instagram API publish.");
      // Simulate API response
      const mockResult = {
        id: `mock-ig-${Date.now()}`,
        status: "PUBLISHED (MOCK)"
      };
      
      // Cleanup temp files immediately
      if (fsSync.existsSync(filePath)) await fs.unlink(filePath);

      return NextResponse.json({ success: true, data: mockResult });
    }

    // 4. Orchestrate the Instagram Publishing Flow
    try {
      const result = await publishInstagramReel({
        userId: session.user.id,
        videoUrl: videoUrl,
        caption: finalCaption,
        musicId,
        accountId,
        creationId: fields.creationId,
      });

      return NextResponse.json({ success: true, data: result });
    } catch (apiError: any) {
      return NextResponse.json({ 
        success: false, 
        error: apiError.message,
        creationId: apiError.creationId || fields.creationId
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Instagram Upload Error:", error);
    return NextResponse.json({ 
      success: false,
      error: error.message || "Instagram upload failed",
      creationId: error.creationId
    }, { status: 500 });
  }
}
