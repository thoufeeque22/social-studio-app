import { Account } from '@/lib/core/types';
import { formatHandle } from '@/lib/utils/utils';
import { StyleMode } from '@/lib/core/constants';
import { extractPlatformPostId, generatePermalink } from '@/lib/core/distributor-utils';

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
  onAccountSuccess?: (accountId: string, result: PlatformUploadResult) => void;
  historyId?: string; // Optional for real-time updates
  reviewedContent?: Record<string, import('@/lib/utils/ai-writer').AIWriteResult>;
  signals?: Record<string, AbortSignal>;
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
  resumeHistoryId,
  signal
}: { 
  file: File; 
  onStatusUpdate: (status: string) => void;
  metadata?: { title?: string; description?: string; videoFormat?: string; scheduledAt?: string; isPublished?: boolean };
  platforms: { platform: string; accountId: string }[];
  resumeHistoryId?: string;
  signal?: AbortSignal;
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
    const chunksResponse = await fetch(`/api/upload/chunks/${uploadId}`, { signal });
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
      signal
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
      totalSize: file.size,
      ...metadata,
      historyId
    }),
    signal
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
  historyId,
  reviewedContent,
  signals
}: UploadParams & { stagedFileId: string; fileName: string }): Promise<{ raw: Record<string, any>; platformResults: PlatformUploadResult[] }> {
  const results: Record<string, any> = {};
  const platformResults: PlatformUploadResult[] = [];

  onStatusUpdate("🚀 Physical upload complete. Distributing to platforms...");

  // Defensive concurrency - default to 2
  let concurrency = 2;
  try {
    const file = formData.get('file') as File | null;
    const size = file?.size || 0;
    if (size > 300 * 1024 * 1024) concurrency = 1;
    else if (size > 0 && size < 50 * 1024 * 1024) concurrency = 4;
  } catch (e) {}

  const queue = [...selectedAccountIds];
  
  // Instant visual feedback for the first batch
  const initialBatch = queue.slice(0, concurrency);
  initialBatch.forEach(id => {
    if (onPlatformStatus) onPlatformStatus(id, 'uploading');
  });

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
      // PLATFORM INTEGRITY: Sanitize and Truncate Metadata
      const sanitizeMetadata = (platform: string, title: string, desc: string) => {
        let finalTitle = title;
        let finalDesc = desc;

        if (platform === 'youtube') {
          // YouTube Shorts titles have a strict 100 char limit
          finalTitle = title.slice(0, 100);
        } else if (platform === 'tiktok') {
          // TikTok "title" is actually the caption. Limit to ~150 to be safe
          finalTitle = title.slice(0, 150);
        } else if (platform === 'instagram') {
          // Instagram captions are generous (2200), but we should ensure no weird characters
          finalDesc = desc.slice(0, 2200);
        }

        return { title: finalTitle, description: finalDesc };
      };

      const sanitized = sanitizeMetadata(platform, formData.get('title') as string, formData.get('description') as string);

      const payload = {
        stagedFileId,
        fileName,
        title: sanitized.title,
        description: sanitized.description,
        videoFormat,
        accountId: realAccountId,
        contentMode,
        reviewedContent: reviewedContent ? reviewedContent[platform] : undefined,
      };

      // HTTP API CALL (Standard Browser context)
      const response = await fetch(`/api/upload/${platform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: signals ? signals[selectionId] : undefined,
      });

      const responseText = await response.text();
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : { status: 'failed', message: 'No response from server' };
      } catch (e) {
        console.error(`Malformed JSON from ${platform}:`, responseText);
        throw new Error(`Server returned invalid response (${response.status}). The file might be too large for a single upload.`);
      }

      if (!response.ok) {
        throw { 
          message: data.error || data.message || `Failed to upload to ${platform}`,
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
      
      if (onAccountSuccess) onAccountSuccess(selectionId, platformResult);

    } catch (err: any) {
      const isAborted = err.name === 'AbortError' || err.message === 'The user aborted a request.';
      if (isAborted) {
        console.log(`⏹️ [${platform}] Upload cancelled by user.`);
      } else {
        console.error(`❌ [${platform}] Error: ${err.message}`);
      }
      
      results[selectionId] = { error: isAborted ? 'Cancelled' : err.message };
      const platformResult: PlatformUploadResult = {
        platform,
        accountName: account?.accountName || null,
        platformPostId: null,
        permalink: null,
        status: 'failed',
        errorMessage: isAborted ? 'Cancelled by user' : err.message,
        resumableUrl: err.resumableUrl,
        videoId: err.videoId,
        creationId: err.creationId
      };
      platformResults.push(platformResult);

      if (onPlatformStatus) onPlatformStatus(selectionId, 'failed');

      if (onAccountSuccess) onAccountSuccess(selectionId, platformResult);
    }
  };

  // Execute queue with concurrency limit
  const workers = [];
  const workerCount = Math.min(concurrency, queue.length);
  for (let i = 0; i < workerCount; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (id) await processOne(id);
      }
    })());
  }

  await Promise.all(workers);

  // Cleanup staged file after some time
  setTimeout(() => {
    fetch('/api/upload/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stagedFileId })
    }).catch(err => console.error("Secondary cleanup failed:", err));
  }, 24 * 60 * 60 * 1000); // 24h retention

  return { raw: results, platformResults };
}

/**
 * Coordinates the multi-platform upload process (Backward compatible).
 */
export async function performMultiPlatformUpload(params: UploadParams): Promise<{ raw: Record<string, any>; platformResults: PlatformUploadResult[]; stagedFileId: string }> {
  const file = params.formData.get('file') as File;
  const { stagedFileId, fileName } = await stageVideoFile({ file, onStatusUpdate: params.onStatusUpdate, platforms: [], metadata: {} as any });
  const results = await distributeToPlatforms({ ...params, stagedFileId, fileName, historyId: '' });
  return { ...results, stagedFileId };
}
