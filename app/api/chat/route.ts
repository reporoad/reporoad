import { database } from '@/lib/db';
import { messageBody } from '@/lib/live-world';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
export async function GET() {
  try {
    const result = await database()
      .prepare(
        'SELECT id, name, body, created_at AS createdAt FROM chat_messages ORDER BY id DESC LIMIT 50',
      )
      .all();
    return Response.json({ messages: result.results.reverse() }, { headers });
  } catch {
    return Response.json(
      { error: 'Chat is reconnecting. Please try again.' },
      { status: 503, headers },
    );
  }
}
export async function POST(request: Request) {
  const userId = request.headers.get('oai-authenticated-user-id');
  if (!userId)
    return Response.json(
      { error: 'Sign in to send a message.' },
      { status: 401, headers },
    );
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: 'Invalid request origin.' },
      { status: 403, headers },
    );
  const raw = await request.text();
  if (raw.length > 2048)
    return Response.json(
      { error: 'Message is too long.' },
      { status: 413, headers },
    );
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: 'Invalid message.' },
      { status: 400, headers },
    );
  }
  const body = messageBody(
    input && typeof input === 'object' && 'body' in input ? input.body : null,
  );
  if (!body)
    return Response.json(
      { error: 'Write a message of 1–300 characters.' },
      { status: 400, headers },
    );
  let fullName = request.headers.get('oai-authenticated-user-full-name') || '';
  if (
    request.headers.get('oai-authenticated-user-full-name-encoding') ===
    'percent-encoded-utf-8'
  ) {
    try {
      fullName = decodeURIComponent(fullName);
    } catch {
      fullName = '';
    }
  }
  const name =
    fullName.trim().split(/\s+/)[0]?.slice(0, 30) ||
    `Traveler ${userId.slice(-4)}`;
  try {
    const now = Date.now();
    const result = await database()
      .prepare(
        'INSERT INTO chat_messages (user_id,name,body,created_at) SELECT ?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM chat_messages WHERE user_id=? AND created_at>?)',
      )
      .bind(userId, name, body, now, userId, now - 3000)
      .run();
    if (!result.meta.changes)
      return Response.json(
        { error: 'Please wait a few seconds between messages.' },
        { status: 429, headers },
      );
    return Response.json({ ok: true }, { status: 201, headers });
  } catch {
    return Response.json(
      { error: 'Message was not sent. Please try again.' },
      { status: 503, headers },
    );
  }
}
