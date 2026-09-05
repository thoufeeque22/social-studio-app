export const PLATFORMS = [
  { id: 'youtube', provider: 'google', name: 'YouTube Shorts', icon: 'youtube', color: '#FF0000', status: 'active' },
  { id: 'instagram', provider: 'facebook', name: 'Instagram Reels', icon: 'instagram', color: '#E4405F', status: 'active' },
  { id: 'tiktok', provider: 'tiktok', name: 'TikTok', icon: 'tiktok', color: '#000000', status: 'active' },
  { id: 'facebook', provider: 'facebook', name: 'Facebook', icon: 'facebook', color: '#1877F2', status: 'active' },
  { id: 'linkedin', provider: 'linkedin', name: 'LinkedIn', icon: 'linkedin', color: '#0A66C2', status: 'active' },
  { id: 'twitter', provider: 'twitter', name: 'Twitter/X', icon: 'twitter', color: '#000000', status: 'coming-soon' },
  { id: 'pinterest', provider: 'pinterest', name: 'Pinterest', icon: 'pinterest', color: '#E60023', status: 'coming-soon' },
  { id: 'threads', provider: 'threads', name: 'Threads', icon: 'threads', color: '#000000', status: 'coming-soon' },
] as const;

export type PlatformStatus = 'active' | 'coming-soon';
export type Platform = typeof PLATFORMS[number];

export const SURVEY_SOCIAL_PLATFORMS = ['TikTok', 'Instagram', 'X/Twitter', 'LinkedIn', 'Facebook', 'Pinterest', 'Reddit'] as const;

/** OAuth providers that have a login button on the sign-in page. */
export const LOGIN_PROVIDERS = ['google', 'facebook', 'tiktok', 'linkedin'] as const;
export type AuthProvider = typeof LOGIN_PROVIDERS[number];

export type AITier = 'Manual' | 'Enrich' | 'Generate';
export type StyleMode = 'Smart' | 'Gen-Z' | 'SEO' | 'Story' | 'Custom';

export const AI_TIERS: AITier[] = ['Manual', 'Enrich', 'Generate'];
export const STYLE_MODES: StyleMode[] = ['Smart', 'Gen-Z', 'SEO', 'Story', 'Custom'];

export const GEMINI_FALLBACK_MODELS = [
  "gemini-3-flash-preview",
  "gemini-3.1-pro-preview",
  "gemini-3-pro-preview",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
  "gemini-2.0-flash"
];

export const OLLAMA_DEFAULT_BASE_URL = "http://localhost:11434";
export const OLLAMA_DEFAULT_MODEL = "gemma4";

// Storage Quotas
export const MAX_STORAGE_PER_USER = 2 * 1024 * 1024 * 1024; // 2GB in bytes

// Metadata Constraints
export const PLATFORM_LIMITS: Record<string, { title?: number; description: number }> = {
  youtube: { title: 100, description: 5000 },
  instagram: { title: 100, description: 2200 },
  tiktok: { title: 100, description: 4000 },
  facebook: { title: 100, description: 5000 },
  linkedin: { title: 100, description: 3000 },
  default: { title: 100, description: 2000 },
};
