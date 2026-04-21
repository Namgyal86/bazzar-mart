import { NextRequest, NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE  = 'bz_access';
export const REFRESH_TOKEN_COOKIE = 'bz_refresh';
export const USER_COOKIE          = 'bz_user';

const IS_PROD       = process.env.NODE_ENV === 'production';
const ACCESS_MAX    = 60 * 15;             // 15 min
const REFRESH_MAX   = 60 * 60 * 24 * 7;   // 7 days

export interface CookieUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePhotoUrl?: string;
  referralCode?: string;
  sellerId?: string;
}

/** Set all three auth cookies (login / register). */
export function setAuthCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
  user: CookieUser,
) {
  res.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX,
  });
  res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX,
  });
  // bz_user is non-httpOnly so Zustand persist can hydrate on the client
  res.cookies.set(USER_COOKIE, JSON.stringify({
    state: { user, isAuthenticated: true },
    version: 0,
  }), {
    httpOnly: false,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX,
  });
}

/** Update only the token cookies on refresh (leave bz_user intact). */
export function setTokenCookies(
  res: NextResponse,
  accessToken: string,
  refreshToken: string,
) {
  res.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX,
  });
  res.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_MAX,
  });
}

export function clearAuthCookies(res: NextResponse) {
  res.cookies.delete(ACCESS_TOKEN_COOKIE);
  res.cookies.delete(REFRESH_TOKEN_COOKIE);
  res.cookies.delete(USER_COOKIE);
}

export function getAccessToken(req: NextRequest): string | undefined {
  return req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
}

export function getRefreshToken(req: NextRequest): string | undefined {
  return req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
}
