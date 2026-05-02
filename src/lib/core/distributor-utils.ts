/**
 * DISTRIBUTOR UTILITIES
 * Centralized helpers for platform distribution shared between 
 * API routes, Client-side uploads, and the Background Worker.
 */

/**
 * Extracts a platform-native post ID from the API response.
 */
export function extractPlatformPostId(platform: string, data: any): string | null {
  if (!data) return null;
  switch (platform) {
    case 'youtube': return data.id || data.data?.id || null;
    case 'facebook': return data.videoId || data.id || null;
    case 'instagram': return data.id || data.videoId || null;
    case 'tiktok': return data.publish_id || data.id || null;
    default: return null;
  }
}

/**
 * Generates a direct permalink to the published content on each platform.
 */
export function generatePermalink(platform: string, data: any): string | null {
  if (!data) return null;

  switch (platform) {
    case 'youtube': {
      const videoId = data.id || data.videoId;
      return videoId ? `https://youtube.com/watch?v=${videoId}` : null;
    }
    case 'facebook': {
      const videoId = data.videoId || data.id;
      // Facebook Reels and Videos can often be accessed via /watch/?v=
      return videoId ? `https://facebook.com/watch/?v=${videoId}` : null;
    }
    case 'instagram': {
      const mediaId = data.id || data.videoId;
      // Instagram Reels specific link pattern
      return mediaId ? `https://www.instagram.com/reels/${mediaId}/` : null;
    }
    case 'tiktok': {
      const publishId = data.publish_id || data.id;
      // TikTok doesn't easily give a direct video URL from publish_id, 
      // but we can link to the user's profile or a generic search
      return publishId ? `https://www.tiktok.com/` : null;
    }
    default:
      return null;
  }
}

import { generateSignedMediaUrl } from "./media-auth";

/**
 * Constructs a public video URL for platforms that require pull-based ingestion (FB/IG).
 * Uses time-limited signed tokens to prevent unauthorized access.
 */
export function constructPublicVideoUrl(stagedFileId: string): string {
  // Use the signed URL utility (defaults to 1 hour expiry)
  return generateSignedMediaUrl(stagedFileId, 60);
}

/**
 * Standardizes caption formatting across platforms.
 * Ensures consistent application of hashtags and line breaks.
 */
export function formatPlatformCaption({
  title,
  description,
  hashtags = [],
  platform
}: {
  title: string;
  description: string;
  hashtags?: string[];
  platform: string;
}): string {
  // YouTube uses snippet.title and snippet.description separately, but we might want to join them
  if (platform === 'youtube') {
    return description; // YouTube has dedicated title field
  }

  // Instagram/Facebook usually join everything into the caption/description
  const hashtagString = hashtags.length > 0 ? `\n\n${hashtags.join(" ")}` : "";
  
  if (title === description || !description) {
    let base = `${title}${hashtagString}`;
    if (platform === 'tiktok' && base.length > 150) {
      return base.substring(0, 147) + "...";
    }
    return base;
  }

  let full = `${title}\n\n${description}${hashtagString}`;
  if (platform === 'tiktok' && full.length > 150) {
    return full.substring(0, 147) + "...";
  }
  return full;
}
