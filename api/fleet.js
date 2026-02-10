const SHEET_ID = process.env.FLEET_SHEET_ID || '1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo';
const ALLOWED_GIDS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers?.origin || '';
  if (origin && origin !== 'https://theblueboard.co' && !origin.includes('localhost')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const gid = req.query.gid || '0';
    // Validate gid: numeric only
    if (!/^\d{1,10}$/.test(gid)) {
      return res.status(400).json({ error: 'Invalid gid parameter' });
    }
    if (!ALLOWED_GIDS.includes(gid)) {
      return res.status(400).json({ error: 'Invalid gid parameter' });
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${encodeURIComponent(gid)}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!upstream.ok) return res.status(502).send('Upstream service unavailable');
    const csv = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(csv);
  } catch (e) {
    console.error('Fleet API error:', e);
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Upstream timeout' });
    return res.status(502).json({ error: 'Upstream service unavailable' });
  }
}
