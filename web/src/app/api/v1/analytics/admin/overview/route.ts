import { NextRequest, NextResponse } from 'next/server';

const MONOLITH_URL = process.env.MONOLITH_URL || 'http://localhost:8100';

export async function GET(req: NextRequest) {
  try {
    const forwardHeaders: Record<string, string> = {};
    const auth = req.headers.get('authorization');
    if (auth) forwardHeaders['authorization'] = auth;

    const res = await fetch(`${MONOLITH_URL}/api/v1/analytics/admin/overview`, {
      headers: forwardHeaders,
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    // Service not running — return empty structure so the dashboard renders cleanly
    return NextResponse.json({ success: true, data: null });
  }
}
