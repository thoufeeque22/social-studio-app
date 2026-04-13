export interface TrendingTrack {
  id: string; // The official Track ID to pass to platforms
  title: string;
  artist: string;
  usages: number;
  audioUrl?: string; // URL to download the audio for muxing fallback
}

/**
 * Global Trend Scout
 * Fetches trending music IDs and names based on a dynamic location.
 * In a real-world scenario, this would call an external API (like Apify or TikAPI).
 */
export async function fetchTrendingMusic(regionCode: string = 'US'): Promise<TrendingTrack[]> {
  // Simulate an external scraper/API call with a minor delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  const scraperApiKey = process.env.SCRAPER_API_KEY;
  if (!scraperApiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn("SCRAPER_API_KEY is not set. Using mocked trend data.");
    } else {
      throw new Error("SCRAPER_API_KEY is not configured for production use.");
    }
  }

  if (process.env.NODE_ENV === 'development') {
    // Simulated dynamic response based on region
    const baseTrends = [
      { id: "12345001", title: "Midnight City (Sped Up)", artist: "M83", usages: 1540000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
      { id: "12345002", title: "Aesthetic Vibes", artist: "LoFi Chill", usages: 850000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
      { id: "12345003", title: "Funny Goofy Beat", artist: "CreatorTools", usages: 420000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    ];

    if (regionCode.toUpperCase() === 'JP') {
      return [
        { id: "8888001", title: "Tokyo Drift (Fast)", artist: "Teriyaki Boyz", usages: 2100000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
        ...baseTrends,
      ];
    } else if (regionCode.toUpperCase() === 'IN') {
      return [
        { id: "9999001", title: "Desi Trending Hook", artist: "Bollywood Beats", usages: 3500000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
        ...baseTrends,
      ];
    }
    return baseTrends;
  }

  // Production scraper implementation placeholder
  throw new Error("Production trending scraper API not yet integrated.");
}

export async function getTrackById(id: string): Promise<TrendingTrack | null> {
  // In a real app, this would hit the DB or cache. 
  // For this mock, we'll just check all regions.
  const common = [
    { id: "12345001", title: "Midnight City (Sped Up)", artist: "M83", usages: 1540000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: "12345002", title: "Aesthetic Vibes", artist: "LoFi Chill", usages: 850000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { id: "12345003", title: "Funny Goofy Beat", artist: "CreatorTools", usages: 420000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { id: "8888001", title: "Tokyo Drift (Fast)", artist: "Teriyaki Boyz", usages: 2100000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { id: "9999001", title: "Desi Trending Hook", artist: "Bollywood Beats", usages: 3500000, audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" },
  ];
  return common.find(t => t.id === id) || null;
}
