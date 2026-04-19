import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, description, videoFormat, platformIds, scheduledAt, isPublished } = await req.json();

    if (!platformIds || !Array.isArray(platformIds)) {
      return NextResponse.json({ error: "Missing platform IDs" }, { status: 400 });
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
          create: platformIds.map(pId => ({
            platform: pId,
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
  } catch (error: any) {
    console.error("Initialization Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
