import { database } from '@/lib/db';
import { chickenCycle, validChickenBatch, CHICKEN_UPSERT } from '@/lib/chickens';
export const dynamic = 'force-dynamic';
const noStore = { 'Cache-Control': 'no-store' };
export async function GET(request: Request) {
  try {
    const now = Date.now(), { round } = chickenCycle(now);
    const cache = (caches as unknown as { default?: Cache }).default;
    const key = new Request(new URL(`/api/chickens?bucket=${Math.floor(now / 5000)}`, request.url));
    const cached = await cache?.match(key);
    // Vinext adds response headers; Cache API responses have immutable headers.
    if (cached) return new Response(cached.body, cached);
    const rows = await database().prepare('SELECT round, SUM(total) AS total FROM chicken_clicks WHERE round >= ? AND round <= ? GROUP BY round').bind(round - 1, round).all<{round: number; total: number}>();
    const response = Response.json({ round, queued: rows.results.find(r => r.round === round)?.total || 0,
      crossingCount: rows.results.find(r => r.round === round - 1)?.total || 0 },
      { headers: { 'Cache-Control': 'public, max-age=5' } });
    await cache?.put(key, response.clone());
    return response;
  } catch { return Response.json({ error: 'Chicken crossing is temporarily unavailable.' }, { status: 503, headers: noStore }); }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  if (Number(request.headers.get('content-length')) > 256) return new Response(null, { status: 413 });
  let value: unknown;
  try { const raw = await request.text(); if (raw.length > 256) return new Response(null, { status: 413 }); value = JSON.parse(raw); }
  catch { return new Response(null, { status: 400 }); }
  if (!validChickenBatch(value)) return new Response(null, { status: 400 });
  const now = Date.now(), { round } = chickenCycle(now);
  if (value.round !== round) return Response.json({ error: 'This crossing has closed.', round }, { status: 409, headers: noStore });
  // Cloudflare overwrites this header at ingress. Fail closed without a trusted edge address.
  const ip = request.headers.get('cf-connecting-ip') || (new URL(request.url).hostname === 'localhost' ? 'local-dev' : null);
  if (!ip) return Response.json({ error: 'Visitor verification unavailable.' }, { status: 503, headers: noStore });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${round}:${ip}`));
  const key = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  const nonce = crypto.randomUUID();
  try {
    const db = database();
    const results = await db.batch([
      db.prepare('DELETE FROM chicken_clicks WHERE rowid IN (SELECT rowid FROM chicken_clicks WHERE round < ? LIMIT 100)').bind(round - 1),
      db.prepare('DELETE FROM chicken_limits WHERE id IN (SELECT id FROM chicken_limits WHERE updated_at < ? LIMIT 100)').bind(now - 600000),
      db.prepare('INSERT INTO chicken_limits(id, updated_at, nonce) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, nonce=excluded.nonce WHERE chicken_limits.updated_at <= ? RETURNING nonce').bind(key, now, nonce, now - 10000),
      db.prepare(CHICKEN_UPSERT).bind(value.id, round, value.total, key, nonce, value.total),
      db.prepare('SELECT total FROM chicken_clicks WHERE id = ? AND round = ?').bind(value.id, round),
    ]);
    if (!results[2].results.length) return Response.json({ error: 'Please wait a moment; your clicks stay queued.' }, { status: 429, headers: { ...noStore, 'Retry-After': '10' } });
    return Response.json({ round, accepted: (results[4].results[0] as { total?: number } | undefined)?.total || 0 }, { headers: noStore });
  } catch { return Response.json({ error: 'Clicks not saved yet. Retrying…' }, { status: 503, headers: noStore }); }
}
