import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { auth } from "@/auth";
import { verifyMediaSignature } from "@/lib/core/media-auth";

export const maxDuration = 300;

/**
 * HELPER: Simple MIME type mapping
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.mov': return 'video/quicktime';
    case '.avi': return 'video/x-msvideo';
    case '.webm': return 'video/webm';
    case '.mkv': return 'video/x-matroska';
    case '.mp4':
    default:
      return 'video/mp4';
  }
}

/**
 * RESTRICTED MEDIA SERVER
 * Supports HTTP Range Requests (206) for professional ingestors (Meta/TikTok).
 * Requires time-limited signed tokens (?expires=...&signature=...)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const expires = searchParams.get('expires');
  const signature = searchParams.get('signature');

  // 🔐 Verify Signature
  if (!verifyMediaSignature(fileId, expires, signature)) {
    return new NextResponse("Unauthorized: Invalid or expired media token", { status: 403 });
  }

  const tempDir = path.join(process.cwd(), "src/tmp");
  const filePath = path.join(tempDir, fileId);

  try {
    const stats = await fs.stat(filePath);
    const mimeType = getMimeType(fileId);
    const range = req.headers.get("range");

    if (range) {
      // 1. Handle HTTP 206 Partial Content
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;

      if (start >= stats.size) {
        return new NextResponse("Requested range not satisfiable", { 
          status: 416, 
          headers: { "Content-Range": `bytes */${stats.size}` } 
        });
      }

      const chunkSize = (end - start) + 1;
      const nodeStream = fsSync.createReadStream(filePath, { start, end });

      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on("data", (chunk) => controller.enqueue(chunk));
          nodeStream.on("end", () => controller.close());
          nodeStream.on("error", (err) => controller.error(err));
        },
        cancel() { nodeStream.destroy(); },
      });

      console.log(`📡 [RANGE] Serving bytes ${start}-${end}/${stats.size} to Meta`);

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Type": mimeType,
          "Content-Range": `bytes ${start}-${end}/${stats.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString()
        },
      });
    } else {
      // 2. Handle standard HTTP 200 OK
      const nodeStream = fsSync.createReadStream(filePath);
      const webStream = new ReadableStream({
        start(controller) {
          nodeStream.on("data", (chunk) => controller.enqueue(chunk));
          nodeStream.on("end", () => controller.close());
          nodeStream.on("error", (err) => controller.error(err));
        },
        cancel() { nodeStream.destroy(); },
      });

      console.log(`📡 [FULL] Serving ${fileId} to Meta`);

      return new NextResponse(webStream, {
        headers: {
          "Content-Type": mimeType,
          "Content-Length": stats.size.toString(),
          "Accept-Ranges": "bytes"
        },
      });
    }
  } catch (error) {
    console.error("Media fetch error:", error);
    return new NextResponse("File not found or inaccessible", { status: 404 });
  }
}

/**
 * SECURE DELETE: Remove asset from gallery and disk
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log(`🗑️ [GALLERY] Starting deletion for ${fileId}...`);

    // 1. Delete from DB (ownership check included)
    const dbDelete = await prisma.galleryAsset.delete({
      where: { 
        fileId: fileId,
        userId: session.user.id
      }
    }).catch(e => {
       console.warn(`⚠️ [GALLERY] DB record already gone or inaccessible for ${fileId}`);
       return null;
    });

    // 2. Physically delete from disk
    const tempDir = path.join(process.cwd(), "src/tmp");
    const filePath = path.join(tempDir, fileId);
    
    let diskDeleted = false;
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
      diskDeleted = true;
      console.log(`🗑️ [GALLERY] Deleted physical file: ${fileId}`);
    } else {
      console.log(`ℹ️ [GALLERY] Physical file already missing from disk: ${fileId}`);
    }

    if (!dbDelete && !diskDeleted) {
       return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, dbDeleted: !!dbDelete, diskDeleted });
  } catch (error: any) {
    console.error("❌ [GALLERY] Deletion Failed:", error);
    return NextResponse.json({ error: "Failed to delete asset" }, { status: 500 });
  }
}
