export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ids = req.query.ids || 'KORD';
    // Validate: comma-separated ICAO codes, max 200 chars
    if (!/^[A-Z0-9,]{1,200}$/i.test(ids)) {
      return res.status(400).json({ error: 'Invalid airport IDs' });
    }
    const upstream = await fetch(`https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(ids)}&format=json`);
    if (!upstream.ok) return res.status(502).json({ error: 'Upstream service unavailable' });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (e) {
    console.error('METAR API error:', e);
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}
