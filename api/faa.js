export default async function handler(req, res) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const upstream = await fetch('https://nasstatus.faa.gov/api/airport-status-information', {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!upstream.ok) return res.status(upstream.status).json({ error: `FAA returned ${upstream.status}` });
    const xml = await upstream.text();

    // Parse XML to structured JSON
    const delays = [];
    // Parse Arrival/Departure delays
    const delayRegex = /<Delay>\s*<ARPT>([^<]+)<\/ARPT>\s*<Reason>([^<]*)<\/Reason>[\s\S]*?<\/Delay>/g;
    let m;
    while ((m = delayRegex.exec(xml)) !== null) {
      delays.push({ airportCode: m[1], type: 'delay', reason: m[2], delays: [{ reason: m[2] }] });
    }
    // Parse closures
    const closureRegex = /<Airport>\s*<ARPT>([^<]+)<\/ARPT>\s*<Reason>([^<]*)<\/Reason>[\s\S]*?<\/Airport>/g;
    while ((m = closureRegex.exec(xml)) !== null) {
      delays.push({ airportCode: m[1], type: 'closure', reason: m[2], delays: [{ reason: 'CLOSED: ' + m[2].split(' ').slice(0, 8).join(' ') }] });
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(delays);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
