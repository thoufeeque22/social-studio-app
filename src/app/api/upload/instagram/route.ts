import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishInstagramReel } from "@/lib/instagram";
import { generatePostContent, StyleMode } from "@/lib/ai-writer";
import { getTrackById } from "@/lib/trends";
import { muxAudio } from "@/lib/video";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

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
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const rawCaption = formData.get("title") as string; // Title used as caption for now
    const rawDescription = formData.get("description") as string;
    const contentMode = (formData.get("contentMode") as StyleMode) || "Manual";
    const musicId = (formData.get("musicId") as string) || undefined;
    const muxAudioFlag = formData.get("muxAudio") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. Save file to temporary storage for Meta to fetch
    const tempDir = path.join(process.cwd(), "src/tmp");
    await fs.mkdir(tempDir, { recursive: true });

    const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const tempFilePath = path.join(tempDir, fileId);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(tempFilePath, buffer);

    // 2. Muxing Fallback if requested
    let finalFileId = fileId;
    let finalFilePath = tempFilePath;

    if (muxAudioFlag && musicId) {
      console.log(`[Instagram] Muxing requested for musicId: ${musicId}`);
      const track = await getTrackById(musicId);
      if (track?.audioUrl) {
        const muxedFileId = `muxed-${fileId}`;
        const muxedFilePath = path.join(tempDir, muxedFileId);
        await muxAudio(tempFilePath, track.audioUrl, muxedFilePath);
        finalFileId = muxedFileId;
        finalFilePath = muxedFilePath;
        console.log(`[Instagram] Muxing complete. Serving: ${finalFileId}`);
      }
    }

    // 3. Generate the Public URL for Meta Crawler
    const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
    const videoUrl = `${baseUrl}/api/media/${finalFileId}`;

    console.log(`Instructing Instagram to fetch from: ${videoUrl}`);

    // 3. Enrich through Intelligence Layer
    const enrichedContent = await generatePostContent(
      contentMode,
      rawCaption || file.name,
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
      
      // In mock mode, we still cleanup after 60s so user can preview/download
      setTimeout(async () => {
        try {
          if (fsSync.existsSync(tempFilePath)) await fs.unlink(tempFilePath);
          if (finalFilePath !== tempFilePath && fsSync.existsSync(finalFilePath)) {
             await fs.unlink(finalFilePath);
          }
        } catch (e) {}
      }, 60000);

      const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
      return NextResponse.json({ 
        success: true, 
        data: { 
          ...mockResult, 
          previewUrl: `${baseUrl}/api/media/${finalFileId}` 
        } 
      });
    }

    // 4. Orchestrate the Instagram Publishing Flow
    const result = await publishInstagramReel({
      userId: session.user.id,
      videoUrl: videoUrl,
      caption: finalCaption,
      musicId,
    });

    // 4. Cleanup: We keep the file slightly longer to ensure Meta finished fetching,
    // though in a real-world app, we would use a webhook or a background job.
    // For now, we'll delete it after the API call returns successfully.
    setTimeout(async () => {
      try {
        if (fsSync.existsSync(tempFilePath)) await fs.unlink(tempFilePath);
        if (finalFilePath !== tempFilePath && fsSync.existsSync(finalFilePath)) {
           await fs.unlink(finalFilePath);
        }
        console.log(`Cleaned up temporary files for: ${fileId}`);
      } catch (e) {
        console.error("Failed to cleanup temp files", e);
      }
    }, 60000); // Wait 60 seconds to be safe

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Instagram Upload Error:", error);
    return NextResponse.json({ 
      error: error.message || "Instagram upload failed" 
    }, { status: 500 });
  }
}
