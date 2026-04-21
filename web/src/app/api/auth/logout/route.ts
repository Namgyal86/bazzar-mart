import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies, getRefreshToken } from '@/lib/auth-cookies';

const MONOLITH = process.env.MONOLITH_URL || 'http://localhost:8100';

export async function POST(req: NextRequest) {
  const refreshToken = getRefreshToken(req);
  if (refreshToken) {
    // best-effort invalidation on the backend
    fetch(`${MONOLITH}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }

  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
