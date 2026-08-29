export const INFRASTRUCTURE_ADDONS = [
  {
    id: 'managed-storage',
    name: 'Managed Storage',
    price: '$5',
    period: '/mo',
    description: '50GB of Cloud Storage (Replaces BYOS)'
  },
  {
    id: 'managed-ai',
    name: 'Managed Intelligence',
    price: '$10',
    period: '/mo',
    description: '500 AI Operations (Replaces BYOK)'
  },
  {
    id: 'team-seat',
    name: 'Team Workspace',
    price: '$15',
    period: '/mo',
    description: '1 Extra Seat + Approval Workflows'
  }
] as const;
