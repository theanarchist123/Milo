import { useState, useEffect, useRef } from 'react';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map<string, { url: string; ts: number }>();

const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY ?? '';

// Fallback gradient images per query keyword (so UI looks great without API key)
const FALLBACK_IMAGES: Record<string, string> = {
  'university library dark': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80',
  'empty desk': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80',
  'blank notebook': 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800&q=80',
  'abstract minimal': 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&q=80',
  physics: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&q=80',
  'computer science': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&q=80',
  'chemistry laboratory': 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=600&q=80',
  mathematics: 'https://images.unsplash.com/photo-1635372722656-389f87a941b7?w=600&q=80',
  'history books': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80',
  'literature books': 'https://images.unsplash.com/photo-1515378960530-7c0da6231fb1?w=600&q=80',
};

function getFallback(query: string): string {
  const lq = query.toLowerCase();
  for (const key of Object.keys(FALLBACK_IMAGES)) {
    if (lq.includes(key) || key.includes(lq)) return FALLBACK_IMAGES[key];
  }
  // Generic academic fallback
  return `https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80`;
}

export function useUnsplash(query: string): { url: string | null; loading: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const cacheKey = query.toLowerCase();

    // Check in-memory cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_DURATION_MS) {
      setUrl(cached.url);
      setLoading(false);
      return;
    }

    // If no API key, use fallback immediately
    if (!UNSPLASH_ACCESS_KEY) {
      const fallback = getFallback(query);
      cache.set(cacheKey, { url: fallback, ts: Date.now() });
      setUrl(fallback);
      setLoading(false);
      return;
    }

    // Fetch from Unsplash
    const endpoint = `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&w=1200`;
    fetch(endpoint, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` } })
      .then((r) => r.json())
      .then((data) => {
        const imgUrl = data?.urls?.regular ?? getFallback(query);
        if (mounted.current) {
          cache.set(cacheKey, { url: imgUrl, ts: Date.now() });
          setUrl(imgUrl);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted.current) {
          const fallback = getFallback(query);
          setUrl(fallback);
          setLoading(false);
        }
      });

    return () => { mounted.current = false; };
  }, [query]);

  return { url, loading };
}
