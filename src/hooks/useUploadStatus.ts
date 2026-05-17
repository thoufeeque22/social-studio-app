import { useState, useEffect } from 'react';
import { z } from 'zod';

const UploadStatusSchema = z.object({
  status: z.string().nullable().optional(),
  percent: z.number().nullable().optional(),
  active: z.boolean(),
  historyId: z.string().nullable().optional(),
});

type UploadStatus = {
  status: string | null;
  percent: number | null;
  active: boolean;
  historyId: string | null;
};

export const useUploadStatus = (): UploadStatus => {
  const [status, setStatus] = useState<UploadStatus>({
    status: null,
    percent: null,
    active: false,
    historyId: null,
  });

  useEffect(() => {
    const checkStatus = () => {
      const rawData = localStorage.getItem('SS_STAGING_STATUS');
      if (!rawData) {
        setStatus({ status: null, percent: null, active: false, historyId: null });
        return;
      }

      try {
        const parsed = JSON.parse(rawData);
        const validated = UploadStatusSchema.parse(parsed);
        setStatus({
          status: validated.status ?? null,
          percent: validated.percent ?? null,
          active: validated.active,
          historyId: validated.historyId ?? null
        });
      } catch (error) {
        console.error('Failed to parse SS_STAGING_STATUS', error);
        setStatus({ status: null, percent: null, active: false, historyId: null });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 500);

    return () => clearInterval(interval);
  }, []);

  return status;
};
