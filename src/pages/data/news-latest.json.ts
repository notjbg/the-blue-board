import { articles } from '../../data/news/index.js';

export function GET() {
  const latest = articles.slice(0, 3).map((a) => ({
    slug: a.slug,
    title: a.title,
    date: a.date,
    category: a.category,
  }));

  return new Response(JSON.stringify(latest), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
