export interface Account {
  id: string;
  provider: string;
  accountName: string | null;
  isDistributionEnabled: boolean;
}
export interface PlatformPreference {
  id: string;
  userId: string;
  platformId: string;
  isEnabled: boolean;
}
