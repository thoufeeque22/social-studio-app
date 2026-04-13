import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadToYouTube } from "@/lib/youtube";
import { generatePostContent, StyleMode } from "@/lib/ai-writer";
import { getTrackById } from "@/lib/trends";
import { muxAudio } from "@/lib/video";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const rawTitle = formData.get("title") as string;
    const rawDescription = formData.get("description") as string;
    const privacy = (formData.get("privacy") as "private" | "public" | "unlisted") || "private";
    const contentMode = (formData.get("contentMode") as StyleMode) || "Manual";
    const musicId = (formData.get("musicId") as string) || undefined;
    const muxAudioFlag = formData.get("muxAudio") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const tempDir = path.join(process.cwd(), "src/tmp");
    const tempFilePath = path.join(tempDir, `${Date.now()}-${file.name}`);

    // Create temp directory if it doesn't exist
    await fs.mkdir(tempDir, { recursive: true });

    // Write file to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(tempFilePath, buffer);

    const enrichedContent = await generatePostContent(
      contentMode,
      rawTitle || file.name,
      rawDescription,
      "youtube"
    );

    let finalVideoPath = tempFilePath;
    const muxedFilePath = path.join(tempDir, `muxed-${Date.now()}-${file.name}`);

    // If Muxing is requested and we have a musicId, perform it!
    if (muxAudioFlag && musicId) {
      console.log(`Muxing requested for musicId: ${musicId}`);
      const track = await getTrackById(musicId);
      if (track?.audioUrl) {
        await muxAudio(tempFilePath, track.audioUrl, muxedFilePath);
        finalVideoPath = muxedFilePath;
      }
    }

    // If MOCK_UPLOAD is enabled, skip the actual API call
    if (process.env.MOCK_UPLOAD === "true") {
      console.log("🚀 [MOCK MODE] Skipping actual YouTube API upload.");
      // Simulate API response
      const mockResult = {
        id: `mock-yt-${Date.now()}`,
        snippet: { title: enrichedContent.title },
        status: { uploadStatus: "uploaded", privacyStatus: privacy }
      };
      
      // Cleanup temp files after a delay to allow for preview/download
      setTimeout(async () => {
        try {
          if (fsSync.existsSync(tempFilePath)) await fsSync.promises.unlink(tempFilePath);
          if (finalVideoPath === muxedFilePath && fsSync.existsSync(muxedFilePath)) {
            await fsSync.promises.unlink(muxedFilePath);
          }
        } catch (e) {}
      }, 60000);

      const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
      return NextResponse.json({ 
        success: true, 
        data: { 
          ...mockResult, 
          previewUrl: `${baseUrl}/api/media/${path.basename(finalVideoPath)}` 
        } 
      });
    }

    // Call YouTube service
    const result = await uploadToYouTube({
      userId: session.user.id,
      filePath: finalVideoPath,
      title: enrichedContent.title,
      description: enrichedContent.description,
      privacy,
      musicId,
    });

    // Clean up temp files
    await fs.unlink(tempFilePath);
    if (finalVideoPath === muxedFilePath) {
      await fs.unlink(muxedFilePath);
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
