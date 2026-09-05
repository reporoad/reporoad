export const dynamic = 'force-dynamic';
export function GET() {
  return Response.json(
    { serverTime: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
