export const PRICING_TIERS = [
  {
    id: 'free-starter',
    name: 'Free Starter',
    price: '$0',
    description: 'Easiest way to start. No technical setup required.',
    features: [
      'Up to 3 Social Connections',
      '10 Posts per Month',
      'Ephemeral Storage (Deletes after 24h)',
      'Watermarked Posts'
    ],
    cta: 'Start Free',
    highlighted: false
  },
  {
    id: 'free-hacker',
    name: 'Free Hacker',
    price: '$0',
    description: 'For technical creators who want unlimited capacity.',
    features: [
      'Unlimited Social Connections',
      'Unlimited Posts',
      'Requires BYOK & BYOS',
      'Watermarked Posts'
    ],
    cta: 'Build Your Own',
    highlighted: false
  },
  {
    id: 'power-pass',
    name: '24-Hour Pass',
    price: '$2.99',
    period: '/day',
    description: 'The Weekend Batcher. No monthly commitment.',
    features: [
      'Removes Watermark for 24h',
      'Unlimited High-Speed Scheduling',
      'Includes 50 Managed AI Credits',
      'Temporary Managed Storage'
    ],
    cta: 'Buy Pass',
    highlighted: true
  },
  {
    id: 'creator-pro',
    name: 'Creator Pro',
    price: '$5',
    period: '/mo',
    description: 'For technical creators who want clean branding and low costs.',
    features: [
      'Unlimited Connections & Posts',
      'Permanent Watermark Removal',
      'Visual Content Calendar',
      'Analytics (Free Future Update)',
      'Requires BYOK & BYOS'
    ],
    cta: 'Subscribe (BYO)',
    highlighted: false
  },
  {
    id: 'cloud-pro',
    name: 'Cloud Pro',
    price: '$20',
    period: '/mo',
    description: 'The "It Just Works" fully managed plan. Focus on your content, we handle the infrastructure.',
    features: [
      'Unlimited Connections & Posts',
      'Bulk Post Upload (CSV)',
      '50GB Managed Cloud Storage',
      '500 Managed AI Operations',
      'First-in-Line Priority Support'
    ],
    cta: 'Get Cloud Pro',
    highlighted: true
  },
  {
    id: 'agency-pro',
    name: 'Agency Scale',
    price: '$99',
    period: '/mo',
    description: 'For social media managers and creative agencies managing multiple clients.',
    features: [
      'Everything in Cloud Pro',
      'Includes 5 Team Seats',
      'Client Approval Workflows',
      'White-Label Client Dashboard'
    ],
    cta: 'Join Waitlist (Coming Soon)',
    disabled: true,
    highlighted: false
  },
  {
    id: 'lifetime-deal',
    name: 'Lifetime License',
    price: '$89',
    period: ' one-time',
    description: 'Anti-SaaS. Own the software forever.',
    features: [
      'Creator Pro Features Forever',
      'Requires BYOK & BYOS',
      'No Monthly Subscription',
      'Zero Marginal Cost'
    ],
    cta: 'Claim LTD',
    highlighted: false
  }
] as const;
