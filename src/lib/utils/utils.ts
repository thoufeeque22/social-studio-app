/**
 * Formats a name or email prefix into a clean @handle.
 * 
 * @param name The name or prefix to format
 * @param fallback The fallback string if name is missing
 * @returns A formatted handle string
 */
export const formatHandle = (name: string | null, fallback: string) => {
  if (!name) return fallback;
  
  // If it's already a handle or contains "Account", preserve it
  if (name.startsWith('@') || name.toLowerCase().includes('account')) {
    return name;
  }
  
  // Convert "John Doe" -> "@johndoe"
  return `@${name.replace(/\s+/g, '').toLowerCase()}`;
};

interface ProfileInfo {
  username?: string | null;
  handle?: string | null;
  login?: string | null;
  screen_name?: string | null;
  email?: string | null;
  name?: string | null;
}

export function extractAccountName(profile: ProfileInfo): string {
  // 1. Try to get a native handle (TikTok, Instagram, Twitter)
  let accountName = profile.username || profile.handle || profile.login || profile.screen_name;
  
  // 2. If no native handle, strip the @domain from the email and use it as a handle (YouTube/Google)
  if (!accountName && profile.email) {
    accountName = profile.email.split('@')[0];
  }

  // 3. Absolute fallback to their real name
  if (!accountName) {
    accountName = profile.name || "Connected Account";
  }

  return accountName;
}
