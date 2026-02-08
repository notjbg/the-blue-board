export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const airline = req.query.airline || 'UAL';
    // Validate airline: 2-4 letter ICAO code
    if (!/^[A-Z0-9]{2,4}$/i.test(airline)) {
      return res.status(400).json({ error: 'Invalid airline code' });
    }
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
    if (!upstream.ok) return res.status(502).json({ error: 'Upstream service unavailable' });
    const data = await upstream.json();
    // Cache for 15 seconds (FR24 updates ~every 10-15s)
    res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
    return res.status(200).json(data);
  } catch (e) {
    console.error('FR24 feed error:', e);
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Upstream timeout' });
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}
