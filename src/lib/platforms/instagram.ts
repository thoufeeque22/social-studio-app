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
      console.log(`🚀 [IG-REEL-PUSH] Container created: ${creationId}. Pushing binary data...`);

      // STEP 2: Binary Push to rupload
      const { promises: fs } = await import('fs');
      const fileStats = await fs.stat(filePath);
      const fileBuffer = await fs.readFile(filePath);

      const uploadRes = await fetch(`https://rupload.facebook.com/ig-api-upload/v20.0/${creationId}`, {
        method: "POST",
        headers: {
          "Authorization": `OAuth ${userAccessToken}`,
          "Offset": "0",
          "X-Entity-Length": fileStats.size.toString(),
          "X-Entity-Name": `video_${Date.now()}.mp4`,
          "X-Entity-Type": "video/mp4",
        },
        body: fileBuffer,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData || uploadData.success === false || uploadData.error) {
        console.error("❌ Instagram Step 2 (Binary Push) Failed:", JSON.stringify(uploadData, null, 2));
        throw new Error(`Instagram Step 2 Failed: ${uploadData.error?.message || JSON.stringify(uploadData)}`);
      }
      console.log(`🚀 [IG-REEL-PUSH] Binary push complete for ${creationId}. Waiting for processing...`);
    } else {
      console.log(`Resuming Instagram upload with existing Creation ID: ${creationId}`);
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
