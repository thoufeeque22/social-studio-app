import { Account } from '@/lib/types';
import { formatHandle } from '@/lib/utils';
import { StyleMode } from '@/lib/constants';

interface UploadParams {
  formData: FormData;
  accounts: Account[];
  selectedAccountIds: string[];
  contentMode: StyleMode;
  videoFormat: 'short' | 'long';
  onStatusUpdate: (status: string) => void;
}

/**
 * Coordinates the multi-platform upload process.
 */
export async function performMultiPlatformUpload({
  formData,
  accounts,
  selectedAccountIds,
  contentMode,
  videoFormat,
  onStatusUpdate
}: UploadParams) {
  const selectedAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));
  const results: Record<string, any> = {};

  // 1. PHASE ONE: Staging via Chunking (Zero-Memory Crash)
  const file = formData.get('file') as File;
  const uploadId = `up-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  onStatusUpdate(`📦 Initializing Chunked Upload (0 / ${totalChunks})...`);

  for (let i = 0; i < totalChunks; i++) {
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
      totalChunks
    }),
  });

  const stageResult = await assembleResponse.json();
  if (!stageResult.success) {
    throw new Error(`Assembly failed: ${stageResult.error}`);
  }

  const stagedFileId = stageResult.data.fileId;
  const fileName = stageResult.data.fileName;

  // 2. PHASE TWO: Internal Distribution
  onStatusUpdate("🚀 Physical upload complete. Distributing to platforms...");

  for (const account of selectedAccounts) {
    const platform = account.provider === 'google' ? 'youtube' : account.provider;
    const displayName = formatHandle(account.accountName, platform);
    
    onStatusUpdate(`Posting to ${platform} (${displayName})...`);
    
    // Prepare platform-specific metadata (No physical file sent here!)
    const payload = {
      stagedFileId,
      fileName,
      title: formData.get('title'),
      description: formData.get('description'),
      contentMode,
      videoFormat,
      accountId: account.id
    };

    const response = await fetch(`/api/upload/${platform}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(`${platform} (${displayName}): ${result.error}`);
    }
    
    results[account.id] = result.data;
    onStatusUpdate(`${displayName} Success!`);
  }

  return results;
}
