let cachedFeed = null;
let feedExpires = 0;
let feedFetching = null;
const FEED_TTL = 15000; // 15 seconds

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers?.origin || '';
  if (origin && origin !== 'https://theblueboard.co' && !origin.includes('localhost')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const airline = req.query.airline || 'UAL';
    // Validate airline: 2-4 letter ICAO code
    if (!/^[A-Z0-9]{2,4}$/i.test(airline)) {
      return res.status(400).json({ error: 'Invalid airline code' });
    }

    const now = Date.now();

    // Return cached if fresh
    if (cachedFeed && now < feedExpires) {
      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
      return res.status(200).json(cachedFeed);
    }

    // Dedup: if already fetching, wait for that
    if (feedFetching) {
      const data = await feedFetching;
      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
      return res.status(200).json(data);
    }

    const doFetch = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const upstream = await fetch(`https://data-cloud.flightradar24.com/zones/fcgi/feed.js?airline=${encodeURIComponent(airline)}`, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TheBlueBoardDashboard/1.0 (https://theblueboard.co)',
          'Accept': 'application/json'
        }
      });
      clearTimeout(timeout);
      if (!upstream.ok) throw new Error('Upstream service unavailable');
      return upstream.json();
    };

    try {
      feedFetching = doFetch();
      const data = await feedFetching;
      cachedFeed = data;
      feedExpires = now + FEED_TTL;
      res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
      return res.status(200).json(data);
    } finally {
      feedFetching = null;
    }
  } catch (e) {
    console.error('FR24 feed error:', e);
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Upstream timeout' });
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}
