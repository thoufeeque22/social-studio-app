import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractKeyframes } from "@/lib/video/processor";
import { rankThumbnails } from "@/lib/core/ai";
import { thumbnailRateLimit, checkRateLimit } from "@/lib/core/ratelimit";
import path from "path";
import fsSync from "fs";
import { logger } from "@/lib/core/logger";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: "fileId is required" }, { status: 400 });
    }

    // Apply rate limit
    await checkRateLimit(thumbnailRateLimit, userId, "Thumbnail generation limit reached (10 per day).");

    const tempDir = path.join(process.cwd(), "src/tmp");
    const filePath = path.join(tempDir, fileId);

    if (!fsSync.existsSync(filePath)) {
      return NextResponse.json({ error: "Video file not found or expired" }, { status: 404 });
    }

    logger.info(`[THUMBNAILS] Extracting frames for ${fileId}`);
    
    // Extract 3-5 frames
    const framesBase64 = await extractKeyframes(filePath, 4);

    if (framesBase64.length === 0) {
      return NextResponse.json({ error: "Could not extract frames from video" }, { status: 500 });
    }

    logger.info(`[THUMBNAILS] Extracted ${framesBase64.length} frames. Ranking via AI...`);

    // Rank frames using AI
    const result = await rankThumbnails(framesBase64);
    
    // Ensure index is valid
    const bestIndex = (result.bestFrameIndex >= 0 && result.bestFrameIndex < framesBase64.length) 
      ? result.bestFrameIndex 
      : 0;
      
    const bestFrameBase64 = framesBase64[bestIndex];

    logger.info(`[THUMBNAILS] AI ranking complete. Best frame: ${bestIndex}`);

    return NextResponse.json({
      success: true,
      bestFrameBase64,
      reason: result.reason,
      allFrames: framesBase64 // Optional: allow user to override AI choice
    });

  } catch (error: unknown) {
    logger.error("Thumbnail Generation Error", error);
    const message = error instanceof Error ? error.message : "Failed to generate thumbnail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
