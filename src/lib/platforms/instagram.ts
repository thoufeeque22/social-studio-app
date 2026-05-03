import { prisma } from "@/lib/core/prisma";
import { createReadStream } from "fs";
import fsSync from "fs";

export const getInstagramAccount = async (userId: string, accountId?: string) => {
  const account = accountId
    ? await prisma.account.findUnique({ where: { id: accountId, userId } })
    : await prisma.account.findFirst({ where: { userId, provider: "facebook" } });

  if (!account || !account.access_token) {
    throw new Error("Specified Facebook account for Instagram not found.");
  }

  // 1. Get the Facebook Page linked to an Instagram Business Account
  const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account,name,access_token&access_token=${account.access_token}`;
  
  const pagesRes = await fetch(pagesUrl);
  const pagesData = await pagesRes.json();

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found for this user.");
  }

  // Find a page that has a connected Instagram Business Account
  const pageWithIg = pagesData.data.find((page: any) => page.instagram_business_account);

  if (!pageWithIg) {
    throw new Error("No Instagram Business/Creator account found linked to your Facebook Pages.");
  }

  return {
    igUserId: pageWithIg.instagram_business_account.id,
    pageAccessToken: pageWithIg.access_token, // Sometimes needed for specific actions
    userAccessToken: account.access_token,
  };
};

interface PublishReelParams {
  userId: string;
  filePath: string;
  caption: string;
  musicId?: string;
}

export const publishInstagramReel = async ({
  userId,
  filePath,
  caption,
  musicId,
  accountId,
  creationId: existingCreationId,
  onProgress,
}: PublishReelParams & { accountId?: string; creationId?: string; onProgress?: (percent: number) => void; }) => {
  const { igUserId, userAccessToken } = await getInstagramAccount(userId, accountId);
  let creationId = existingCreationId;

  console.log(`Starting Instagram Reel upload for IG ID: ${igUserId}`);

  try {
    let offset = 0;
    const { promises: fsPromises, createReadStream } = await import('fs');
    const fileStats = await fsPromises.stat(filePath);
    const fileSize = fileStats.size;

    if (!creationId) {
      // STEP 1: Create Media Container (Resumable)
      const containerUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
      
      const bodyPayload: any = {
        upload_type: "resumable",
        caption: caption,
        media_type: "REELS",
        share_to_feed: true,
        access_token: userAccessToken,
      };

      if (musicId) {
        bodyPayload.audio_id = musicId;
      }

      const containerRes = await fetch(containerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const containerData = await containerRes.json();
      console.log(`📦 [IG-REEL-STEP1] Container Response:`, JSON.stringify(containerData));

      if (containerData.error) {
        console.error("❌ Instagram Container Creation Failed:", JSON.stringify(containerData.error, null, 2));
        throw new Error(`Instagram Step 1 Failed: ${containerData.error.message}`);
      }

      creationId = containerData.id;
      console.log(`🚀 [IG-REEL-PUSH] Container created: ${creationId}. Proceeding to binary push...`);
    } else {
      console.log(`🚀 [IG-REEL-RESUME] Checking offset for existing Creation ID: ${creationId}`);
      
      const offsetRes = await fetch(`https://rupload.facebook.com/ig-api-upload/v20.0/${creationId}`, {
        method: "GET",
        headers: {
          "Authorization": `OAuth ${userAccessToken}`
        }
      });
      
      if (offsetRes.ok) {
        const offsetHeader = offsetRes.headers.get("Offset");
        if (offsetHeader) {
          offset = parseInt(offsetHeader, 10);
          console.log(`🚀 [IG-REEL-RESUME] Resuming from offset: ${offset} / ${fileSize}`);
        }
      } else {
        console.warn(`🚀 [IG-REEL-RESUME] Failed to get offset, starting from 0. Status: ${offsetRes.status}`);
      }
    }

    if (offset < fileSize) {
      // STEP 2: Binary Push to rupload
      console.log(`🚀 [IG-REEL-PUSH] Uploading ${fileSize - offset} bytes starting at offset ${offset}...`);
      
      const fileStream = createReadStream(filePath, { start: offset });
      let bytesUploaded = offset;

      const { Transform } = await import('stream');
      const progressStream = new Transform({
        transform(chunk, encoding, callback) {
          bytesUploaded += chunk.length;
          if (onProgress) {
            const percent = (bytesUploaded / fileSize) * 100;
            onProgress(percent);

            if (bytesUploaded % (1024 * 1024) === 0 || bytesUploaded === fileSize) {
               console.log(`📤 [IG-UPLOAD-PROGRESS] ${percent.toFixed(1)}% (${(bytesUploaded / 1024 / 1024).toFixed(1)}MB / ${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
            }
          }
          callback(null, chunk);
        }
      });

      console.log(`📡 [IG-UPLOAD] Starting axios binary push to Meta (Size: ${((fileSize - offset) / 1024 / 1024).toFixed(2)} MB)`);
      const axios = (await import('axios')).default;
      
      try {
        const uploadRes = await axios.post(
          `https://rupload.facebook.com/ig-api-upload/v20.0/${creationId}`, 
          fileStream.pipe(progressStream), 
          {
            headers: {
              "Authorization": `OAuth ${userAccessToken}`,
              "Offset": offset.toString(),
              "Content-Length": (fileSize - offset).toString(),
              "X-Entity-Length": fileSize.toString(),
              "X-Entity-Name": `video_${Date.now()}.mp4`,
              "X-Entity-Type": "video/mp4",
              "Content-Type": "application/octet-stream"
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 300000 // 5 minute timeout
          }
        );
        console.log(`📤 [IG-REEL-PUSH] Binary Push Response:`, JSON.stringify(uploadRes.data));

        if (!uploadRes.data || uploadRes.data.success === false) {
          console.error("❌ Instagram Binary Push Failed:", JSON.stringify(uploadRes.data, null, 2));
          throw new Error(`Instagram Binary Push Failed: ${JSON.stringify(uploadRes.data)}`);
        }
      } catch (axiosError: any) {
        const errorData = axiosError.response?.data;
        console.error("❌ Instagram Axios Push Error:", JSON.stringify(errorData, null, 2) || axiosError.message);
        throw new Error(`Instagram Binary Push Failed: ${errorData?.error?.message || axiosError.message}`);
      }

      console.log(`🚀 [IG-REEL-PUSH] Binary push complete for ${creationId}. Waiting for processing...`);
    } else {
      console.log(`🚀 [IG-REEL-PUSH] File already fully uploaded. Proceeding to processing check...`);
    }

    // STEP 3: Poll for Processing Status
    let status = "IN_PROGRESS";
    const statusUrl = `https://graph.facebook.com/v20.0/${creationId}?fields=status_code&access_token=${userAccessToken}`;

    // Poll every 5 seconds, max 60 times (5 minutes total)
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      
      const statusRes = await fetch(statusUrl);
      const statusData = await statusRes.json();
      console.log(`🔍 [IG-REEL-POLL] Status Response:`, JSON.stringify(statusData));
      
      status = statusData.status_code;
      console.log(`Polling status: ${status}...`);

      if (status === "FINISHED") break;
      if (status === "ERROR") {
        throw new Error("Instagram video processing failed. Please check the logs.");
      }
    }

    if (status !== "FINISHED") {
      throw new Error("Instagram processing timed out. Please try again later.");
    }

    // STEP 4: Finalize/Publish
    console.log(`🚀 [IG-REEL-STEP4] Publishing Reel ${creationId}...`);
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish?creation_id=${creationId}&access_token=${userAccessToken}`, {
      method: "POST"
    });
    const publishData = await publishRes.json();
    console.log(`🎬 [IG-REEL-STEP4] Publish Response:`, JSON.stringify(publishData));

    if (publishData.error) {
      throw new Error(`Instagram Step 3 Failed: ${publishData.error.message}`);
    }

    const publishedMediaId = publishData.id;
    console.log(`Reel successfully published! ID: ${publishedMediaId}`);

    // STEP 5: Handshake for Gold Standard Link
    console.log(`🚀 [IG-REEL-STEP5] Fetching final permalink (with 4s grace)...`);
    await new Promise(r => setTimeout(r, 4000));
    
    try {
      const permalinkRes = await fetch(`https://graph.facebook.com/v20.0/${publishedMediaId}?fields=permalink,shortcode&access_token=${userAccessToken}`);
      const permalinkData = await permalinkRes.json();
      console.log(`🔗 [IG-REEL-STEP5] Handshake Response:`, JSON.stringify(permalinkData));
      
      let finalPermalink = permalinkData.permalink;
      if (!finalPermalink && permalinkData.shortcode) {
        finalPermalink = `https://www.instagram.com/reel/${permalinkData.shortcode}/`;
      }

      if (finalPermalink) {
        console.log(`✅ [IG-REEL] Final Handshake Success: ${finalPermalink}`);
        return { ...publishData, creationId, permalink: finalPermalink };
      }
    } catch (e) {
      console.warn("⚠️ Failed to fetch Instagram permalink.", e);
    }

    return { 
      ...publishData, 
      creationId, 
      permalink: `https://www.instagram.com/reel/${publishedMediaId}/` 
    };

  } catch (error: any) {
    console.error("❌ Instagram Distribution Failed:", error);
    throw { message: error.message, creationId, status: "failed" };
  }
};

export const getInstagramStats = async (userId: string, accountId?: string) => {
  const { igUserId, userAccessToken } = await getInstagramAccount(userId, accountId);
  const url = `https://graph.facebook.com/v20.0/${igUserId}?fields=followers_count,media_count,name&access_token=${userAccessToken}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) return null;

  const insightsUrl = `https://graph.facebook.com/v20.0/${igUserId}/insights?metric=reach,impressions&period=days_28&access_token=${userAccessToken}`;
  const insightsRes = await fetch(insightsUrl);
  const insightsData = await insightsRes.json();

  let reach = 0;
  if (insightsData.data) {
    const reachData = insightsData.data.find((m: any) => m.name === 'reach');
    if (reachData && reachData.values) {
      reach = reachData.values[0].value;
    }
  }

  return {
    followers: data.followers_count,
    media: data.media_count,
    name: data.name,
    reach: reach
  };
};
