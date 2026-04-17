export interface Account {
  id: string;
  provider: string;
  accountName: string | null;
  isDistributionEnabled: boolean;
}
