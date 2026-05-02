import { prisma } from "@/lib/core/prisma";
import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import { constructPublicVideoUrl } from "@/lib/core/distributor-utils";

export const getFacebookPageAccount = async (userId: string, accountId?: string) => {
  const account = accountId
    ? await prisma.account.findUnique({ where: { id: accountId, userId } })
    : await prisma.account.findFirst({ where: { userId, provider: "facebook" } });

  if (!account || !account.access_token) {
    throw new Error("Specified Facebook account not found.");
  }

  // Fetch the list of pages the user manages
  const pagesUrl = `https://graph.facebook.com/v22.0/me/accounts?fields=name,access_token&access_token=${account.access_token}`;
  
  const pagesRes = await fetch(pagesUrl);
  const pagesData = await pagesRes.json();

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found for this user. You must be an admin of a Facebook Page to post.");
  }

  // By default, we will just take the first page they manage
  const targetPage = pagesData.data[0];

  return {
    pageId: targetPage.id,
    pageAccessToken: targetPage.access_token,
    pageName: targetPage.name,
  };
};

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * GET DETAILED VIDEO STATUS (THE DOCTOR)
 */
export const getFacebookVideoStatus = async (videoId: string, accessToken: string) => {
  try {
    const res = await fetch(`https://graph.facebook.com/v22.0/${videoId}?fields=status&access_token=${accessToken}`);
    const data = await res.json();
    if (data.error) return `Unknown (Status Check Failed: ${data.error.message})`;
    
    const status = data.status || {};
    const videoStatus = status.video_status || 'unknown';
    const processingStatus = status.processing_phase?.status || 'n/a';
    
    return `State: ${videoStatus}, Processing: ${processingStatus}`;
  } catch (e) {
    return 'Unreachable';
  }
};

/**
 * BINARY PUSH UPLOAD FOR FACEBOOK VIDEOS (FEED)
 */
export const publishFacebookVideo = async ({
  userId,
  title,
  description,
  filePath,
  accountId,
  videoId: existingVideoId,
}: {
  userId: string;
  filePath: string;
  title: string;
  description: string;
  accountId?: string;
  videoId?: string;
}) => {
  const { pageId, pageAccessToken, pageName } = await getFacebookPageAccount(userId, accountId);

  if (existingVideoId) {
    console.log(`🚀 [FB-PUSH] Resuming status check for existing Video ID: ${existingVideoId}`);
    return { success: true, videoId: existingVideoId, pageName };
  }

  console.log(`🚀 [FB-PUSH] Initializing Feed Binary Push for: ${pageName}`);

  // 1. UPLOAD Phase (Binary Push)
  const fileStream = fsSync.createReadStream(filePath);
  const formData = new FormData();
  
  // Note: Standard Web fetch in Node 18+ supports streams in FormData
  formData.append("source", fileStream as any, "video.mp4");
  formData.append("title", title);
  formData.append("description", description);
  formData.append("access_token", pageAccessToken);

  const res = await fetch(`https://graph-video.facebook.com/v22.0/${pageId}/videos`, {
    method: "POST",
    body: formData,
  });

  const uploadData = await res.json();
  if (uploadData.error) {
    console.error("❌ Facebook Video Push Failed:", JSON.stringify(uploadData.error, null, 2));
    throw new Error(`FB Video Push Failed: ${uploadData.error.message}`);
  }
  
  console.log(`Successfully pushed Facebook Video for ${pageName}`);
  return { success: true, videoId: uploadData.id, pageName };
};

/**
 * CORRECT PULL-BASED UPLOAD FOR FACEBOOK REELS (v20.0)
 * Step 1: Initialize session
 * Step 2: Trigger pull via rupload
 * Step 3: Poll for ready
 * Step 4: Finalize
 */
export const publishFacebookReel = async ({
  userId,
  description,
  filePath,
  accountId,
  videoId: existingVideoId,
  onProgress,
}: {
  userId: string;
  filePath: string;
  description: string;
  accountId?: string;
  videoId?: string;
  onProgress?: (percent: number) => void;
}) => {
  const { pageId, pageAccessToken, pageName } = await getFacebookPageAccount(userId, accountId);
  let videoId = existingVideoId;

  if (!videoId) {
    console.log(`🚀 [FB-REEL-HANDSHAKE] Step 1: Initializing for ${pageName}`);

    // 1. START Step (Declaring video_state early sometimes fixes the "Missing" error)
    const initRes = await fetch(`https://graph.facebook.com/v22.0/${pageId}/video_reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_phase: "start",
        video_state: "PUBLISHED", 
        access_token: pageAccessToken,
      }),
    });

    const initData = await initRes.json();
    if (initData.error) {
      console.error("❌ Facebook Reel Handshake Step 1 Failed:", JSON.stringify(initData.error, null, 2));
      throw new Error(`Reel Handshake Step 1 Failed: ${initData.error.message}`);
    }
    videoId = initData.video_id;
    console.log(`🚀 [FB-REEL-PUSH] Step 2: Pushing Binary Data for ${videoId}`);

    // 2. BINARY PUSH Step
    const fileStats = await fs.stat(filePath);
    const fileStream = fsSync.createReadStream(filePath);
    let bytesUploaded = 0;

    const { Transform } = await import('stream');
    const progressStream = new Transform({
      transform(chunk, encoding, callback) {
        bytesUploaded += chunk.length;
        if (onProgress) {
          const percent = (bytesUploaded / fileStats.size) * 100;
          onProgress(percent);
          if (bytesUploaded % (1024 * 1024) === 0 || bytesUploaded === fileStats.size) { // Log every 1MB
             console.log(`📤 [FB-UPLOAD-PROGRESS] ${percent.toFixed(1)}% (${(bytesUploaded / 1024 / 1024).toFixed(1)}MB / ${(fileStats.size / 1024 / 1024).toFixed(1)}MB)`);
          }
        }
        callback(null, chunk);
      }
    });

    console.log(`📡 [FB-UPLOAD] Starting axios binary push to Meta (Size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
    const axios = (await import('axios')).default;
    
    const uploadRes = await axios.post(
      `https://rupload.facebook.com/video-upload/v22.0/${videoId}`, 
      fileStream.pipe(progressStream), 
      {
        headers: {
          "Authorization": `OAuth ${pageAccessToken}`,
          "Offset": "0",
          "Content-Length": fileStats.size.toString(),
          "X-Entity-Length": fileStats.size.toString(),
          "X-Entity-Name": `video_${Date.now()}.mp4`,
          "X-Entity-Type": "video/mp4",
          "Content-Type": "application/octet-stream"
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 300000 // 5 minute timeout
      }
    );

    if (!uploadRes.data || uploadRes.data.success === false) {
      console.error("❌ Facebook Reel Step 2 (Binary Push) Failed:", JSON.stringify(uploadRes.data, null, 2));
      throw new Error(`Reel Push Failed: ${JSON.stringify(uploadRes.data)}`);
    }
    
    if (onProgress) onProgress(100);
    console.log(`🚀 [FB-REEL-PUSH] Step 2 Success for ${videoId}. Meta has the bits.`);
  }

  // 3. POLLING Step (Wait for Meta to index the bits)
  console.log(`🚀 [FB-REEL-HANDSHAKE] Step 3: Waiting for Meta to index video bits...`);
  await sleep(15000); 

  let status = "IN_PROGRESS";
  for (let i = 0; i < 15; i++) {
    // Attempt a lightweight status check
    const statusRes = await fetch(`https://graph.facebook.com/v20.0/${videoId}?fields=status&access_token=${pageAccessToken}`);
    const statusData = await statusRes.json();
    
    const s = statusData.status || {};
    const vStatus = s.video_status?.status || s.video_status;
    
    console.log(`[FB-POLL] Iteration ${i}: Video Status: ${vStatus || 'n/a'}`);

    if (vStatus === 'ready' || vStatus === 'upload_complete') {
      status = "FINISHED";
      break;
    }

    // FALLBACK: If we've waited long enough and Step 2 was a success, 
    // we proceed to finalize as Meta's status API can be delayed.
    if (i >= 6) {
       console.log("⚠️ [FB-POLL] Status indexing is taking long. Proceeding to finalize based on Step 2 success.");
       status = "FINISHED";
       break;
    }

    if (vStatus === 'error') {
      throw new Error(`Meta Video Processing Failed: ${JSON.stringify(statusData)}`);
    }

    await sleep(10000);
  }

  if (status !== "FINISHED") {
    console.warn("⚠️ Facebook Reel processing timed out, attempting finalize...");
  }

  // 4. FINISH Step
  console.log(`🚀 [FB-REEL-HANDSHAKE] Step 4: Finalizing...`);
  const finishRes = await fetch(`https://graph.facebook.com/v22.0/${pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_phase: "finish",
      video_id: videoId,
      video_state: "PUBLISHED",
      description: description,
      access_token: pageAccessToken,
    }),
  });

  const finishData = await finishRes.json();
  if (finishData.error) {
    console.error("❌ Facebook Reel Finalize Failed:", JSON.stringify(finishData.error, null, 2));
    throw new Error(`Reel Finish Failed: ${finishData.error.message}`);
  }

  return { success: true, videoId, pageName };
};
