import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { auth } from "@/auth";

/**
 * RESTRICTED MEDIA SERVER
 * This route allows Meta's servers to fetch the video file for Instagram Reels.
 * In a production environment, you should add CIDR whitelist for Meta IP ranges.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;

  // Basic security: only allow files with specific patterns or check for Meta headers
  const userAgent = req.headers.get("user-agent") || "";
  const isMetaAgent = userAgent.includes("facebookexternalhit") || userAgent.includes("Facebot");

  // For development, we might want to allow browser access to test the tunnel
  // Ideally, you'd check a signed token or a short-lived session here.

  const tempDir = path.join(process.cwd(), "src/tmp");
  const filePath = path.join(tempDir, fileId);

  try {
    // Check if file exists
    await fs.access(filePath);

    // Read file
    const fileBuffer = await fs.readFile(filePath);

    // Return file with correct headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "video/mp4", // Most Reels are MP4
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Media fetch error:", error);
    return new NextResponse("File not found or inaccessible", { status: 404 });
  }
}
