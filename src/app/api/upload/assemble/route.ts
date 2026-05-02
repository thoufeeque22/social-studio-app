import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { getVideoMetadata, checkTranscodeRequirement } from "@/lib/video/processor";

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
  // Periodically clean up src/tmp for untracked files older than 48 hours
  try {
    const tempDir = path.join(process.cwd(), "src/tmp");
    if (fsSync.existsSync(tempDir)) {
      const files = await fs.readdir(tempDir);
      const now = Date.now();
      for (const file of files) {
        if (file === 'chunks') continue;
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile() && (now - stats.mtimeMs > 7 * 24 * 60 * 60 * 1000)) {
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
    const { uploadId, fileName, totalChunks, totalSize, title, description, videoFormat, historyId, platforms } = await req.json();
    
    if (!uploadId || !fileName || totalChunks === undefined) {
      return NextResponse.json({ error: "Missing metadata for assembly" }, { status: 400 });
    }

    const chunkDir = path.join(process.cwd(), "src/tmp/chunks", path.basename(uploadId));
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
          return;
        }

        const cleanup = () => {
          stream.removeListener('drain', onDrain);
          stream.removeListener('error', onError);
        };

        function onDrain() {
          cleanup();
          resolve();
        }

        function onError(err: Error) {
          cleanup();
          reject(err);
        }

        stream.on('drain', onDrain);
        stream.on('error', onError);
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

    // REGISTER OR UPDATE IN GALLERY (LEAN GALLERY #388) - DEDUPLICATION LOGIC
    try {
      const stats = await fs.stat(finalPath);
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Check for existing asset with same name and size for this user
      const existingAsset = await prisma.galleryAsset.findFirst({
        where: {
          userId: session.user.id,
          fileName: fileName,
          fileSize: BigInt(stats.size)
        }
      });

      // 1. EXTRACT METADATA (FFMPEG PRE-FLIGHT)
      let videoMetadata = null;
      try {
        videoMetadata = await getVideoMetadata(finalPath);
        console.log(`🎬 [METADATA] Extracted for ${fileName}: ${videoMetadata.width}x${videoMetadata.height}`);
      } catch (me) {
        console.warn("⚠️ [METADATA] Extraction failed (non-critical):", me);
      }

      if (existingAsset) {
        console.log(`🔄 [GALLERY] Updating existing asset to prevent duplicate: ${fileName}`);
        await prisma.galleryAsset.update({
          where: { id: existingAsset.id },
          data: {
            fileId: fileId, // Point to the newest version
            expiresAt: sevenDaysFromNow,
            createdAt: new Date(), // Reset creation date for sorting
            metadata: videoMetadata as any
          }
        });
      } else {
        await prisma.galleryAsset.create({
          data: {
            userId: session.user.id,
            fileId: fileId,
            fileName: fileName,
            fileSize: BigInt(stats.size),
            mimeType: "video/mp4", // Default
            expiresAt: sevenDaysFromNow,
            metadata: videoMetadata as any
          }
        });
      }
    } catch (e) {
      console.warn("⚠️ [ASSEMBLE] Gallery registration failed (non-critical):", e);
    }

    // UPSERT POST HISTORY RECORD (RELIABILITY FIX V4)
    let history;
    const initialPlatformData = platforms ? await Promise.all((platforms as any[]).map(async (p) => {
      const { results } = await checkTranscodeRequirement(finalPath, [p.platform]);
      return {
        platform: p.platform,
        accountId: p.accountId,
        status: 'pending',
        transcodeStatus: results[p.platform]?.needsTranscode ? 'pending' : 'skipped'
      };
    })) : [];

    if (historyId) {
      history = await prisma.postHistory.update({
        where: { id: historyId, userId: session.user.id },
        data: {
          stagedFileId: fileId,
          title: title || undefined,
          description: description || undefined,
          isPublished: false,
          scheduledAt: new Date(),
          platforms: {
            upsert: initialPlatformData.map(p => ({
              where: { 
                postHistoryId_platform_accountId: { 
                  postHistoryId: historyId, 
                  platform: p.platform,
                  accountId: p.accountId 
                } 
              },
              update: { 
                accountId: p.accountId, 
                transcodeStatus: p.transcodeStatus 
              },
              create: p
            }))
          }
        }
      });
    } else {
      history = await prisma.postHistory.create({
        data: {
          userId: session.user.id,
          title: title || fileName || "Untitled Post",
          description: description || null,
          videoFormat: videoFormat || "short",
          stagedFileId: fileId,
          isPublished: false, // Background worker will pick this up
          scheduledAt: new Date(), // Publish ASAP
          platforms: {
            create: initialPlatformData
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
