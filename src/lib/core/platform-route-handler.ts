import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/core/prisma";
import fsSync from "node:fs";
import path from "node:path";
import { streamMultipartFormData } from "@/lib/upload/streaming-parser";
import { formatPlatformCaption } from "./distributor-utils";
import { getOptimizedVideoPath } from "@/lib/video/transcode-manager";

interface PlatformHandlerParams {
  req: NextRequest;
  platform: 'youtube' | 'facebook' | 'instagram' | 'tiktok' | 'local';
  uploadLogic: (params: {
    userId: string;
    filePath: string;
    title: string;
    description: string;
    videoFormat: string;
    accountId?: string;
    fields: Record<string, string>;
    onProgress?: (percent: number) => void;
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
      if (!body.stagedFileId) {
        console.log("❌ [PLATFORM] JSON request missing stagedFileId");
        return NextResponse.json({ error: "JSON request missing stagedFileId" }, { status: 400 });
      }
      // Security check: ensure the file is strictly within src/tmp
      const safeFileId = path.basename(body.stagedFileId);
      filePath = path.join(process.cwd(), "src/tmp", safeFileId);
      fields = body;
      fileName = body.fileName;
    } else if (contentType.includes("multipart/form-data")) {
      const parsed = await streamMultipartFormData(req);
      filePath = parsed.filePath;
      fields = parsed.fields;
      fileName = parsed.fileName;
    } else {
      console.log(`❌ [PLATFORM] Unsupported Content-Type: ${contentType}`);
      return NextResponse.json({ error: `Unsupported Content-Type: ${contentType}` }, { status: 400 });
    }

    if (!filePath || !fsSync.existsSync(filePath)) {
      console.log(`❌ [PLATFORM] File not found or path invalid. Path: "${filePath}". Exists: ${filePath ? fsSync.existsSync(filePath) : 'false'}`);
      return NextResponse.json({ error: "No file uploaded or streaming failed" }, { status: 400 });
    }

    const rawTitle = fields.title || fileName || "Untitled Video";
    const rawDescription = fields.description || "";
    const videoFormat = fields.videoFormat || "short";
    const accountId = fields.accountId;
    const historyId = fields.historyId;

    // 2.5 OPTIMIZATION LAYER (FFMPEG)
    let activeFilePath = filePath;
    try {
      const stagedFileId = fields.stagedFileId || path.basename(filePath);
      activeFilePath = await getOptimizedVideoPath(stagedFileId, platform, historyId);
    } catch (transError) {
      console.warn(`⚠️ [${platform}] Optimization failed, falling back to original:`, transError);
    }

    // 3. SECURITY: Verify account ownership before proceeding
    let accountName = 'Unknown Account';
    if (accountId) {
      const account = await prisma.account.findFirst({
        where: { id: accountId, userId: session.user.id }
      });
      if (!account) {
        return NextResponse.json({ 
          error: "Unauthorized: Account not found or not owned by user" 
        }, { status: 403 });
      }
      accountName = account.accountName || 'Unknown Account';
      console.log(`🔐 [SECURITY] Account ownership verified for ${platform}: ${accountId} (${accountName})`);
    }

    // 3. MOCK_UPLOAD Check
    if (process.env.MOCK_UPLOAD === "true") {
      console.log(`🚀 [MOCK MODE] Skipping actual ${platform} API upload.`);
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

    // 1.5 Ensure the record exists for onProgress updates
    if (historyId && accountId) {
      await prisma.postPlatformResult.upsert({
        where: {
          postHistoryId_platform_accountId: {
            postHistoryId: historyId,
            platform,
            accountId
          }
        },
        update: { status: 'uploading' },
        create: {
          postHistoryId: historyId,
          platform,
          accountId,
          accountName,
          status: 'uploading'
        }
      });
    }

    // 5. Execute Platform-Specific SDK Logic with Unified Heartbeat
    try {
      // Create a unified progress reporter that heartbeats to the DB
      let lastReported = -1;
      const wrappedOnProgress = async (percent: number) => {
        const currentPercent = Math.floor(percent);
        if (currentPercent > lastReported && historyId && accountId) {
          lastReported = currentPercent;
          console.log(`💓 [HEARTBEAT] ${platform} (${accountId}): ${currentPercent}%`);
          const { updatePlatformProgress } = await import("./heartbeat-server");
          await updatePlatformProgress(historyId, platform, accountId, currentPercent);
        }
      };

      const result = await uploadLogic({
        userId: session.user.id,
        filePath: activeFilePath,
        title: enrichedContent.title,
        description: finalCaption,
        videoFormat,
        accountId,
        fields,
        onProgress: wrappedOnProgress
      });

      // 6. PERSIST SUCCESS TO DATABASE
      if (historyId && accountId) {
        const { extractPlatformPostId, generatePermalink } = await import("./distributor-utils");
        const platformPostId = extractPlatformPostId(platform, result);
        const permalink = generatePermalink(platform, result);

        await prisma.postPlatformResult.update({
          where: {
            postHistoryId_platform_accountId: {
              postHistoryId: historyId,
              platform,
              accountId
            }
          },
          data: {
            status: 'success',
            platformPostId,
            permalink,
            progress: 100
          }
        });
        console.log(`✅ [${platform}] Database updated to success for history: ${historyId}`);
      }

      return NextResponse.json({ success: true, data: result });
    } catch (apiError: unknown) {
      console.error(`❌ [${platform}] API Error:`, apiError);
      const e = apiError as Record<string, unknown>;
      const errorMessage = (e.message as string) || String(e);

      // PERSIST FAILURE TO DATABASE
      if (historyId && accountId) {
        await prisma.postPlatformResult.update({
          where: {
            postHistoryId_platform_accountId: {
              postHistoryId: historyId,
              platform,
              accountId
            }
          },
          data: {
            status: 'failed',
            errorMessage
          }
        });
      }

      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        // Carry over resumable hints if available
        resumableUrl: e.resumableUrl as string | undefined,
        videoId: e.videoId as string | undefined,
        creationId: e.creationId as string | undefined
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
