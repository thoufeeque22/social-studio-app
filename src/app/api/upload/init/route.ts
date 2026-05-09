import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";

/**
 * INIT HANDLER
 * Pre-initializes a post history record so it appears in the Activity Hub
 * even before the physical upload/assembly is finished.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, description, videoFormat, platforms } = await req.json();

    const history = await prisma.postHistory.create({
      data: {
        userId: session.user.id,
        title: title || "Untitled Post",
        description: description || null,
        videoFormat: videoFormat || "short",
        isPublished: false,
        scheduledAt: new Date(),
        platforms: {
          create: platforms.map((p: any) => ({
            platform: p.platform,
            accountId: p.accountId,
            status: 'pending',
            metadata: p.customContent ? { customContent: p.customContent } : undefined
          }))
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: { historyId: history.id } 
    });
  } catch (error: any) {
    console.error("Init Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
