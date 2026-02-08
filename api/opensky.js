export default async function handler(req, res) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch('https://opensky-network.org/api/states/all?operator=UAL', {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'UnitedNOC/1.0 (flight-tracker-dashboard)'
      }
    });
    clearTimeout(timeout);
    if (!upstream.ok) return res.status(upstream.status).json({ error: `OpenSky returned ${upstream.status}` });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (e) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'OpenSky timeout (15s)' });
    }
    return res.status(502).json({ error: e.message });
  }
}
