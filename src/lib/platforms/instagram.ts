import { prisma } from "@/lib/core/prisma";

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
}: PublishReelParams & { accountId?: string; creationId?: string }) => {
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
      
      const uploadRes = await fetch(`https://rupload.facebook.com/ig-api-upload/v20.0/${creationId}`, {
        method: "POST",
        headers: {
          "Authorization": `OAuth ${userAccessToken}`,
          "Offset": offset.toString(),
          "X-Entity-Length": fileSize.toString(),
          "X-Entity-Name": `video_${Date.now()}.mp4`,
          "X-Entity-Type": "video/mp4",
        },
        body: fileStream as any,
        // @ts-ignore
        duplex: 'half'
      });

      if (!uploadRes.ok) {
        const uploadData = await uploadRes.json().catch(() => null);
        console.error("❌ Instagram Binary Push Failed:", JSON.stringify(uploadData, null, 2) || uploadRes.statusText);
        throw new Error(`Instagram Binary Push Failed: ${uploadData?.error?.message || uploadRes.statusText}`);
      }
      console.log(`🚀 [IG-REEL-PUSH] Binary push complete for ${creationId}. Waiting for processing...`);
    } else {
      console.log(`🚀 [IG-REEL-PUSH] File already fully uploaded. Proceeding to processing check...`);
    }

  // STEP 2: Poll for Processing Status
  let status = "IN_PROGRESS";
  const statusUrl = `https://graph.facebook.com/v20.0/${creationId}?fields=status_code&access_token=${userAccessToken}`;

  // Poll every 5 seconds, max 60 times (5 minutes total)
  // Licensed music or high-quality video can take longer to process on Meta's side.
  for (let i = 0; i < 60; i++) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    const statusRes = await fetch(statusUrl);
    const statusData = await statusRes.json();
    
    status = statusData.status_code;
    console.log(`Polling status: ${status}...`);

    if (status === "FINISHED") break;
    if (status === "ERROR") {
      throw new Error("Instagram video processing failed. This usually indicates an issue with the Meta API or file format. Please check the logs.");
    }
  }

  if (status !== "FINISHED") {
    throw new Error("Instagram processing timed out. Please try again later.");
  }

  // STEP 3: Publish Media
  console.log("Publishing Reel...");
  const publishUrl = `https://graph.facebook.com/v20.0/${igUserId}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: userAccessToken,
    }),
  });

  const publishData = await publishRes.json();

  if (publishData.error) {
    throw new Error(`Instagram Step 3 Failed: ${publishData.error.message}`);
  }

    console.log("Reel successfully published!");
    return { ...publishData, creationId };
  } catch (error: any) {
    console.error("Instagram Upload Error:", error);
    // Wrap error to include creationId if we have one
    throw { message: error.message, creationId, status: "failed" };
  }
};

/**
 * Fetches account statistics for the given user's Instagram account.
 */
export const getInstagramStats = async (userId: string, accountId?: string) => {
  const { igUserId, userAccessToken } = await getInstagramAccount(userId, accountId);
  
  const url = `https://graph.facebook.com/v20.0/${igUserId}?fields=followers_count,media_count,name&access_token=${userAccessToken}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.error("Instagram Stats Error:", data.error);
    return null;
  }

  // Also try to get reach (insights) for the last 30 days
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
