import { prisma } from "./prisma";

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
  // In the future, this can be expanded to allow UI selection
  const targetPage = pagesData.data[0];

  return {
    pageId: targetPage.id,
    pageAccessToken: targetPage.access_token,
    pageName: targetPage.name,
  };
};

interface PublishFacebookVideoParams {
  userId: string;
  videoUrl: string;
  title: string;
  description: string;
}

export const publishFacebookVideo = async ({
  userId,
  videoUrl,
  title,
  description,
  accountId,
}: PublishFacebookVideoParams & { accountId?: string }) => {
  const { pageId, pageAccessToken, pageName } = await getFacebookPageAccount(userId, accountId);

  console.log(`Starting Facebook Native auto-post for Page: ${pageName} (${pageId})`);

  // Facebook allows directly pulling from a URL without the container-polling flow used by Instagram
  const targetUrl = `https://graph.facebook.com/v20.0/${pageId}/videos`;

  const publishRes = await fetch(targetUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_url: videoUrl,
      title: title,
      description: description,
      access_token: pageAccessToken,
    }),
  });

  const publishData = await publishRes.json();

  if (publishData.error) {
    console.error("Facebook Upload Error:", publishData.error);
    throw new Error(`Facebook Native Upload Failed: ${publishData.error.message}`);
  }

  console.log(`Successfully posted video to Facebook Page (${pageName})`);
  return {
    success: true,
    videoId: publishData.id,
    pageName,
  };
};

/**
 * Publishes a video as a Facebook Reel.
 */
export const publishFacebookReel = async ({
  userId,
  videoUrl,
  description,
  accountId,
}: { userId: string, videoUrl: string, description: string, accountId?: string }) => {
  const { pageId, pageAccessToken, pageName } = await getFacebookPageAccount(userId, accountId);

  console.log(`Starting Facebook Reel auto-post for Page: ${pageName} (${pageId})`);

  // 1. Initialize the Reel upload
  const initUrl = `https://graph.facebook.com/v20.0/${pageId}/video_reels`;
  const initRes = await fetch(initUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_phase: "start",
      access_token: pageAccessToken,
    }),
  });

  const initData = await initRes.json();
  if (initData.error) {
    throw new Error(`Facebook Reel Init Failed: ${initData.error.message}`);
  }

  const { video_id: videoId } = initData;

  // 2. Upload the Reel from URL
  const uploadUrl = `https://graph.facebook.com/v20.0/${pageId}/video_reels`;
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      upload_phase: "finish",
      video_id: videoId,
      video_state: "PUBLISHED",
      description: description,
      file_url: videoUrl,
      access_token: pageAccessToken,
    }),
  });

  const uploadData = await uploadRes.json();
  if (uploadData.error) {
    throw new Error(`Facebook Reel Upload Failed: ${uploadData.error.message}`);
  }

  console.log(`Successfully posted Reel to Facebook Page (${pageName})`);
  return {
    success: true,
    videoId: videoId,
    pageName,
  };
};
