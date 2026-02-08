export default async function handler(req, res) {
  try {
    const airline = req.query.airline || 'UAL';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch(`https://data-cloud.flightradar24.com/zones/fcgi/feed.js?airline=${encodeURIComponent(airline)}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Origin': 'https://www.flightradar24.com',
        'Referer': 'https://www.flightradar24.com/'
      }
    });
    clearTimeout(timeout);
    if (!upstream.ok) return res.status(upstream.status).json({ error: `FR24 returned ${upstream.status}` });
    const data = await upstream.json();
    // Cache for 15 seconds (FR24 updates ~every 10-15s)
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (e) {
    if (e.name === 'AbortError') return res.status(504).json({ error: 'FR24 timeout' });
    return res.status(500).json({ error: e.message });
  }
}
