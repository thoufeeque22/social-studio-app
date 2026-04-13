import { google } from "googleapis";
import { prisma } from "./prisma";
import fs from "fs";

export const getYouTubeClient = async (userId: string) => {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "google",
    },
  });

  if (!account) {
    throw new Error("No Google account connected for this user.");
  }

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

export const uploadToYouTube = async ({
  userId,
  filePath,
  title,
  description,
  privacy = "private",
  musicId,
}: UploadParams) => {
  const youtube = await getYouTubeClient(userId);

  const res = await youtube.videos.insert(
    {
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title,
          description: musicId ? `${description}\n\n[Auto-Attached Audio: ${musicId}]` : description,
          tags: ["SocialStudio", "Automated"],
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: privacy,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(filePath),
      },
    },
    {
      // Use resumable upload for better reliability
      onUploadProgress: (evt) => {
        const progress = (evt.bytesRead / (evt as any).totalBytes) * 100;
        console.log(`${Math.round(progress)}% complete`);
      },
    }
  );

  return res.data;
};
