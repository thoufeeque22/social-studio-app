export type PlanId = 'free-starter' | 'free-hacker' | 'power-pass' | 'creator-pro' | 'cloud-pro' | 'agency-pro' | 'lifetime-deal';

export const COMPARISON_CATEGORIES = [
  {
    name: 'Core Features',
    features: [
      {
        name: 'Social Connections',
        values: {
          'free-starter': 'Up to 3',
          'free-hacker': 'Unlimited',
          'power-pass': 'Unlimited',
          'creator-pro': 'Unlimited',
          'cloud-pro': 'Unlimited',
          'agency-pro': 'Unlimited',
          'lifetime-deal': 'Unlimited'
        }
      },
      {
        name: 'Posts per Month',
        values: {
          'free-starter': '10',
          'free-hacker': 'Unlimited',
          'power-pass': 'Unlimited (24h)',
          'creator-pro': 'Unlimited',
          'cloud-pro': 'Unlimited',
          'agency-pro': 'Unlimited',
          'lifetime-deal': 'Unlimited'
        }
      },
      {
        name: 'Watermark',
        values: {
          'free-starter': 'Yes',
          'free-hacker': 'Yes',
          'power-pass': 'Removed (24h)',
          'creator-pro': 'Removed',
          'cloud-pro': 'Removed',
          'agency-pro': 'Removed',
          'lifetime-deal': 'Removed'
        }
      },
      {
        name: 'Visual Content Calendar',
        values: {
          'free-starter': '-',
          'free-hacker': '-',
          'power-pass': 'Yes',
          'creator-pro': 'Yes',
          'cloud-pro': 'Yes',
          'agency-pro': 'Yes',
          'lifetime-deal': 'Yes'
        }
      },
      {
        name: 'Analytics',
        values: {
          'free-starter': '-',
          'free-hacker': '-',
          'power-pass': '-',
          'creator-pro': 'Coming Soon',
          'cloud-pro': 'Coming Soon',
          'agency-pro': 'Advanced',
          'lifetime-deal': 'Coming Soon'
        }
      },
      {
        name: 'Bulk Post Upload (CSV)',
        values: {
          'free-starter': '-',
          'free-hacker': '-',
          'power-pass': '-',
          'creator-pro': '-',
          'cloud-pro': 'Yes',
          'agency-pro': 'Yes',
          'lifetime-deal': '-'
        }
      }
    ]
  },
  {
    name: 'Infrastructure & Limits',
    features: [
      {
        name: 'Storage',
        values: {
          'free-starter': 'Ephemeral (24h)',
          'free-hacker': 'BYOS',
          'power-pass': 'Managed (24h)',
          'creator-pro': 'BYOS',
          'cloud-pro': '50GB Managed',
          'agency-pro': '500GB Managed',
          'lifetime-deal': 'BYOS'
        }
      },
      {
        name: 'High-Speed Scheduling',
        values: {
          'free-starter': 'Standard',
          'free-hacker': 'BYOK Limits',
          'power-pass': 'Yes',
          'creator-pro': 'BYOK Limits',
          'cloud-pro': 'Yes',
          'agency-pro': 'Yes',
          'lifetime-deal': 'BYOK Limits'
        }
      },
      {
        name: 'AI Operations',
        values: {
          'free-starter': '-',
          'free-hacker': 'BYOK Limits',
          'power-pass': '50 Credits',
          'creator-pro': 'BYOK Limits',
          'cloud-pro': '500 / mo',
          'agency-pro': '5,000 / mo',
          'lifetime-deal': 'BYOK Limits'
        }
      }
    ]
  },
  {
    name: 'Agency & Teams',
    features: [
      {
        name: 'Team Seats',
        values: {
          'free-starter': '-',
          'free-hacker': '-',
          'power-pass': '-',
          'creator-pro': '-',
          'cloud-pro': '-',
          'agency-pro': '5 Included',
          'lifetime-deal': '-'
        }
      },
      {
        name: 'Client Approval Workflows',
        values: {
          'free-starter': '-',
          'free-hacker': '-',
          'power-pass': '-',
          'creator-pro': '-',
          'cloud-pro': '-',
          'agency-pro': 'Yes',
          'lifetime-deal': '-'
        }
      },
      {
        name: 'White-Label Dashboard',
        values: {
          'free-starter': '-',
          'free-hacker': '-',
          'power-pass': '-',
          'creator-pro': '-',
          'cloud-pro': '-',
          'agency-pro': 'Yes',
          'lifetime-deal': '-'
        }
      }
    ]
  },
  {
    name: 'Support',
    features: [
      {
        name: 'Support Level',
        values: {
          'free-starter': 'Community',
          'free-hacker': 'Community',
          'power-pass': 'Standard',
          'creator-pro': 'Standard',
          'cloud-pro': 'Priority',
          'agency-pro': 'Dedicated',
          'lifetime-deal': 'Standard'
        }
      }
    ]
  }
];
