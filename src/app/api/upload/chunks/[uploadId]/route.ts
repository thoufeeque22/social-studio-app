import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

/**
 * GET CHUNKS HANDLER
 * Returns a list of already uploaded chunk indices for a specific upload session.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { uploadId } = await params;
  const chunkDir = path.join(process.cwd(), "src/tmp/chunks", uploadId);

  try {
    if (!fsSync.existsSync(chunkDir)) {
      return NextResponse.json({ chunks: [] });
    }

    const files = await fs.readdir(chunkDir);
    // Chunk files are named "00000", "00001", etc.
    const indices = files
      .map(f => parseInt(f, 10))
      .filter(idx => !isNaN(idx));

    return NextResponse.json({ chunks: indices });
  } catch (error: unknown) {
    console.error("Failed to list chunks:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
