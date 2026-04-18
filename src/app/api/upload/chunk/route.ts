import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

export const maxDuration = 300; // Chunk uploads should be fast

/**
 * CHUNK UPLOAD HANDLER
 * Receives a partial slice of a large video file.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const uploadId = req.headers.get("x-upload-id");
    const chunkIndex = req.headers.get("x-chunk-index");
    
    if (!uploadId || !chunkIndex) {
      return NextResponse.json({ error: "Missing x-upload-id or x-chunk-index" }, { status: 400 });
    }

    const chunkDir = path.join(process.cwd(), "src/tmp/chunks", uploadId);
    await fs.mkdir(chunkDir, { recursive: true });

    const chunkPath = path.join(chunkDir, `${chunkIndex.padStart(8, '0')}.part`);
    
    // Read binary body
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    await fs.writeFile(chunkPath, buffer);

    return NextResponse.json({ success: true, index: chunkIndex });
  } catch (error: any) {
    console.error("Chunk Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
