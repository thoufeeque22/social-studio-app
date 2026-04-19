import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

export const maxDuration = 300; 

/**
 * ASSEMBLE HANDLER
 * Concatenates all uploaded chunks into the final video file.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // --- AUTO-SCRUB SAFETY TASK ---
  // Periodically clean up src/tmp for files older than 2 hours
  try {
    const tempDir = path.join(process.cwd(), "src/tmp");
    if (fsSync.existsSync(tempDir)) {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile() && (now - stats.mtimeMs > 2 * 60 * 60 * 1000)) {
          await fs.unlink(filePath);
          console.log(`🧹 [AUTO-SCRUB] Purged old temp file: ${file}`);
        }
      }
    }
  } catch (err) {
    console.error("Auto-scrub failed:", err);
  }
  // ------------------------------

  try {
    const { uploadId, fileName, totalChunks } = await req.json();
    
    if (!uploadId || !fileName || totalChunks === undefined) {
      return NextResponse.json({ error: "Missing metadata for assembly" }, { status: 400 });
    }

    const chunkDir = path.join(process.cwd(), "src/tmp/chunks", uploadId);
    const tempDir = path.join(process.cwd(), "src/tmp");
    await fs.mkdir(tempDir, { recursive: true });

    // Use a unique file ID (basename) for the final staged file
    const fileId = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const finalPath = path.join(tempDir, fileId);

    console.log(`🧩 [ASSEMBLE] Joining ${totalChunks} chunks into: ${finalPath}`);

    // Create a write stream to combine chunks efficiently
    const writeStream = fsSync.createWriteStream(finalPath);

    const chunkFiles = (await fs.readdir(chunkDir)).sort();
    
    if (chunkFiles.length !== totalChunks) {
        return NextResponse.json({ 
            error: `Chunk mismatch. Expected ${totalChunks}, found ${chunkFiles.length}` 
        }, { status: 400 });
    }

    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(chunkDir, chunkFile);
      const chunkBuffer = await fs.readFile(chunkPath);
      writeStream.write(chunkBuffer);
      // Clean up chunk immediately after reading it into the stream
      await fs.unlink(chunkPath);
    }

    writeStream.end();

    // Give it a moment to finish writing
    await new Promise<void>((resolve) => writeStream.on('finish', () => resolve()));

    // Cleanup the empty chunk directory
    await fs.rmdir(chunkDir);

    console.log(`✅ [ASSEMBLE] Success: ${fileId}`);

    return NextResponse.json({ 
      success: true, 
      data: { 
        fileId,
        fileName
      } 
    });
  } catch (error: any) {
    console.error("Assembly Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
