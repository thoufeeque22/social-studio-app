import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import fsSync from "fs";

const prisma = new PrismaClient();

async function clearActivity() {
  console.log("🧹 Starting Activity Hub Cleanup...");

  try {
    // 1. Delete Platform Results first (FK dependency)
    const { count: resultCount } = await prisma.postPlatformResult.deleteMany({});
    console.log(`- Deleted ${resultCount} platform result records.`);

    // 2. Delete Post History
    const { count: historyCount } = await prisma.postHistory.deleteMany({});
    console.log(`- Deleted ${historyCount} post history entries.`);

    // 3. Optional: Clear Gallery Assets (Staged files metadata)
    const { count: galleryCount } = await prisma.galleryAsset.deleteMany({});
    console.log(`- Deleted ${galleryCount} gallery assets.`);

    // 4. Clean up physical temp files in src/tmp
    const tempDir = path.join(process.cwd(), "src/tmp");
    if (fsSync.existsSync(tempDir)) {
      const files = await fs.readdir(tempDir);
      let deletedFiles = 0;
      for (const file of files) {
        if (file === '.gitignore' || file === 'chunks') continue;
        const filePath = path.join(tempDir, file);
        try {
           const stats = await fs.stat(filePath);
           if (stats.isDirectory()) {
              await fs.rm(filePath, { recursive: true, force: true });
           } else {
              await fs.unlink(filePath);
           }
           deletedFiles++;
        } catch (e) {
           // Skip if file already gone or busy
        }
      }
      
      // Chunks cleanup
      const chunkDir = path.join(tempDir, "chunks");
      if (fsSync.existsSync(chunkDir)) {
         const chunks = await fs.readdir(chunkDir);
         for (const chunk of chunks) {
            await fs.rm(path.join(chunkDir, chunk), { recursive: true, force: true });
            deletedFiles++;
         }
      }
      
      console.log(`- Purged ${deletedFiles} physical temp files/folders from src/tmp.`);
    }

    console.log("✨ Cleanup Complete! Your Activity Hub and Gallery are now fresh.");
  } catch (error) {
    console.error("❌ Cleanup Failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

clearActivity();
