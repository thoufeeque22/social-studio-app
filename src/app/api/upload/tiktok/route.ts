import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishTikTokVideo } from "@/lib/tiktok";
import { generatePostContent, StyleMode } from "@/lib/ai-writer";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const rawCaption = formData.get("title") as string;
    const rawDescription = formData.get("description") as string;
    const contentMode = (formData.get("contentMode") as StyleMode) || "Manual";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. Save file to temporary storage
    const tempDir = path.join(process.cwd(), "src/tmp");
    await fs.mkdir(tempDir, { recursive: true });

    const fileId = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const tempFilePath = path.join(tempDir, fileId);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(tempFilePath, buffer);

    // 2. Generate the Public URL for TikTok's PULL_FROM_URL
    const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
    const videoUrl = `${baseUrl}/api/media/${fileId}`;

    console.log(`Instructing TikTok to fetch from: ${videoUrl}`);

    // 3. Enrich through Intelligence Layer
    const enrichedContent = await generatePostContent(
      contentMode,
      rawCaption || file.name,
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
      if (fsSync.existsSync(tempFilePath)) await fs.unlink(tempFilePath);

      return NextResponse.json({ success: true, data: mockResult });
    }

    // 4. Orchestrate the TikTok Publishing Flow
    const result = await publishTikTokVideo({
      userId: session.user.id,
      videoPath: tempFilePath, // Pass the local file path for binary chunk upload
      title: truncatedCaption, // Pass the safely truncated caption
    });

    // 5. Cleanup temp files after a delay to ensure TikTok has fetched them
    setTimeout(async () => {
      try {
        if (fsSync.existsSync(tempFilePath)) {
          await fs.unlink(tempFilePath);
        }
        console.log(`Cleaned up temporary files for: ${fileId}`);
      } catch (e) {
        console.error("Failed to cleanup temp files", e);
      }
    }, 60000); // Wait 60 seconds to be safe

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("TikTok Upload Error:", error);
    return NextResponse.json({ 
      error: error.message || "TikTok upload failed" 
    }, { status: 500 });
  }
}
