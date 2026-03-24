import { NextRequest, NextResponse } from 'next/server';

const ANALYTICS_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8014';

export async function GET(req: NextRequest) {
  try {
    const forwardHeaders: Record<string, string> = {};
    const auth = req.headers.get('authorization');
    if (auth) forwardHeaders['authorization'] = auth;
    // Forward internal user headers set by the API client
    const userId = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');
    if (userId) forwardHeaders['x-user-id'] = userId;
    if (userRole) forwardHeaders['x-user-role'] = userRole;

    const res = await fetch(`${ANALYTICS_URL}/api/v1/analytics/admin/overview`, {
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
