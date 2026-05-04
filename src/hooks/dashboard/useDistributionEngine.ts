import { useState, useRef } from 'react';
import { distributeToPlatforms } from '@/lib/upload/upload-utils';
import { AIWriteResult } from '@/lib/utils/ai-writer';
import { Account } from '@/lib/core/types';

export type PlatformStatus = 'pending' | 'uploading' | 'processing' | 'success' | 'failed' | 'cancelled';

export function useDistributionEngine(accounts: Account[]) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | React.ReactNode | null>(null);
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformStatus>>({});
  const [platformErrors, setPlatformErrors] = useState<Record<string, string>>({});
  const [successfulAccountIds, setSuccessfulAccountIds] = useState<string[]>([]);
  
  const abortControllers = useRef<Record<string, AbortController>>({});

  const handleAbortPlatform = (id: string) => {
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
      setPlatformStatuses(prev => ({ ...prev, [id]: 'cancelled' }));
      setPlatformErrors(prev => ({ ...prev, [id]: 'Stopped by user' }));
    }
  };

  const handleAbortAll = () => {
    setUploadStatus('⏹️ All uploads stopped by user.');
    setIsUploading(false);

    Object.values(abortControllers.current).forEach(controller => controller.abort());
    
    setPlatformStatuses(prev => {
      const next = { ...prev };
      Object.keys(abortControllers.current).forEach(id => {
        if (next[id] === 'pending' || next[id] === 'uploading' || next[id] === 'processing') {
          next[id] = 'cancelled';
        }
      });
      return next;
    });

    setPlatformErrors(prev => {
      const next = { ...prev };
      Object.keys(abortControllers.current).forEach(id => {
        next[id] = 'Stopped by user';
      });
      return next;
    });

    abortControllers.current = {};
  };

  const executeDistribution = async ({
    stagedFileId,
    fileName,
    historyId,
    formData,
    selectedAccountIds,
    reviewedContent,
    targetAccountIds
  }: {
    stagedFileId: string;
    fileName: string;
    historyId: string;
    formData: FormData;
    selectedAccountIds: string[];
    reviewedContent?: Record<string, AIWriteResult>;
    targetAccountIds?: string[];
  }) => {
    setIsUploading(true);
    
    const activeTargets = (targetAccountIds || selectedAccountIds).filter(
      id => !successfulAccountIds.includes(id)
    );
    
    if (activeTargets.length === 0) {
      setUploadStatus("✅ All selected platforms are already successful.");
      setIsUploading(false);
      return;
    }

    setUploadStatus(targetAccountIds ? `🔄 Retrying ${activeTargets.length} platform(s)...` : "🚀 Orchestrating distribution...");
    
    setPlatformStatuses(prev => {
      const next = { ...prev };
      activeTargets.forEach(id => { next[id] = 'pending'; });
      return next;
    });

    const controllers: Record<string, AbortController> = {};
    const signals: Record<string, AbortSignal> = {};
    activeTargets.forEach(id => {
      const controller = new AbortController();
      controllers[id] = controller;
      signals[id] = controller.signal;
    });
    abortControllers.current = controllers;

    try {
      const distribution = await distributeToPlatforms({
        stagedFileId,
        fileName,
        formData,
        accounts,
        selectedAccountIds: activeTargets,
        contentMode: (formData.get('contentMode') as any) || 'Smart',
        videoFormat: (formData.get('videoFormat') as any) || 'short',
        onStatusUpdate: setUploadStatus,
        onPlatformStatus: (id, status, error) => {
          setPlatformStatuses(prev => ({ ...prev, [id]: status as any }));
          if (error) setPlatformErrors(prev => ({ ...prev, [id]: error }));
        },
        onAccountSuccess: (id, result) => {
          if (result.status === 'success') {
            setSuccessfulAccountIds(prev => [...new Set([...prev, id])]);
          }
        },
        historyId,
        reviewedContent,
        signals
      });

      // Final status sync
      const finalResults = distribution.platformResults;
      setPlatformStatuses(prev => {
        const next = { ...prev };
        finalResults.forEach(result => {
          next[result.accountId] = result.status as any;
        });
        return next;
      });

      setPlatformErrors(prev => {
        const next = { ...prev };
        finalResults.forEach(result => {
          if (result.status === 'failed') {
            next[result.accountId] = result.errorMessage || 'Unknown error';
          }
        });
        return next;
      });

      return distribution;

    } catch (err: any) {
      console.error("Distribution engine failed", err);
      setUploadStatus(`❌ Distribution failed: ${err.message}`);
      return null;
    } finally {
      setIsUploading(false);
      abortControllers.current = {};
    }
  };

  return {
    isUploading,
    setIsUploading,
    uploadStatus,
    setUploadStatus,
    platformStatuses,
    setPlatformStatuses,
    platformErrors,
    setPlatformErrors,
    successfulAccountIds,
    setSuccessfulAccountIds,
    handleAbortPlatform,
    handleAbortAll,
    executeDistribution
  };
}
