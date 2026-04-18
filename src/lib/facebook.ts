import { prisma } from "./prisma";
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
 * PULL-BASED UPLOAD FOR FACEBOOK VIDEOS (FEED)
 */
export const publishFacebookVideo = async ({
  userId,
  videoUrl,
  title,
  description,
  accountId,
}: {
  userId: string;
  videoUrl: string;
  title: string;
  description: string;
  accountId?: string;
}) => {
  const { pageId, pageAccessToken, pageName } = await getFacebookPageAccount(userId, accountId);

  console.log(`🚀 [FB-PULL] Initializing Feed Pull for: ${pageName}`);

  // 1. START Phase
  const initRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/videos`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_url: videoUrl,
      title,
      description,
      access_token: pageAccessToken,
    }),
  });

  const initData = await initRes.json();
  if (initData.error) throw new Error(`FB Video Pull Failed: ${initData.error.message}`);
  
  console.log(`Successfully initiated Facebook Video pull for ${pageName}`);
  return { success: true, videoId: initData.id, pageName };
};

/**
 * PULL-BASED UPLOAD FOR FACEBOOK REELS (WITH POLLING)
 */
export const publishFacebookReel = async ({
  userId,
  videoUrl,
  description,
  accountId,
}: {
  userId: string;
  videoUrl: string;
  description: string;
  accountId?: string;
}) => {
  const { pageId, pageAccessToken, pageName } = await getFacebookPageAccount(userId, accountId);

  console.log(`🚀 [FB-REEL-PULL] Initializing Reel Pull for: ${pageName}`);

  // 1. START Step
  const initRes = await fetch(`https://graph.facebook.com/v20.0/${pageId}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_phase: "start",
      file_url: videoUrl, // Start the pull automatically
      access_token: pageAccessToken,
    }),
  });

  const initData = await initRes.json();
  if (initData.error) throw new Error(`Reel Init Failed: ${initData.error.message}`);
  const { video_id: videoId } = initData;

  console.log(`🚀 [FB-REEL-PULL] Container created: ${videoId}. Waiting for Meta to ingest...`);

  // 2. POLLING Step (5 Minutes Max)
  let videoReady = false;
  for (let i = 0; i < 60; i++) {
    await sleep(10000); // Check every 10s
    const statusReport = await getFacebookVideoStatus(videoId, pageAccessToken);
    console.log(`[FB-POLL] ${statusReport}`);
    
    if (statusReport.includes('ready')) {
      videoReady = true;
      break;
    }
    if (statusReport.includes('error')) {
      throw new Error(`Meta Ingestion Failed: ${statusReport}`);
    }
  }

  if (!videoReady) {
    throw new Error("Facebook processing timed out (5m). The video might still be processing; check your Page later.");
  }

  // 3. FINISH Step
  console.log(`🚀 [FB-REEL-PULL] Video ready! Finalizing publication...`);
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
