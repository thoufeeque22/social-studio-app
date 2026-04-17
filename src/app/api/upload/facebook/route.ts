import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { publishFacebookVideo } from "@/lib/facebook";
import fs from "fs/promises";
import path from "path";

/**
 * FACEBOOK NATIVE UPLOAD HANDLER
 * Saves the video temporarily and hands the Tunnel URL to the Facebook Pages API.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 1. Save file to temporary storage
    const tempDir = path.join(process.cwd(), "src/tmp");
    await fs.mkdir(tempDir, { recursive: true });

    const fileId = `${Date.now()}-fb-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const tempFilePath = path.join(tempDir, fileId);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(tempFilePath, buffer);

    // 2. Generate the Public URL for Facebook Crawler
    const baseUrl = process.env.TUNNEL_URL || process.env.AUTH_URL || "http://localhost:3000";
    const videoUrl = `${baseUrl}/api/media/${fileId}`;

    console.log(`Instructing Facebook Page API to fetch from: ${videoUrl}`);

    // 3. Post to Facebook Page Native API
    const result = await publishFacebookVideo({
      userId: session.user.id,
      videoUrl: videoUrl,
      title: title || file.name,
      description: description || "",
    });

    // 4. Cleanup temp file
    setTimeout(async () => {
      try {
        await fs.unlink(tempFilePath);
        console.log(`Cleaned up temp Facebook file: ${fileId}`);
      } catch (e) {
        console.error("Failed to cleanup temp file", e);
      }
    }, 60000); // 60 seconds buffer

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Facebook Native Upload Error:", error);
    return NextResponse.json({ 
      error: error.message || "Facebook upload failed" 
    }, { status: 500 });
  }
}
