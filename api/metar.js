export default async function handler(req, res) {
  try {
    const ids = req.query.ids || 'KORD';
    const upstream = await fetch(`https://aviationweather.gov/api/data/metar?ids=${encodeURIComponent(ids)}&format=json`);
    if (!upstream.ok) return res.status(upstream.status).json({ error: `AWC returned ${upstream.status}` });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
