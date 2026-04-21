import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, USER_COOKIE } from '@/lib/auth-cookies';

const IS_PROD = process.env.NODE_ENV === 'production';

function decodeJwtPayload(token: string): Record<string, string> | null {
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
  // ── OAuth callback — exchange URL tokens for HttpOnly cookies ──────────
  if (req.nextUrl.pathname === '/auth/oauth/callback') {
    const sp          = req.nextUrl.searchParams;
    const accessToken  = sp.get('accessToken');
    const refreshToken = sp.get('refreshToken');
    const oauthError   = sp.get('oauth_error');

    if (oauthError || !accessToken || !refreshToken) {
      const dest = new URL('/auth/login', req.url);
      if (oauthError) dest.searchParams.set('oauth_error', oauthError);
      return NextResponse.redirect(dest);
    }

    const payload  = decodeJwtPayload(accessToken);
    const role     = payload?.role ?? 'BUYER';
    const redirectTo =
      role === 'ADMIN'  ? '/admin/dashboard' :
      role === 'SELLER' ? '/seller/dashboard' : '/';

    const res = NextResponse.redirect(new URL(redirectTo, req.url));
    res.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 900,
    });
    res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 604800,
    });
    if (payload) {
      const user = {
        id: payload.userId, email: payload.email,
        firstName: payload.firstName ?? '', lastName: payload.lastName ?? '',
        role: payload.role, referralCode: payload.referralCode,
      };
      res.cookies.set(USER_COOKIE, JSON.stringify({ state: { user, isAuthenticated: true }, version: 0 }), {
        httpOnly: false, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 604800,
      });
    }
    return res;
  }

  // ── /api/v1/* — inject auth headers from cookie ───────────────────────
  if (req.nextUrl.pathname.startsWith('/api/v1/')) {
    const token = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    if (!token) return NextResponse.next();

    const payload = decodeJwtPayload(token);
    if (!payload?.userId || !payload?.role) return NextResponse.next();

    const headers = new Headers(req.headers);
    headers.set('authorization', `Bearer ${token}`);
    headers.set('x-user-id', payload.userId);
    headers.set('x-user-role', payload.role);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/v1/:path*', '/auth/oauth/callback'],
};
