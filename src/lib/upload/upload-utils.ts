import { Account } from '@/lib/core/types';
import { formatHandle } from '@/lib/utils/utils';
import { StyleMode } from '@/lib/core/constants';

export interface PlatformUploadResult {
  platform: string;
  accountName: string | null;
  platformPostId: string | null;
  permalink: string | null;
  status: 'success' | 'failed' | 'pending';
  errorMessage?: string;
  resumableUrl?: string;
  videoId?: string;
  creationId?: string;
}

export type IndividualStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'failed';

interface UploadParams {
  formData: FormData;
  accounts: Account[];
  selectedAccountIds: string[];
  contentMode: StyleMode;
  videoFormat: 'short' | 'long';
  onStatusUpdate: (status: string) => void;
  onPlatformStatus?: (platformId: string, status: IndividualStatus) => void;
  onAccountSuccess?: (accountId: string) => void;
  historyId?: string; // Optional for real-time updates
}

/**
 * Generates a direct permalink to the published content on each platform.
 */
function generatePermalink(platform: string, data: any): string | null {
  if (!data) return null;

  switch (platform) {
    case 'youtube': {
      const videoId = data.id || data.videoId;
      return videoId ? `https://youtube.com/watch?v=${videoId}` : null;
    }
    case 'facebook': {
      const videoId = data.videoId || data.id;
      return videoId ? `https://facebook.com/${videoId}` : null;
    }
    case 'instagram': {
      const mediaId = data.id;
      return mediaId ? `https://instagram.com/reel/${mediaId}` : null;
    }
    case 'tiktok': {
      // TikTok's publish API does not return a public URL
      return null;
    }
    default:
      return null;
  }
}

/**
 * Extracts a platform-native post ID from the API response.
 */
function extractPlatformPostId(platform: string, data: any): string | null {
  if (!data) return null;
  switch (platform) {
    case 'youtube': return data.id || null;
    case 'facebook': return data.videoId || data.id || null;
    case 'instagram': return data.id || null;
    case 'tiktok': return data.publish_id || null;
    default: return null;
  }
}

/**
 * PHASE ONE: Staging via Chunking (Zero-Memory Crash)
 * Uploads the file in chunks and returns the stagedFileId.
 */
export async function stageVideoFile({
  file,
  onStatusUpdate,
  metadata,
  platforms,
  resumeHistoryId
}: { 
  file: File; 
  onStatusUpdate: (status: string) => void;
  metadata?: { title?: string; description?: string; videoFormat?: string; scheduledAt?: string; isPublished?: boolean };
  platforms: { platform: string; accountId: string }[];
  resumeHistoryId?: string;
}): Promise<{ stagedFileId: string; fileName: string; historyId: string }> {
  // 0. CREATE DETERMINISTIC UPLOAD ID (Fingerprinting for resumption)
  const fingerprint = `${file.name}-${file.size}-${file.type}`.replace(/[^a-zA-Z0-9]/g, '_');
  const uploadId = `resumable-${fingerprint}`;

  let historyId = resumeHistoryId;

  // 1. INITIALIZE HISTORY (Only if not resuming)
  if (!historyId) {
    onStatusUpdate("📝 Initializing post record...");
    const initResponse = await fetch('/api/upload/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        ...metadata,
        platforms
      }),
    });

    const initData = await initResponse.json();
    if (!initResponse.ok) {
      throw new Error(`Initialization failed: ${initData.error}`);
    }
    historyId = initData.data.historyId;
  } else {
    onStatusUpdate("🚀 Resuming existing history record...");
  }

  // 2. CHECK EXISTING CHUNKS (Resumption logic)
  onStatusUpdate("🔍 Checking for existing chunks...");
  let existingChunks: number[] = [];
  try {
    const chunksResponse = await fetch(`/api/upload/chunks/${uploadId}`);
    if (chunksResponse.ok) {
      const data = await chunksResponse.json();
      existingChunks = data.chunks || [];
    }
  } catch (err) {
    console.warn("Failed to check existing chunks, starting fresh.", err);
  }

  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  if (existingChunks.length > 0) {
    onStatusUpdate(`✨ Resuming upload! Found ${existingChunks.length} chunks already on server.`);
  }

  // 3. CHUNKED UPLOAD LOOP
  for (let i = 0; i < totalChunks; i++) {
    // Skip if already uploaded
    if (existingChunks.includes(i)) {
      continue;
    }

    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const progress = Math.round(((i + 1) / totalChunks) * 100);
    onStatusUpdate(`📤 Uploading Chunk ${i + 1}/${totalChunks} (${progress}%)...`);

    const chunkResponse = await fetch('/api/upload/chunk', {
      method: 'POST',
      headers: {
        'x-upload-id': uploadId,
        'x-chunk-index': i.toString(),
      },
      body: chunk,
    });

    if (!chunkResponse.ok) {
      throw new Error(`Chunk ${i} upload failed`);
    }
  }

  // Finalize assembly
  onStatusUpdate("🧩 Finalizing server-side assembly...");
  
  const assembleResponse = await fetch('/api/upload/assemble', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId,
      fileName: file.name,
      totalChunks,
      ...metadata,
      historyId
    }),
  });

  const stageResult = await assembleResponse.json();
  if (!stageResult.success) {
    throw new Error(`Assembly failed: ${stageResult.error}`);
  }

  return { 
    stagedFileId: stageResult.data.fileId, 
    fileName: stageResult.data.fileName,
    historyId: stageResult.data.historyId
  };
}

/**
 * PHASE TWO: Internal Distribution
 * Coordinates the multi-platform upload process.
 * Optionally updates an existing PostHistory record in real-time.
 */
export async function distributeToPlatforms({
  stagedFileId,
  fileName,
  formData,
  accounts,
  selectedAccountIds,
  contentMode,
  videoFormat,
  onStatusUpdate,
  onPlatformStatus,
  onAccountSuccess,
  historyId
}: UploadParams & { stagedFileId: string; fileName: string }): Promise<{ raw: Record<string, any>; platformResults: PlatformUploadResult[] }> {
  const results: Record<string, any> = {};
  const platformResults: PlatformUploadResult[] = [];

  onStatusUpdate("🚀 Physical upload complete. Distributing to platforms...");

  // DYNAMIC CONCURRENCY LOGIC
  const file = formData.get('file') as File;
  const sizeMB = (file?.size || 0) / (1024 * 1024);
  let concurrency = 2; // Default
  if (sizeMB < 50) concurrency = 4;
  else if (sizeMB > 300) concurrency = 1;

  console.log(`🚀 [CONCURRENCY] File size: ${sizeMB.toFixed(1)}MB. Concurrency limit: ${concurrency}`);

  const queue = [...selectedAccountIds];
  
  const processOne = async (selectionId: string) => {
    let platform: string;
    let realAccountId: string;

    // Parse platform and ID
    if (selectionId.includes(':')) {
      [platform, realAccountId] = selectionId.split(':');
    } else {
      const account = accounts.find(a => a.id === selectionId);
      if (!account) return;
      platform = account.provider === 'google' ? 'youtube' : account.provider;
      realAccountId = account.id;
    }

    const account = accounts.find(a => a.id === realAccountId);
    const displayName = formatHandle(account?.accountName || 'Unknown', platform);

    if (onPlatformStatus) onPlatformStatus(selectionId, 'uploading');

    try {
      const payload = {
        stagedFileId,
        fileName,
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        videoFormat,
        accountId: realAccountId,
        contentMode,
      };

      // HTTP API CALL (Standard Browser context)
      const response = await fetch(`/api/upload/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw { 
          message: data.error || `Failed to upload to ${platform}`,
          resumableUrl: data.resumableUrl,
          videoId: data.videoId,
          creationId: data.creationId
        };
      }

      const rawData = data.data || data;
      const platformResult: PlatformUploadResult = {
        platform,
        accountName: account?.accountName || null,
        platformPostId: extractPlatformPostId(platform, rawData),
        permalink: generatePermalink(platform, rawData),
        status: 'success',
        videoId: rawData.videoId || rawData.id,
        creationId: rawData.creationId
      };
      
      results[selectionId] = rawData;
      platformResults.push(platformResult);
      
      if (onPlatformStatus) onPlatformStatus(selectionId, 'success');
      
      // PERSISTENT UPDATE
      if (historyId) {
        const { upsertPlatformResult } = await import('@/app/actions/history');
        await upsertPlatformResult(historyId, platformResult);
      }

      if (onAccountSuccess) onAccountSuccess(selectionId);

    } catch (err: any) {
      console.error(`❌ [${platform}] Error: ${err.message}`);
      results[selectionId] = { error: err.message };
      const platformResult: PlatformUploadResult = {
        platform,
        accountName: account?.accountName || null,
        platformPostId: null,
        permalink: null,
        status: 'failed',
        errorMessage: err.message,
        resumableUrl: err.resumableUrl,
        videoId: err.videoId,
        creationId: err.creationId
      };
      platformResults.push(platformResult);

      if (onPlatformStatus) onPlatformStatus(selectionId, 'failed');

      if (historyId) {
        const { upsertPlatformResult } = await import('@/app/actions/history');
        await upsertPlatformResult(historyId, platformResult);
      }
      
      if (onAccountSuccess) onAccountSuccess(selectionId);
    }
  };

  // Execute queue with concurrency limit
  const workers = Array(Math.min(concurrency, queue.length)).fill(null).map(async () => {
    while (queue.length > 0) {
      const id = queue.shift();
      if (id) await processOne(id);
    }
  });

  await Promise.all(workers);

  // Cleanup staged file after some time
  setTimeout(() => {
    fetch('/api/upload/assemble', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: stagedFileId })
    }).catch(err => console.error("Secondary cleanup failed:", err));
  }, 24 * 60 * 60 * 1000); // 24h retention

  return { raw: results, platformResults };
}

/**
 * Coordinates the multi-platform upload process (Backward compatible).
 */
export async function performMultiPlatformUpload(params: UploadParams): Promise<{ raw: Record<string, any>; platformResults: PlatformUploadResult[]; stagedFileId: string }> {
  const file = params.formData.get('file') as File;
  const { stagedFileId, fileName } = await stageVideoFile({ file, onStatusUpdate: params.onStatusUpdate });
  const results = await distributeToPlatforms({ ...params, stagedFileId, fileName });
  return { ...results, stagedFileId };
}
