import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";

/**
 * GET SINGLE HISTORY HANDLER
 * Returns a single history record with its platforms for pre-filling the dashboard.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const post = await prisma.postHistory.findUnique({
      where: { id, userId: session.user.id },
      include: { platforms: true }
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ data: post });
  } catch (error: any) {
    console.error("Failed to fetch history record:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
