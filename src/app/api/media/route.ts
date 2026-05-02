import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { generateSignedMediaUrl } from "@/lib/core/media-auth";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

/**
 * MEDIA DISCOVERY API
 * Returns all currently staged assets for the authenticated user.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const assets = await prisma.galleryAsset.findMany({
      where: {
        userId: session.user.id,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // BigInt serialization fix
    const serializedAssets = assets.map(asset => ({
      ...asset,
      fileSize: asset.fileSize ? Number(asset.fileSize) : null,
      previewUrl: generateSignedMediaUrl(asset.fileId, 120) // 2 hour signed preview
    }));

    return NextResponse.json({ success: true, data: serializedAssets });
  } catch (error: any) {
    console.error("Gallery Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch gallery assets" }, { status: 500 });
  }
}

/**
 * BULK DELETE API
 */
export async function DELETE(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileIds, deleteAll } = await req.json();
    
    let targetIds = fileIds || [];

    if (deleteAll) {
      const userAssets = await prisma.galleryAsset.findMany({
        where: { userId: session.user.id },
        select: { fileId: true }
      });
      targetIds = userAssets.map(a => a.fileId);
      
      await prisma.galleryAsset.deleteMany({
        where: { userId: session.user.id }
      });
    } else {
      if (!Array.isArray(fileIds) || fileIds.length === 0) {
        return NextResponse.json({ error: "No file IDs provided" }, { status: 400 });
      }

      // 1. Bulk Delete from DB
      await prisma.galleryAsset.deleteMany({
        where: {
          fileId: { in: fileIds },
          userId: session.user.id
        }
      });
    }

    // 2. Physical cleanup
    const tempDir = path.join(process.cwd(), "src/tmp");
    for (const fileId of targetIds) {
      const filePath = path.join(tempDir, fileId);
      if (fsSync.existsSync(filePath)) {
        await fs.unlink(filePath).catch(e => console.warn(`Failed to delete ${fileId}:`, e));
      }
    }

    console.log(`🗑️ [GALLERY] Deleted ${targetIds.length} assets for user ${session.user.id} (deleteAll: ${!!deleteAll})`);
    return NextResponse.json({ success: true, count: targetIds.length });
  } catch (error: any) {
    console.error("Bulk Delete Error:", error);
    return NextResponse.json({ error: "Failed to delete assets" }, { status: 500 });
  }
}
