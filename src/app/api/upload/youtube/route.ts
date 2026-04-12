import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadToYouTube } from "@/lib/youtube";
import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

// Max body size: 500MB (adjust as needed)
export const config = {
    api: {
        bodyParser: false,
    },
};

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
    const privacy = (formData.get("privacy") as "private" | "public" | "unlisted") || "private";

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

    // Call YouTube service
    const result = await uploadToYouTube({
      userId: session.user.id,
      filePath: tempFilePath,
      title: title || file.name,
      description: description || "",
      privacy,
    });

    // Clean up temp file
    await fs.unlink(tempFilePath);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}
