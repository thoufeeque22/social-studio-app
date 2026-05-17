import { useState, useEffect } from 'react';
import { z } from 'zod';

const UploadStatusSchema = z.object({
  status: z.string().nullable().optional(),
  percent: z.number().nullable().optional(),
  active: z.boolean(),
});

type UploadStatus = {
  status: string | null;
  percent: number | null;
  active: boolean;
};

export const useUploadStatus = (): UploadStatus => {
  const [status, setStatus] = useState<UploadStatus>({
    status: null,
    percent: null,
    active: false,
  });

  useEffect(() => {
    const checkStatus = () => {
      const rawData = localStorage.getItem('SS_STAGING_STATUS');
      if (!rawData) {
        setStatus({ status: null, percent: null, active: false });
        return;
      }

      try {
        const parsed = JSON.parse(rawData);
        const validated = UploadStatusSchema.parse(parsed);
        setStatus({
          status: validated.status ?? null,
          percent: validated.percent ?? null,
          active: validated.active
        });
      } catch (error) {
        console.error('Failed to parse SS_STAGING_STATUS', error);
        setStatus({ status: null, percent: null, active: false });
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 500);

    return () => clearInterval(interval);
  }, []);

  return status;
};
