import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth/session';

export async function POST() {
  const res = NextResponse.json({
    status: 'success',
    message: 'Logged out successfully.',
  });
  clearSessionCookie(res);
  return res;
}

