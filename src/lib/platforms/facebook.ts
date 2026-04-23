import "server-only";
import { prisma } from "@/lib/core/prisma";
import { promises as fs } from "fs";
import fsSync from "fs";

export const getFacebookPageAccount = async (userId: string, accountId?: string) => {
  const account = accountId
    ? await prisma.account.findUnique({ where: { id: accountId, userId } })
    : await prisma.account.findFirst({ where: { userId, provider: "facebook" } });

  if (!account || !account.access_token) {
    throw new Error("Specified Facebook account not found.");
  }

  // Fetch the list of pages the user manages
  const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=name,access_token&access_token=${account.access_token}`;
  
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
    const res = await fetch(`https://graph.facebook.com/v20.0/${videoId}?fields=status&access_token=${accessToken}`);
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
  const fileBuffer = await fs.readFile(filePath);
  const formData = new FormData();
  
  formData.append("source", new Blob([fileBuffer]) as any, "video.mp4");
  formData.append("title", title);
  formData.append("description", description);
  formData.append("access_token", pageAccessToken);

  const res = await fetch(`https://graph-video.facebook.com/v20.0/${pageId}/videos`, {
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
}: {
  userId: string;
  filePath: string;
  description: string;
  accountId?: string;
  videoId?: string;
}) => {
  const { pageId, pageAccessToken, pageName } = await getFacebookPageAccount(userId, accountId);
  let videoId = existingVideoId;

  if (!videoId) {
    console.log(`🚀 [FB-REEL-HANDSHAKE] Step 1: Initializing for ${pageName}`);

    // 1. START Step
    const initRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/video_reels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        upload_phase: "start",
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

    // 2. BINARY PUSH Step (to rupload)
    const fileBuffer = await fs.readFile(filePath);
    const fileStats = await fs.stat(filePath);

    const uploadRes = await fetch(`https://rupload.facebook.com/video-upload/v20.0/${videoId}`, {
      method: "POST",
      headers: {
        "Authorization": `OAuth ${pageAccessToken}`,
        "Offset": "0",
        "X-Entity-Length": fileStats.size.toString(),
        "X-Entity-Type": "video/mp4",
      },
      body: fileBuffer,
    });

    const uploadData = await uploadRes.json();
    if (!uploadData || uploadData.success === false || uploadData.error) {
      console.error("❌ Facebook Reel Step 2 (Binary Push) Failed:", JSON.stringify(uploadData, null, 2));
      throw new Error(`Reel Push Failed: ${uploadData.error?.message || JSON.stringify(uploadData)}`);
    }
  } else {
    console.log(`🚀 [FB-REEL-RESUME] Resuming from polling/finish for Video ID: ${videoId}`);
  }

  if (!videoId) throw new Error("Failed to acquire Video ID for polling");

  // 3. POLLING Step (5 Minutes Max)
  console.log(`🚀 [FB-REEL-HANDSHAKE] Step 3: Polling for ingestion...`);
  let videoReady = false;
  for (let i = 0; i < 60; i++) {
    await sleep(10000); // Check every 10s
    const statusReport = await getFacebookVideoStatus(videoId, pageAccessToken);
    console.log(`[FB-POLL] ${statusReport}`);
    
    // Proceed if State is 'ready' OR 'upload_complete' (Meta has the bytes)
    if (statusReport.includes('ready') || statusReport.includes('upload_complete')) {
      videoReady = true;
      break;
    }
    if (statusReport.includes('error')) {
      throw new Error(`Meta Ingestion Failed: ${statusReport}`);
    }
  }

  if (!videoReady) {
    throw new Error("Facebook Reel processing timed out (5m). File might still be fetching.");
  }

  // 4. FINISH Step
  console.log(`🚀 [FB-REEL-HANDSHAKE] Step 4: Finalizing...`);
  const finishRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/video_reels`, {
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
  if (finishData.error) throw new Error(`Reel Finish Failed: ${finishData.error.message}`);

  return { success: true, videoId, pageName };
};
