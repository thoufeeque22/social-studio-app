import { Account } from '@/lib/core/types';
import { formatHandle } from '@/lib/utils/utils';
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
  
  onStatusUpdate("🔍 Checking for existing chunks...");
  let existingChunks: number[] = [];
  try {
    const chunksResponse = await fetch(`/api/upload/chunks/${uploadId}`, { signal });
    if (chunksResponse.ok) {
      const data = await chunksResponse.json();
      existingChunks = data.chunks || [];
    }
  } catch (e) { console.log("No existing chunks found or aborted"); }

  const CHUNK_SIZE = 5 * 1024 * 1024; 
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  
  for (let i = 0; i < totalChunks; i++) {
    if (existingChunks.includes(i)) continue;
    
    const start = i * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    onStatusUpdate(`📤 Uploading chunk ${i + 1}/${totalChunks}...`);
    const chunkResponse = await fetch(`/api/upload/chunk`, {
      method: 'POST',
      headers: {
        'x-upload-id': uploadId,
        'x-chunk-index': i.toString(),
      },
      body: chunk,
      signal
    });

    if (!chunkResponse.ok) throw new Error("Chunk upload failed");
  }

  onStatusUpdate("🔗 Assembling video...");
  const assembleResponse = await fetch(`/api/upload/assemble`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      uploadId,
      fileName: file.name,
      ...metadata,
      historyId: resumeHistoryId
    }),
    signal
  });

  const stageResult = await assembleResponse.json();
  if (!assembleResponse.ok) throw new Error(stageResult.error || "Assembly failed");

  return { 
    stagedFileId: stageResult.stagedFileId, 
    fileName: file.name,
    historyId: stageResult.historyId 
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
  onStatusUpdate,
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
  } catch (e) {}

  const processOne = async (selectionId: string) => {
    let platform: string;
    let realAccountId: string;

    if (selectionId.includes(':')) {
      [platform, realAccountId] = selectionId.split(':');
    } else {
      const account = accounts.find(a => a.id === selectionId);
      if (!account) return;
      platform = account.provider === 'google' ? 'youtube' : account.provider;
      realAccountId = account.id;
    }

    const account = accounts.find(a => a.id === realAccountId);
    if (onPlatformStatus) onPlatformStatus(selectionId, 'uploading', undefined);

    try {
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

    } catch (err: any) {
      const isAborted = err.name === 'AbortError' || err.message === 'The user aborted a request.';
      const platformResult: PlatformUploadResult = {
        accountId: selectionId,
        platform,
        accountName: account?.accountName || null,
        status: isAborted ? 'cancelled' : 'failed',
        errorMessage: isAborted ? 'Cancelled by user' : err.message,
        resumableUrl: err.resumableUrl,
        videoId: err.videoId,
        creationId: err.creationId
      };
      platformResults.push(platformResult);

      if (onPlatformStatus) onPlatformStatus(selectionId, isAborted ? 'cancelled' : 'failed', isAborted ? undefined : err.message);
      if (onAccountSuccess) onAccountSuccess(selectionId, platformResult);
    }
  };

  const workers = [];
  for (let i = 0; i < Math.min(concurrency, queue.length); i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const id = queue.shift();
        if (id) await processOne(id);
      }
    })());
  }

  await Promise.all(workers);
  return { platformResults };
}

/**
 * Coordinates the multi-platform upload process (Backward compatible).
 */
export async function performMultiPlatformUpload(params: UploadParams): Promise<{ platformResults: PlatformUploadResult[]; stagedFileId: string }> {
  const file = params.formData.get('file') as File;
  const { stagedFileId, fileName } = await stageVideoFile({ file, onStatusUpdate: params.onStatusUpdate, platforms: [], metadata: {} as any });
  const results = await distributeToPlatforms({ ...params, stagedFileId, fileName, historyId: '' });
  return { ...results, stagedFileId };
}
