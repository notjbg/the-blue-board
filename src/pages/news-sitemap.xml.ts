import { articles } from '../data/news/index.js';

const BASE_URL = 'https://theblueboard.co';

function xmlEscape(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function GET() {
  const entries = articles.map(
    (a) => `  <url>
    <loc>${xmlEscape(`${BASE_URL}/news/${a.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>The Blue Board</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${a.date}</news:publication_date>
      <news:title>${xmlEscape(a.title)}</news:title>
    </news:news>
  </url>`
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
