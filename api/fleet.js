export default async function handler(req, res) {
  try {
    const gid = req.query.gid || '0';
    const upstream = await fetch(`https://docs.google.com/spreadsheets/d/1ZlYgN_IZmd6CSx_nXnuP0L0PiodapDRx3RmNkIpxXAo/export?format=csv&gid=${encodeURIComponent(gid)}`);
    if (!upstream.ok) return res.status(upstream.status).send(`Google Sheets returned ${upstream.status}`);
    const csv = await upstream.text();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.status(200).send(csv);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
