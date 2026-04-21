import { NextRequest, NextResponse } from 'next/server';
import { setAuthCookies } from '@/lib/auth-cookies';

const MONOLITH = process.env.MONOLITH_URL || 'http://localhost:8100';

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(`${MONOLITH}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const data = await res.json();
  if (!res.ok) return NextResponse.json(data, { status: res.status });

  const { user, accessToken, refreshToken } = data.data;
  const response = NextResponse.json({ success: true, data: { user } });
  setAuthCookies(response, accessToken, refreshToken, user);
  return response;
}
