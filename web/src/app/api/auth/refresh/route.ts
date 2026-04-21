import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, getRefreshToken, setTokenCookies } from '@/lib/auth-cookies';

const MONOLITH = process.env.MONOLITH_URL || 'http://localhost:8100';

export async function POST(req: NextRequest) {
  const refreshToken = getRefreshToken(req);
  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  let res: Response;
  try {
    res = await fetch(`${MONOLITH}/api/v1/auth/token/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  if (!res.ok) {
    const response = NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
    clearAuthCookies(response);
    return response;
  }

  const data = await res.json();
  const response = NextResponse.json({ success: true });
  setTokenCookies(response, data.data.accessToken, data.data.refreshToken);
  return response;
}
