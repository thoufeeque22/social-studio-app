import { Account } from '@/lib/types';
import { formatHandle } from '@/lib/utils';
import { StyleMode } from '@/lib/constants';

interface UploadParams {
  formData: FormData;
  accounts: Account[];
  selectedAccountIds: string[];
  contentMode: StyleMode;
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
  onStatusUpdate
}: UploadParams) {
  const selectedAccounts = accounts.filter(a => selectedAccountIds.includes(a.id));
  const results: Record<string, any> = {};

  for (const account of selectedAccounts) {
    const platform = account.provider === 'google' ? 'youtube' : account.provider;
    const displayName = formatHandle(account.accountName, platform);
    
    onStatusUpdate(`Uploading to ${platform} (${displayName})...`);
    
    // Prepare account-specific formData
    const accountFormData = new FormData();
    for (const [key, value] of Array.from(formData.entries())) {
      accountFormData.append(key, value);
    }
    accountFormData.append('contentMode', contentMode);
    accountFormData.append('accountId', account.id);

    const response = await fetch(`/api/upload/${platform}`, {
      method: 'POST',
      body: accountFormData,
    });

    const result = await response.json();
    if (!result.success) {
      throw new Error(`${platform} (${displayName}): ${result.error}`);
    }
    
    results[account.id] = result.data;
    onStatusUpdate(`${displayName} Success! ➡️ Next...`);
  }

  return results;
}
