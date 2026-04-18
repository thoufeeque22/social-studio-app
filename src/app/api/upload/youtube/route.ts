import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadToYouTube } from "@/lib/youtube";
import { generatePostContent, StyleMode } from "@/lib/ai-writer";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

export const maxDuration = 1800; // 30 minutes

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
    const accountId = formData.get("accountId") as string;

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
      
      // Cleanup temp files immediately
      if (fsSync.existsSync(tempFilePath)) await fs.unlink(tempFilePath);

      return NextResponse.json({ success: true, data: mockResult });
    }

    // Call YouTube service
    const videoData = await uploadToYouTube({
      userId: session.user.id,
      filePath: tempFilePath,
      title: finalTitle,
      description: finalDescription,
      privacy: 'private',
      accountId
    });

    // Cleanup temp file
    if (fsSync.existsSync(tempFilePath)) await fs.unlink(tempFilePath);

    return NextResponse.json({ success: true, data: videoData });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
