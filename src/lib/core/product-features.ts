export const PRODUCT_FEATURES = [
  {
    id: 'byos',
    title: 'Your Own Storage (BYOS)',
    description: "We don't store your videos. Connect a private cloud bucket (Bring Your Own Storage) to manage your media directly.",
    iconName: 'Storage'
  },
  {
    id: 'byok-platforms',
    title: 'Direct Connections (BYOK)',
    description: 'Connect directly to TikTok, YouTube, and Meta using your own keys (Bring Your Own Key). No middleware, no rate limits, you own the connection.',
    iconName: 'VpnKey'
  },
  {
    id: 'byok-ai',
    title: 'Zero-Markup AI (BYOK)',
    description: 'Connect your own ChatGPT or Gemini account (Bring Your Own Key). Polish content without paying expensive monthly subscription markups.',
    iconName: 'AutoAwesome'
  },
  {
    id: 'snippets',
    title: 'Metadata Snippets',
    description: 'Save and inject your most used hashtags, disclaimers, and calls-to-action with a single click. Stop retyping the same descriptions.',
    iconName: 'ContentPaste'
  }
] as const;
