"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useAccounts } from '@/hooks/useAccounts';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsGrid } from '@/components/dashboard/StatsGrid';
import { UploadForm } from '@/components/dashboard/UploadForm';
import { SidebarInfo } from '@/components/dashboard/SidebarInfo';
import { performMultiPlatformUpload } from '@/lib/upload-utils';
import { StyleMode } from '@/lib/constants';

export default function Home() {
  const { data: session } = useSession();
  const { accounts, setAccounts } = useAccounts();
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [contentMode, setContentMode] = useState<StyleMode>('Manual');

  const [isInitialSync, setIsInitialSync] = React.useState(false);

  // Sync initial selection with distribution-enabled accounts
  useEffect(() => {
    if (accounts.length > 0 && !isInitialSync) {
      setSelectedAccountIds(
        accounts.filter(a => a.isDistributionEnabled).map(a => a.id)
      );
      setIsInitialSync(true);
    }
  }, [accounts, isInitialSync]);

  const handleToggleAccount = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get('file') as File;
    
    if (!file || file.size === 0) {
      alert('Please select a video file.');
      return;
    }

    setIsUploading(true);
    try {
      await performMultiPlatformUpload({
        formData,
        accounts,
        selectedAccountIds,
        contentMode,
        onStatusUpdate: setUploadStatus
      });

      setUploadStatus('All uploads completed successfully!');
      form.reset();
      // Reset selection to defaults
      setSelectedAccountIds(accounts.filter(a => a.isDistributionEnabled).map(a => a.id));
      alert('Post completed across selected accounts!');
    } catch (error: any) {
      console.error('Process error:', error);
      setUploadStatus(`Error: ${error.message}`);
      alert(error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fade-in">
      <DashboardHeader session={session} />
      
      <StatsGrid />

      <div className="responsive-grid">
        <UploadForm 
          isUploading={isUploading}
          uploadStatus={uploadStatus}
          accounts={accounts}
          selectedAccountIds={selectedAccountIds}
          contentMode={contentMode}
          onModeChange={setContentMode}
          onToggleAccount={handleToggleAccount}
          onSubmit={handleUpload}
        />

        <SidebarInfo accounts={accounts} />
      </div>
    </div>
  );
}
