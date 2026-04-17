export const PLATFORMS = [
  { id: 'instagram', provider: 'facebook', name: 'Instagram Reels', icon: '📸', color: '#E1306C' },
  { id: 'tiktok', provider: 'tiktok', name: 'TikTok', icon: '🎵', color: 'black' },
  { id: 'youtube', provider: 'google', name: 'YouTube Shorts', icon: '📺', color: 'hsl(var(--primary))' },
  { id: 'facebook', provider: 'facebook', name: 'Facebook', icon: '👥', color: '#1877F2' },
  { id: 'linkedin', provider: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0A66C2' },
  { id: 'twitter', provider: 'twitter', name: 'Twitter/X', icon: '𝕏', color: 'white' },
];

export type StyleMode = 'Hook' | 'SEO' | 'Gen-Z' | 'Manual';

export const STYLE_MODES: StyleMode[] = ['Manual', 'Hook', 'SEO', 'Gen-Z'];
