import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { streamMultipartFormData } from "@/lib/upload/streaming-parser";
import path from "path";

export const maxDuration = 300; // Vercel Hobby limit (5 minutes)

/**
 * STAGING UPLOAD HANDLER
 * This route allows for a single physical upload of a large video file.
 * The resulting fileId can then be reused across multiple platform publishing calls
 * to avoid redundant transfers and browser memory issues.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("📥 [STAGING] Starting memory-efficient stream...");
    
    // Use the streaming parser we built to pipe directly to disk
    const { filePath, fileName } = await streamMultipartFormData(req);

    if (!filePath) {
      return NextResponse.json({ error: "No file received in stream" }, { status: 400 });
    }

    const fileId = path.basename(filePath);
    console.log(`✅ [STAGING] File staged successfully: ${fileId} (${fileName})`);

    return NextResponse.json({ 
      success: true, 
      data: { 
        fileId,
        fileName
      } 
    });
  } catch (error: unknown) {
    console.error("Staging Error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Staging upload failed" 
    }, { status: 500 });
  }
}
