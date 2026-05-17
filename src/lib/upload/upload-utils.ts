import { Account } from '@/lib/core/types';
import { StyleMode } from '@/lib/core/constants';
import { extractPlatformPostId, generatePermalink } from '@/lib/core/distributor-utils';

export interface PlatformUploadResult {
  accountId: string;
  platform: string;
  accountName: string | null;
  status: 'success' | 'failed' | 'cancelled';
  errorMessage?: string;
  platformPostId?: string | null;
  permalink?: string | null;
  resumableUrl?: string | null;
  videoId?: string | null;
  creationId?: string | null;
}

export type IndividualStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'failed' | 'cancelled';

interface UploadParams {
  formData: FormData;
  accounts: Account[];
  selectedAccountIds: string[];
  contentMode: StyleMode;
  videoFormat: 'short' | 'long';
  onStatusUpdate: (status: string) => void;
  onPlatformStatus?: (platformId: string, status: IndividualStatus, errorMessage?: string) => void;
  onAccountSuccess?: (accountId: string, result: PlatformUploadResult) => void;
  historyId?: string;
  reviewedContent?: Record<string, import('@/lib/utils/ai-writer').AIWriteResult>;
  signals?: Record<string, AbortSignal>;
}

/**
 * HELPER: Sanitize metadata based on platform restrictions
 */
function sanitizeMetadata(platform: string, title: string, desc: string) {
  let finalTitle = title || '';
  let finalDesc = desc || '';

  if (platform === 'youtube') {
    finalTitle = finalTitle.slice(0, 100);
  } else if (platform === 'tiktok') {
    finalTitle = finalTitle.slice(0, 150);
  } else if (platform === 'instagram') {
    finalDesc = finalDesc.slice(0, 2200);
  }

  return { title: finalTitle, description: finalDesc };
}

/**
 * HELPER: Check if a global abort has been requested via localStorage
 */
function checkGlobalAbort(historyId?: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage || !historyId) return false;
  const raw = localStorage.getItem('SS_STAGING_STATUS');
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw);
    // If the record exists for this ID but is marked inactive, it's an abort signal
    return parsed.historyId === historyId && parsed.active === false;
  } catch {
    return false;
  }
}

/**
 * PHASE ONE: Staging via Chunking (Zero-Memory Crash)
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
  const fingerprint = `${file.name}-${file.size}-${file.type}`.replace(/[^a-zA-Z0-9]/g, '_');
  const uploadId = resumeHistoryId || `up_${fingerprint}`;
  
  const broadcast = (status: string, percent?: number) => {
    onStatusUpdate(status);
    if (typeof window !== 'undefined' && window.localStorage) {
       window.localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({ 
         status, 
         percent, 
         active: true,
         timestamp: Date.now(),
         historyId: uploadId
       }));
    }
  };

  if (checkGlobalAbort(uploadId)) throw new Error("Upload cancelled by user.");

  broadcast("Synchronizing cockpit state...");
  let existingChunks: number[] = [];
  try {
    const chunksResponse = await fetch(`/api/upload/chunks/${uploadId}`, { signal });
    if (chunksResponse.ok) {
      const data = await chunksResponse.json();
      existingChunks = data.chunks || [];
    }
  } catch { console.log("No existing chunks found or aborted"); }

  const CHUNK_SIZE = 5 * 1024 * 1024; 
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    if (checkGlobalAbort(uploadId)) throw new Error("Upload cancelled by user.");

    if (existingChunks.includes(i)) {
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      broadcast(`Resuming stream: ${progress}%`, progress);
      continue;
    }
    
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const progress = Math.round((i / totalChunks) * 100);
    broadcast(`Streaming to Cloud: ${progress}%`, progress);

    let success = false;
    for (let retry = 0; retry < 3; retry++) {
      if (checkGlobalAbort(uploadId)) throw new Error("Upload cancelled by user.");

      try {
        const chunkResponse = await fetch(`/api/upload/chunk`, {
          method: 'POST',
          headers: {
            'x-upload-id': uploadId,
            'x-chunk-index': i.toString(),
          },
          body: chunk,
          signal
        });
        if (chunkResponse.ok) {
          success = true;
          break;
        }
      } catch (e: unknown) {
        console.warn(`Part ${i} stream failed (attempt ${retry + 1})`, e instanceof Error ? e.message : String(e));
      }
    }
    if (!success) throw new Error(`Stream interrupted at ${progress}%. Please check your connection.`);
  }

  if (checkGlobalAbort(uploadId)) throw new Error("Upload cancelled by user.");

  broadcast("Finalizing for launch...", 99);
  const assembleResponse = await fetch(`/api/upload/assemble`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId,
      fileName: file.name,
      totalChunks,
      totalSize: file.size,
      ...metadata,
      platforms,
      historyId: resumeHistoryId
    }),
    signal
  });

  const stageResult = await assembleResponse.json();
  if (!assembleResponse.ok) throw new Error(stageResult.error || "Assembly failed");

  // Cleanup broadcast on success
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('SS_STAGING_STATUS');
  }

  return { 
    stagedFileId: stageResult.data.fileId, 
    fileName: file.name,
    historyId: stageResult.data.historyId 
  };
}

/**
 * PHASE TWO: Multi-Platform Distribution
 */
export async function distributeToPlatforms({
  stagedFileId,
  fileName,
  formData,
  accounts,
  selectedAccountIds,
  contentMode,
  videoFormat,
  onPlatformStatus,
  onAccountSuccess,
  historyId,
  reviewedContent,
  signals
}: UploadParams & { stagedFileId: string; fileName: string }): Promise<{ platformResults: PlatformUploadResult[] }> {
  const platformResults: PlatformUploadResult[] = [];
  const queue = [...selectedAccountIds];
  let concurrency = 2;

  try {
    const file = formData.get('file') as File | null;
    const size = file?.size || 0;
    if (size > 300 * 1024 * 1024) concurrency = 1;
    else if (size > 0 && size < 50 * 1024 * 1024) concurrency = 4;
  } catch {
    // No-op
  }

  const processOne = async (selectionId: string) => {
    let platform: string;
    let realAccountId: string;

    if (checkGlobalAbort(historyId)) return;

    if (selectionId.includes(':')) {
      [platform, realAccountId] = selectionId.split(':');
    } else if (selectionId.startsWith('local-dev-')) {
      // Local simulated platforms map to 'local1', 'local2', etc. based on their number
      const num = selectionId.split('-').pop();
      platform = `local${num}`;
      realAccountId = selectionId;
    } else {
      const account = accounts.find(a => a.id === selectionId);
      if (!account) return;
      platform = account.provider === 'google' ? 'youtube' : account.provider;
      realAccountId = account.id;
    }

    const account = accounts.find(a => a.id === realAccountId);
    const broadcast = (status: string) => {
      if (onPlatformStatus) onPlatformStatus(selectionId, 'uploading', undefined);
      if (typeof window !== 'undefined' && window.localStorage) {
         window.localStorage.setItem('SS_STAGING_STATUS', JSON.stringify({ 
           status, 
           active: true,
           timestamp: Date.now(),
           historyId: historyId
         }));
      }
    };

    if (checkGlobalAbort(historyId)) return;

    broadcast(`Uploading to Platforms...`);

    try {
      const sanitized = sanitizeMetadata(platform, formData.get('title') as string, formData.get('description') as string);
      const endpointPlatform = platform.startsWith('local') ? 'local' : platform;
      
      const payload = {
        stagedFileId,
        fileName,
        title: sanitized.title,
        description: sanitized.description,
        videoFormat,
        accountId: realAccountId,
        contentMode,
        historyId,
        reviewedContent: reviewedContent ? reviewedContent[platform] : undefined,
        actualPlatform: platform, // Pass the specific local platform
      };

      const response = await fetch(`/api/upload/${endpointPlatform}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: signals ? signals[selectionId] : undefined,
      });

      const responseText = await response.text();
      interface DistributionResponse {
        data?: {
          videoId?: string;
          id?: string;
          creationId?: string;
          [key: string]: unknown;
        };
        error?: string;
        message?: string;
        resumableUrl?: string;
        videoId?: string;
        creationId?: string;
        id?: string;
      }

      let data: DistributionResponse;
      try {
        data = responseText ? JSON.parse(responseText) : { status: 'failed', message: 'No response from server' };
      } catch {
        throw new Error(`Server returned invalid response (${response.status})`);
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
        accountId: selectionId,
        platform,
        accountName: account?.accountName || null,
        platformPostId: extractPlatformPostId(platform, rawData),
        permalink: generatePermalink(platform, rawData),
        status: 'success',
        videoId: rawData.videoId || rawData.id,
        creationId: rawData.creationId
      };
      
      platformResults.push(platformResult);
      if (onPlatformStatus) onPlatformStatus(selectionId, 'success', undefined);
      if (onAccountSuccess) onAccountSuccess(selectionId, platformResult);

    } catch (err: unknown) {
      const error = err as { 
        name?: string; 
        message?: string; 
        resumableUrl?: string; 
        videoId?: string; 
        creationId?: string 
      };
      const isAborted = error.name === 'AbortError' || error.message === 'The user aborted a request.' || checkGlobalAbort(historyId);
      const platformResult: PlatformUploadResult = {
        accountId: selectionId,
        platform,
        accountName: account?.accountName || null,
        status: isAborted ? 'cancelled' : 'failed',
        errorMessage: isAborted ? 'Cancelled by user' : error.message,
        resumableUrl: error.resumableUrl,
        videoId: error.videoId,
        creationId: error.creationId
      };
      platformResults.push(platformResult);

      if (onPlatformStatus) onPlatformStatus(selectionId, isAborted ? 'cancelled' : 'failed', isAborted ? undefined : error.message);
      if (onAccountSuccess) onAccountSuccess(selectionId, platformResult);
    }
  };

  const workers = [];
  const activeConcurrency = Math.min(concurrency, queue.length);
  
  for (let i = 0; i < activeConcurrency; i++) {
    workers.push((async () => {
      while (true) {
        if (checkGlobalAbort(historyId)) break;
        const id = queue.shift();
        if (!id) break;
        await processOne(id);
      }
    })());
  }

  await Promise.all(workers);

  // Clear the staging status signal so the UI knows we're done with preparation/distribution
  if (typeof window !== 'undefined' && window.localStorage) {
    const current = localStorage.getItem('SS_STAGING_STATUS');
    if (current) {
      try {
        const parsed = JSON.parse(current);
        // Only clear if it's the same historyId to avoid clearing a newly started upload
        if (parsed.historyId === historyId) {
          localStorage.removeItem('SS_STAGING_STATUS');
        }
      } catch {
        localStorage.removeItem('SS_STAGING_STATUS');
      }
    }
  }

  return { platformResults };
}

/**
 * Coordinates the multi-platform upload process (Backward compatible).
 */
export async function performMultiPlatformUpload(params: UploadParams): Promise<{ platformResults: PlatformUploadResult[]; stagedFileId: string }> {
  const file = params.formData.get('file') as File;
  const { stagedFileId, fileName } = await stageVideoFile({ 
    file, 
    onStatusUpdate: params.onStatusUpdate, 
    platforms: [], 
    metadata: { title: params.formData.get('title') as string } 
  });
  const results = await distributeToPlatforms({ ...params, stagedFileId, fileName, historyId: '' });
  return { ...results, stagedFileId };
}
