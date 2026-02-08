export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch('https://opensky-network.org/api/states/all?operator=UAL', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TheBlueBoardDashboard/1.0 (https://theblueboard.co)'
      }
    });
    clearTimeout(timeout);
    if (!upstream.ok) return res.status(502).json({ error: 'Upstream service unavailable' });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (e) {
    console.error('OpenSky API error:', e);
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'Upstream timeout' });
    }
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}
