import { google } from "googleapis";
import { prisma } from "@/lib/core/prisma";
import { logTokenEvent } from "@/lib/core/audit";
import fs from "fs";

export const getYouTubeClient = async (userId: string, accountId?: string) => {
  // If accountId is provided, fetch specific account. Otherwise, fallback to findFirst (legacy).
  const account = accountId 
    ? await prisma.account.findUnique({ where: { id: accountId, userId } })
    : await prisma.account.findFirst({ where: { userId, provider: "google" } });

  if (!account) {
    throw new Error("Specified YouTube account not found for this user.");
  }

  // Log token access
  await logTokenEvent({
    userId,
    accountId: account.id,
    action: "ACCESS",
    provider: "google",
    reason: "Initializing YouTube client"
  });

  const auth = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );

  auth.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
  });

  // Automatically refresh token if needed
  auth.on("tokens", async (tokens) => {
    if (tokens.refresh_token) {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
        },
      });
    } else {
      await prisma.account.update({
        where: { id: account.id },
        data: {
          access_token: tokens.access_token,
          expires_at: tokens.expiry_date ? Math.floor(tokens.expiry_date / 1000) : undefined,
        },
      });
    }
  });

  return google.youtube({ version: "v3", auth });
};

interface UploadParams {
  userId: string;
  filePath: string;
  title: string;
  description: string;
  privacy: "private" | "public" | "unlisted";
  musicId?: string;
}

export interface YouTubeUploadResult {
  data: any;
  resumableUrl?: string;
}

export const uploadToYouTube = async ({
  userId,
  filePath,
  title,
  description,
  privacy = "private",
  musicId,
  accountId,
  resumableUrl,
  onProgress,
}: UploadParams & { 
  accountId?: string; 
  resumableUrl?: string;
  onProgress?: (percent: number) => void;
}): Promise<YouTubeUploadResult> => {
  const youtube = await getYouTubeClient(userId, accountId);
  const stats = await fs.promises.stat(filePath);
  const fileSize = stats.size;

  let uploadUrl = resumableUrl;

  // 1. Initialize session if no resumableUrl is provided
  if (!uploadUrl) {
    console.log("📺 [YT-RESUME] Initializing new resumable session...");
    
    const authObj = youtube.context._options.auth as any;
    let token = authObj?.credentials?.access_token;
    
    try {
      const authResult = typeof authObj?.getAccessToken === 'function' ? await authObj.getAccessToken() : authObj;
      token = typeof authResult === 'string' ? authResult : (authResult?.token || token);
    } catch (tokenErr: any) {
      console.warn("📺 [YT-RESUME] getAccessToken threw an error (likely no refresh token), falling back to raw access_token:", tokenErr.message);
    }
    const metadataRes = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Upload-Content-Length": fileSize.toString(),
        "X-Upload-Content-Type": "video/*",
      },
      body: JSON.stringify({
        snippet: {
          title,
          description: musicId ? `${description}\n\n[Auto-Attached Audio: ${musicId}]` : description,
          tags: ["SocialStudio", "Automated"],
          categoryId: "22",
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: false,
        },
      }),
    });

    if (!metadataRes.ok) {
      const err = await metadataRes.text();
      throw new Error(`YT Session Init Failed: ${err}`);
    }

    uploadUrl = metadataRes.headers.get("Location") || undefined;
    if (!uploadUrl) throw new Error("Google did not return a resumable session URL.");
    
    console.log("📺 [YT-RESUME] Session initiated:", uploadUrl);
  }

  // 2. Check current offset if we are resuming
  let startByte = 0;
  if (resumableUrl) {
    console.log("📺 [YT-RESUME] Checking offset for existing session...");
    const offsetRes = await fetch(uploadUrl!, {
      method: "PUT",
      headers: {
        "Content-Range": `bytes */${fileSize}`,
      },
    });

    if (offsetRes.status === 308) {
      const range = offsetRes.headers.get("Range");
      if (range) {
        startByte = parseInt(range.split("-")[1]) + 1;
        console.log(`📺 [YT-RESUME] Resuming from byte: ${startByte}`);
      }
    } else if (offsetRes.ok) {
      // Already finished?
      const data = await offsetRes.json();
      return { data, resumableUrl: uploadUrl };
    } else {
      // Session might have expired, restart
      console.log("📺 [YT-RESUME] Session expired or invalid, starting fresh...");
      return uploadToYouTube({ userId, filePath, title, description, privacy, musicId, accountId });
    }
  }

  // 3. Upload the remaining data
  console.log(`📺 [YT-UPLOAD] Uploading ${fileSize - startByte} bytes...`);
  
  const fileStream = fs.createReadStream(filePath, { start: startByte });
  let bytesUploaded = startByte;
  let lastReportedPercent = -1;

  // Use a simple transform to track progress
  const { Transform } = await import('stream');
  const progressStream = new Transform({
    transform(chunk, encoding, callback) {
      bytesUploaded += chunk.length;
      const currentPercent = Math.floor((bytesUploaded / fileSize) * 100);
      
      if (currentPercent > lastReportedPercent) {
        lastReportedPercent = currentPercent;
        if (onProgress) onProgress(currentPercent);
      }
      this.push(chunk);
      callback();
    }
  });
  
  const uploadRes = await fetch(uploadUrl!, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes ${startByte}-${fileSize - 1}/${fileSize}`,
    },
    body: fileStream.pipe(progressStream) as any,
    // @ts-ignore
    duplex: 'half'
  });

  if (!uploadRes.ok && uploadRes.status !== 308) {
    const err = await uploadRes.text();
    throw { message: `YT Upload Failed: ${err}`, resumableUrl: uploadUrl, status: "failed" };
  }

  const finalData = await uploadRes.json();
  return { data: finalData, resumableUrl: uploadUrl };
};

/**
 * Fetches channel statistics for the given user's YouTube account.
 */
export const getYouTubeStats = async (userId: string, accountId?: string) => {
  const youtube = await getYouTubeClient(userId, accountId);
  
  const response = await youtube.channels.list({
    part: ["statistics"],
    mine: true
  });

  const stats = response.data.items?.[0]?.statistics;
  if (!stats) return null;

  return {
    views: parseInt(stats.viewCount || "0"),
    subscribers: parseInt(stats.subscriberCount || "0"),
    videos: parseInt(stats.videoCount || "0")
  };
};
