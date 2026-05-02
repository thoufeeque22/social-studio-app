import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  bitrate: number;
  size: number;
  format: string;
  codec: string;
}

export interface PlatformRules {
  maxResolution: { width: number; height: number };
  aspectRatio?: number; // width / height
  maxBitrateKbps?: number;
  maxSizeMB?: number;
  requiredFormat?: string;
}

export const PLATFORM_LIMITS: Record<string, PlatformRules> = {
  tiktok: {
    maxResolution: { width: 1080, height: 1920 },
    aspectRatio: 9 / 16,
    maxBitrateKbps: 8000,
    maxSizeMB: 500,
    requiredFormat: 'mp4'
  },
  instagram: {
    maxResolution: { width: 1080, height: 1920 },
    aspectRatio: 9 / 16,
    maxBitrateKbps: 8000,
    maxSizeMB: 4000, // 4GB
    requiredFormat: 'mp4'
  },
  youtube: {
    maxResolution: { width: 3840, height: 2160 },
    maxBitrateKbps: 50000,
    maxSizeMB: 128000, // 128GB
    requiredFormat: 'mp4'
  },
  facebook: {
    maxResolution: { width: 1080, height: 1920 },
    aspectRatio: 9 / 16,
    maxBitrateKbps: 8000,
    maxSizeMB: 1024, // 1GB for Reels compatibility
    requiredFormat: 'mp4'
  }
};

/**
 * Gets metadata for a video file
 */
export async function getVideoMetadata(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);

      const stream = metadata.streams.find(s => s.codec_type === 'video');
      if (!stream) return reject(new Error('No video stream found'));

      resolve({
        width: stream.width || 0,
        height: stream.height || 0,
        duration: metadata.format.duration || 0,
        bitrate: metadata.format.bit_rate || 0,
        size: metadata.format.size || 0,
        format: metadata.format.format_name || 'unknown',
        codec: stream.codec_name || 'unknown'
      });
    });
  });
}

/**
 * Determines if a video needs transcoding for specific platforms
 */
export async function checkTranscodeRequirement(filePath: string, platforms: string[]) {
  const metadata = await getVideoMetadata(filePath);
  const results: Record<string, { needsTranscode: boolean; reason?: string }> = {};

  for (const platform of platforms) {
    const rules = PLATFORM_LIMITS[platform];
    if (!rules) {
      results[platform] = { needsTranscode: false };
      continue;
    }

    const reasons: string[] = [];

    // Check Resolution
    if (metadata.width > rules.maxResolution.width || metadata.height > rules.maxResolution.height) {
      reasons.push(`Resolution ${metadata.width}x${metadata.height} exceeds max ${rules.maxResolution.width}x${rules.maxResolution.height}`);
    }

    // Check Bitrate
    if (rules.maxBitrateKbps && (metadata.bitrate / 1000) > rules.maxBitrateKbps) {
      reasons.push(`Bitrate ${Math.round(metadata.bitrate / 1000)}kbps exceeds max ${rules.maxBitrateKbps}kbps`);
    }

    // Check Size
    if (rules.maxSizeMB && (metadata.size / (1024 * 1024)) > rules.maxSizeMB) {
      reasons.push(`Size ${Math.round(metadata.size / (1024 * 1024))}MB exceeds max ${rules.maxSizeMB}MB`);
    }

    results[platform] = {
      needsTranscode: reasons.length > 0,
      reason: reasons.join(', ')
    };
  }

  return { metadata, results };
}

/**
 * Transcodes a video for a specific platform
 */
export async function transcodeForPlatform(
  inputPath: string, 
  platform: string, 
  onProgress?: (progress: number) => void
): Promise<string> {
  const rules = PLATFORM_LIMITS[platform];
  if (!rules) throw new Error(`No rules defined for platform: ${platform}`);

  const outputDir = path.dirname(inputPath);
  const outputFileName = `optimized_${platform}_${path.basename(inputPath)}`;
  const outputPath = path.join(outputDir, outputFileName);

  return new Promise((resolve, reject) => {
    let command = ffmpeg(inputPath)
      .outputOptions([
        '-movflags +faststart', // Enable fast start for web streaming
        '-pix_fmt yuv420p'      // Ensure compatibility
      ])
      .videoCodec('libx264')
      .audioCodec('aac')
      .toFormat('mp4');

    // Apply Resolution and Aspect Ratio rules
    if (platform === 'tiktok' || platform === 'instagram' || platform === 'facebook') {
      // Scale to fit 1080x1920 while maintaining aspect ratio (letterboxing/padding)
      command = command.size('1080x1920').aspect('9:16').autopad('black');
    } else {
      // For YouTube/General, just cap at 4K
      if (rules.maxResolution) {
         command = command.size(`${rules.maxResolution.width}x?`);
      }
    }

    // Apply Bitrate cap
    if (rules.maxBitrateKbps) {
      command = command.videoBitrate(`${rules.maxBitrateKbps}k`);
    }

    command
      .on('progress', (progress) => {
        if (onProgress && progress.percent) {
          onProgress(Math.round(progress.percent));
        }
      })
      .on('end', () => resolve(outputPath))
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}
