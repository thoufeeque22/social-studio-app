import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";

export const maxDuration = 300;

/**
 * CENTRALIZED CLEANUP HANDLER
 * Deletes a staged file once it's no longer needed by any platform.
 */
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { stagedFileId } = await req.json();
    
    if (!stagedFileId) {
      return NextResponse.json({ error: "Missing stagedFileId" }, { status: 400 });
    }

    // Security check: ensure the file is strictly within src/tmp
    const filePath = path.join(process.cwd(), "src/tmp", path.basename(stagedFileId));

    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
      console.log(`🗑️ [CLEANUP] Staged file deleted: ${stagedFileId}`);
      return NextResponse.json({ success: true });
    } else {
      console.warn(`⚠️ [CLEANUP] File already gone or not found: ${stagedFileId}`);
      return NextResponse.json({ success: true, message: "File not found" });
    }
  } catch (error: any) {
    console.error("Cleanup Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
