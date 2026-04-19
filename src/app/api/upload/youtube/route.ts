import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadToYouTube } from "@/lib/youtube";
import { generatePostContent, StyleMode } from "@/lib/ai-writer";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { streamMultipartFormData } from "@/lib/streaming-parser";

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

    // Check if the file is already staged on the server
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.stagedFileId) {
        filePath = path.join(process.cwd(), "src/tmp", body.stagedFileId);
        fields = body;
        fileName = body.fileName;
      }
    }

    // Fallback to legacy multipart streaming if not staged
    if (!filePath) {
      const parsed = await streamMultipartFormData(req);
      filePath = parsed.filePath;
      fields = parsed.fields;
      fileName = parsed.fileName;
    }
    
    if (!filePath || !fsSync.existsSync(filePath)) {
      return NextResponse.json({ error: "No file uploaded or streaming failed" }, { status: 400 });
    }

    const rawTitle = fields.title;
    const rawDescription = fields.description;
    const privacy = (fields.privacy as "private" | "public" | "unlisted") || "private";
    const contentMode = (fields.contentMode as StyleMode) || "Manual";
    const accountId = fields.accountId;

    const enrichedContent = await generatePostContent(
      contentMode,
      rawTitle || fileName || "Untitled Video",
      rawDescription,
      "youtube"
    );

    const finalTitle = enrichedContent.title;
    const finalDescription = enrichedContent.description;

    // If MOCK_UPLOAD is enabled, skip the actual API call
    if (process.env.MOCK_UPLOAD === "true") {
      console.log("🚀 [MOCK MODE] Skipping actual YouTube API upload.");
      const mockResult = {
        id: `mock-yt-${Date.now()}`,
        snippet: { title: finalTitle },
        status: { uploadStatus: "uploaded", privacyStatus: "private" }
      };
      
      return NextResponse.json({ success: true, data: mockResult });
    }

    // Call YouTube service
    try {
      const videoResult = await uploadToYouTube({
        userId: session.user.id,
        filePath: filePath,
        title: finalTitle,
        description: finalDescription,
        privacy: 'private',
        accountId,
        resumableUrl: fields.resumableUrl
      });

      return NextResponse.json({ 
        success: true, 
        data: videoResult.data, 
        resumableUrl: videoResult.resumableUrl 
      });
    } catch (apiError: any) {
      // If we have a resumableUrl from a partial failure, send it back
      return NextResponse.json({ 
        success: false, 
        error: apiError.message, 
        resumableUrl: apiError.resumableUrl 
      }, { status: apiError.status === 'failed' ? 200 : 500 });
    }
  } catch (error: any) {
    console.error("Upload route error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      resumableUrl: error.resumableUrl 
    }, { status: 500 });
  }
}
