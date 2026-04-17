import { prisma } from "./prisma";

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
  videoUrl: string;
  caption: string;
  musicId?: string;
}

export const publishInstagramReel = async ({
  userId,
  videoUrl,
  caption,
  musicId,
  accountId,
}: PublishReelParams & { accountId?: string }) => {
  const { igUserId, userAccessToken } = await getInstagramAccount(userId, accountId);

  console.log(`Starting Instagram Reel upload for IG ID: ${igUserId}`);

  // STEP 1: Create Media Container
  const containerUrl = `https://graph.facebook.com/v20.0/${igUserId}/media`;
  
  const bodyPayload: any = {
    video_url: videoUrl,
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
    console.error("Instagram Container Error:", containerData.error);
    throw new Error(`Instagram Step 1 Failed: ${containerData.error.message}`);
  }

  const creationId = containerData.id;
  console.log(`Container created: ${creationId}. Waiting for processing...`);

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
      throw new Error("Instagram video processing failed. This usually means Meta could not fetch the file from your tunnel. Verify TUNNEL_URL in .env and make sure your ngrok tunnel is active.");
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
  return publishData;
};
