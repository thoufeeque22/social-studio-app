import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishInstagramReel } from "@/lib/instagram";
import fs from "fs/promises";
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
    const caption = formData.get("title") as string; // Title used as caption for now

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

    // 2. Generate the Public URL for Meta Crawler
    // IMPORTANT: This requires your app to be accessible via a Tunnel (Cloudflare, ngrok, etc.)
    const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
    const videoUrl = `${baseUrl}/api/media/${fileId}`;

    console.log(`Instructing Instagram to fetch from: ${videoUrl}`);

    // 3. Orchestrate the Instagram Publishing Flow
    const result = await publishInstagramReel({
      userId: session.user.id,
      videoUrl: videoUrl,
      caption: caption || "",
    });

    // 4. Cleanup: We keep the file slightly longer to ensure Meta finished fetching,
    // though in a real-world app, we would use a webhook or a background job.
    // For now, we'll delete it after the API call returns successfully.
    setTimeout(async () => {
      try {
        await fs.unlink(tempFilePath);
        console.log(`Cleaned up temporary file: ${fileId}`);
      } catch (e) {
        console.error("Failed to cleanup temp file", e);
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
