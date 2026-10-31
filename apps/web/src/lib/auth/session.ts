import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './jwt';

export const SESSION_COOKIE_NAME = 'fdl_session';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Retrieves the raw session token from cookies in a server context.
 */
export async function getSessionToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Verifies the current session cookie and returns the active user payload if valid.
 */
export async function getCurrentUser(): Promise<TokenPayload | null> {
  const token = await getSessionToken();
  if (!token) return null;
  return await verifyToken(token);
}

/**
 * Attaches the secure, HttpOnly session cookie to an outgoing NextResponse.
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the session cookie on logout.
 */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

