import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import { StyleMode } from "@/lib/core/constants";
import fsSync from "node:fs";
import path from "node:path";
import { streamMultipartFormData } from "@/lib/upload/streaming-parser";
import { formatPlatformCaption } from "./distributor-utils";

interface PlatformHandlerParams {
  req: NextRequest;
  platform: 'youtube' | 'facebook' | 'instagram' | 'tiktok';
  uploadLogic: (params: {
    userId: string;
    filePath: string;
    title: string;
    description: string;
    videoFormat: string;
    accountId?: string;
    fields: Record<string, string>;
  }) => Promise<unknown>;
}

/**
 * UNIFIED PLATFORM ROUTE HANDLER
 * Handles boilerplate for all platform-specific upload routes.
 */
export async function handlePlatformUploadRequest({
  req,
  platform,
  uploadLogic
}: PlatformHandlerParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let filePath: string | undefined;
    let fileName: string | undefined;
    let fields: Record<string, string> = {};

    // 1. Resolve Staged File vs Multipart Stream
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json();
      if (body.stagedFileId) {
        // Security check: ensure the file is strictly within src/tmp
        const safeFileId = path.basename(body.stagedFileId);
        filePath = path.join(process.cwd(), "src/tmp", safeFileId);
        fields = body;
        fileName = body.fileName;
      }
    }

    if (!filePath) {
      const parsed = await streamMultipartFormData(req);
      filePath = parsed.filePath;
      fields = parsed.fields;
      fileName = parsed.fileName;
    }

    if (!filePath || !fsSync.existsSync(filePath)) {
      return NextResponse.json({ error: "No file uploaded or streaming failed" }, { status: 400 });
    }

    // 2. Extract Data
    const rawTitle = fields.title || fileName || "Untitled Video";
    const rawDescription = fields.description || "";
    const videoFormat = fields.videoFormat || "short";
    const accountId = fields.accountId;

    // SECURITY: Verify account ownership before proceeding
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: session.user.id }
      });
      if (!account) {
        return NextResponse.json({ 
          error: "Unauthorized: Account not found or not owned by user" 
        }, { status: 403 });
      }
      console.log(`🔐 [SECURITY] Account ownership verified for ${platform}: ${accountId}`);
    }

    // 3. MOCK_UPLOAD Check
    if (process.env.MOCK_UPLOAD === "true") {
      console.log(`🚀 [MOCK MODE] Skipping actual ${platform} API upload.`);
      // Optional: Cleanup temp files immediately if they weren't staged
      // (Staged files should stay for 24h as per scrub logic)
      return NextResponse.json({ 
        success: true, 
        data: { id: `mock-${platform}-${Date.now()}` } 
      });
    }

    // 4. Enrich through Intelligence Layer (AI)
    // BYPASS if already reviewed on client
    let enrichedContent: { title: string; description: string; hashtags: string[] };
    if (fields.reviewedContent) {
      console.log(`✨ [${platform}] Using user-reviewed AI content.`);
      const rc = JSON.parse(fields.reviewedContent) as import('@/lib/utils/ai-writer').AIWriteResult;
      enrichedContent = {
        title: rc.title || '',
        description: rc.description || '',
        hashtags: rc.hashtags || []
      };
    } else {
      console.log(`📝 [${platform}] Using Manual content.`);
      enrichedContent = {
        title: rawTitle,
        description: rawDescription,
        hashtags: []
      };
    }

    // Standard formatting for Caption/Description
    const finalCaption = formatPlatformCaption({
        title: enrichedContent.title,
        description: enrichedContent.description,
        hashtags: enrichedContent.hashtags,
        platform
    });

    // 5. Execute Platform-Specific SDK Logic
    try {
      const result = await uploadLogic({
        userId: session.user.id,
        filePath,
        title: enrichedContent.title,
        description: finalCaption,
        videoFormat,
        accountId,
        fields,
      });

      return NextResponse.json({ success: true, data: result });
    } catch (apiError: unknown) {
      console.error(`❌ [${platform}] API Error:`, apiError);
      const e = apiError as Record<string, unknown>;
      return NextResponse.json({ 
        success: false, 
        error: e.message || String(e),
        // Carry over resumable hints if available
        resumableUrl: e.resumableUrl,
        videoId: e.videoId,
        creationId: e.creationId
      }, { status: e.status === 'failed' ? 200 : 500 });
    }
  } catch (error: unknown) {
    console.error(`❌ [${platform}] Route Error:`, error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ 
        success: false, 
        error: message || `${platform} upload failed` 
    }, { status: 500 });
  }
}
