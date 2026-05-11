import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { MAX_STORAGE_PER_USER } from "@/lib/core/constants";

interface PlatformInput {
  platform: string;
  accountId: string;
}

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, description, videoFormat, platforms, scheduledAt, isPublished } = await req.json();

    if (!platforms || !Array.isArray(platforms)) {
      return NextResponse.json({ error: "Missing platforms data" }, { status: 400 });
    }

    // 1. Check Per-User Storage Quota
    const usage = await prisma.galleryAsset.aggregate({
      where: { userId: session.user.id },
      _sum: { fileSize: true }
    });

    const currentUsage = Number(usage._sum.fileSize || 0);
    if (currentUsage >= MAX_STORAGE_PER_USER) {
      const usageMB = Math.round(currentUsage / (1024 * 1024));
      const limitMB = Math.round(MAX_STORAGE_PER_USER / (1024 * 1024));
      return NextResponse.json({ 
        error: `Storage limit exceeded. You are using ${usageMB}MB of your ${limitMB}MB quota. Please delete some old videos from your Gallery before uploading more.` 
      }, { status: 403 });
    }

    const history = await prisma.postHistory.create({
      data: {
        userId: session.user.id,
        title: title || "Untitled Post",
        description: description || null,
        videoFormat: videoFormat || "short",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        isPublished: isPublished === undefined ? true : isPublished,
        stagedFileId: null, // To be updated after assembly
        platforms: {
          create: (platforms as PlatformInput[]).map((p) => ({
            platform: p.platform,
            accountId: p.accountId,
            status: 'pending' // Initial state
          }))
        }
      },
      include: {
        platforms: true
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: { historyId: history.id } 
    });
  } catch (error: unknown) {
    console.error("Initialization Error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
