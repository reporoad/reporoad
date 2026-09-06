import { database } from '@/lib/db';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: 'Invalid origin.' }, { status: 403, headers });
  try {
    const raw = await request.text();
    if (raw.length > 100) return new Response(null, { status: 413 });
    const { id } = JSON.parse(raw);
    if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id))
      return new Response(null, { status: 400 });
    const db = database(), now = Date.now();
    const results = await db.batch([
      db.prepare('DELETE FROM visitor_presence WHERE last_seen < ?').bind(now - 90000),
      db.prepare('INSERT INTO visitor_presence (id,last_seen) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET last_seen=excluded.last_seen').bind(id, now),
      db.prepare('SELECT COUNT(*) AS online FROM visitor_presence'),
    ]);
    return Response.json({ online: (results[2].results[0] as { online: number }).online }, { headers });
  } catch {
    return Response.json({ error: 'Visitor count unavailable.' }, { status: 503, headers });
  }
}
