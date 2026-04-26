import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
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
  // Periodically clean up src/tmp for files older than 24 hours
  try {
    const tempDir = path.join(process.cwd(), "src/tmp");
    if (fsSync.existsSync(tempDir)) {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile() && (now - stats.mtimeMs > 24 * 60 * 60 * 1000)) {
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
    const { uploadId, fileName, totalChunks, totalSize, title, description, videoFormat, historyId } = await req.json();
    
    if (!uploadId || !fileName || totalChunks === undefined) {
      return NextResponse.json({ error: "Missing metadata for assembly" }, { status: 400 });
    }

    const chunkDir = path.join(process.cwd(), "src/tmp/chunks", uploadId);
    const tempDir = path.join(process.cwd(), "src/tmp");
    await fs.mkdir(tempDir, { recursive: true });

    // Use a unique file ID (UUID) for the final staged file to prevent collisions
    const fileId = `${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const finalPath = path.join(tempDir, fileId);

    console.log(`🧩 [ASSEMBLE] Joining ${totalChunks} chunks into: ${finalPath}`);

    // Verify all chunks exist before starting
    const chunkFiles = (await fs.readdir(chunkDir)).sort();
    
    if (chunkFiles.length !== totalChunks) {
        return NextResponse.json({ 
            error: `Chunk mismatch. Expected ${totalChunks}, found ${chunkFiles.length}` 
        }, { status: 400 });
    }

    // Helper to write chunk and wait for drain if needed
    const writeChunk = (stream: fsSync.WriteStream, buffer: Buffer) => {
      return new Promise<void>((resolve, reject) => {
        const canWrite = stream.write(buffer);
        if (canWrite) {
          resolve();
        } else {
          stream.once('drain', resolve);
          stream.once('error', reject);
        }
      });
    };

    const writeStream = fsSync.createWriteStream(finalPath);

    try {
      for (const chunkFile of chunkFiles) {
        const chunkPath = path.join(chunkDir, chunkFile);
        const chunkBuffer = await fs.readFile(chunkPath);
        await writeChunk(writeStream, chunkBuffer);
        // Clean up chunk immediately after successful write
        await fs.unlink(chunkPath);
      }
    } finally {
      writeStream.end();
    }

    // Wait for the stream to fully close
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    // INTEGRITY CHECK: Verify total size
    if (totalSize) {
      const stats = await fs.stat(finalPath);
      if (stats.size !== totalSize) {
        // Cleanup the corrupt file
        await fs.unlink(finalPath);
        throw new Error(`Integrity Check Failed: Expected ${totalSize} bytes, got ${stats.size} bytes.`);
      }
      console.log(`📏 [INTEGRITY] Size verified: ${stats.size} bytes`);
    }

    // Cleanup the empty chunk directory
    await fs.rmdir(chunkDir);

    console.log(`✅ [ASSEMBLE] Success: ${fileId}`);

    // UPSERT POST HISTORY RECORD (RELIABILITY FIX V4)
    let history;
    if (historyId) {
      history = await prisma.postHistory.update({
        where: { id: historyId, userId: session.user.id },
        data: {
          stagedFileId: fileId,
          // metadata might have changed slightly or we just ensure it is set
          title: title || undefined,
          description: description || undefined,
        }
      });
    } else {
      // Fallback for legacy flows
      history = await prisma.postHistory.create({
        data: {
          userId: session.user.id,
          title: title || fileName || "Untitled Post",
          description: description || null,
          videoFormat: videoFormat || "short",
          stagedFileId: fileId,
          platforms: {
            create: []
          }
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        fileId,
        fileName,
        historyId: history.id
      } 
    });
  } catch (error: any) {
    console.error("Assembly Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
