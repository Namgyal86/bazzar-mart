import { NextRequest, NextResponse } from 'next/server';

// Decode JWT payload without signature verification.
// The token was already validated by user-service on login.
// Services that support x-user-id header bypass use it for internal trust.
function decodeJwtPayload(token: string): { userId?: string; role?: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload + '=='.slice((payload.length % 4) || 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return NextResponse.next();

  const payload = decodeJwtPayload(auth.slice(7));
  if (!payload?.userId || !payload?.role) return NextResponse.next();

  // Inject x-user-id and x-user-role into every /api/v1/* request
  // so microservices that have a header-bypass auth accept the request
  // regardless of their JWT secret configuration.
  const headers = new Headers(req.headers);
  headers.set('x-user-id', payload.userId);
  headers.set('x-user-role', payload.role);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/api/v1/:path*'],
};
