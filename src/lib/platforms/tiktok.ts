import { prisma } from "@/lib/core/prisma";

import { promises as fs } from "fs";

interface PublishTikTokParams {
  userId: string;
  videoPath: string;
  title: string;
  privacy?: "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
}

export const getTikTokAccount = async (userId: string, accountId?: string) => {
  const account = accountId
    ? await prisma.account.findUnique({ where: { id: accountId, userId } })
    : await prisma.account.findFirst({ where: { userId, provider: "tiktok" } });

  if (!account || !account.access_token) {
    throw new Error("Specified TikTok account not found for this user.");
  }

  return account;
};

export const publishTikTokVideo = async ({
  userId,
  videoPath,
  title,
  privacy = "SELF_ONLY",
  accountId,
}: PublishTikTokParams & { accountId?: string }) => {
  const account = await getTikTokAccount(userId, accountId);

  console.log(`Starting TikTok video upload for User ID: ${userId}`);

  // 1. Read file to get binary buffer and size
  const videoBuffer = await fs.readFile(videoPath);
  const videoSize = videoBuffer.length;

  const initUrl = "https://open.tiktokapis.com/v2/post/publish/video/init/";
  
  const payload = {
    post_info: {
      title,
      privacy_level: privacy,
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: videoSize,
      chunk_size: videoSize,
      total_chunk_count: 1,
    },
  };

  // 2. Initialize the upload to get the upload_url
  const initResponse = await fetch(initUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${account.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const initData = await initResponse.json();

  if (initData.error && initData.error.code !== "ok") {
    console.error("TikTok Publish Init Error:", initData.error);
    throw new Error(`TikTok Publish Failed: ${initData.error.message || "Unknown error"}`);
  }

  const uploadUrl = initData.data?.upload_url;
  if (!uploadUrl) {
    throw new Error("TikTok API did not return an upload_url");
  }

  console.log(`TikTok publish initialized. Uploading ${videoSize} bytes to chunk server...`);

  // 3. Upload the binary data to the designated TikTok chunk server
  const uploadResponse = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": videoSize.toString(),
      "Content-Range": `bytes 0-${videoSize - 1}/${videoSize}`,
    },
    body: videoBuffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(`TikTok Binary Upload Failed with status: ${uploadResponse.status}`);
  }

  console.log(`TikTok upload finished successfully!`);
  
  // Return the share_id or publish_id if successful
  return initData.data;
};
