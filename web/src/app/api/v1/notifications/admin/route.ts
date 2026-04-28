import { NextRequest, NextResponse } from 'next/server';

const NOTIFICATION_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:8008';

function getAdminTokenFromRequest(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

function isAdminToken(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    const now = Math.floor(Date.now() / 1000);
    return payload.role === 'ADMIN' && (!payload.exp || payload.exp > now);
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const token = getAdminTokenFromRequest(req);
  if (!token || !isAdminToken(token)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${NOTIFICATION_URL}/api/v1/notifications/admin`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ success: true, data: [] });
  }
}
