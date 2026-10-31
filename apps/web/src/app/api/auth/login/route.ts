import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { internalAuth } from '@/lib/auth/internal-client';
import { createToken } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/auth/rate-limiter';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { detail: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // In-memory rate limiting check
    const rateLimit = checkRateLimit(normalizedEmail);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          detail: `Too many failed login attempts. Please try again in ${Math.ceil(
            rateLimit.resetInSeconds / 60
          )} minutes.`,
        },
        { status: 429 }
      );
    }

    // Look up user from database
    const user = await internalAuth.getUserByEmail(normalizedEmail);
    if (!user) {
      // Record failed attempt to prevent timing attacks
      recordFailedAttempt(normalizedEmail);
      return NextResponse.json(
        { detail: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Check database-persisted lockout
    if (user.locked_until) {
      const lockedUntilDate = new Date(user.locked_until);
      const now = new Date();
      if (lockedUntilDate > now) {
        const remainingMinutes = Math.ceil(
          (lockedUntilDate.getTime() - now.getTime()) / (60 * 1000)
        );
        return NextResponse.json(
          {
            detail: `Account is temporarily locked due to repeated failed logins. Please try again in ${remainingMinutes} minute(s).`,
          },
          { status: 403 }
        );
      }
    }

    // Verify password hash
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      const failedCount = (user.failed_login_attempts || 0) + 1;
      recordFailedAttempt(normalizedEmail);

      let lockedUntil: string | null = null;
      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        const lockDate = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        lockedUntil = lockDate.toISOString();
      }

      await internalAuth.updateLockout(user.id, failedCount, lockedUntil);

      if (lockedUntil) {
        return NextResponse.json(
          {
            detail: `Account has been locked for ${LOCKOUT_MINUTES} minutes due to ${failedCount} consecutive failed attempts.`,
          },
          { status: 403 }
        );
      }

      const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - failedCount);
      return NextResponse.json(
        {
          detail: `Invalid email or password. ${remainingAttempts} attempt(s) remaining before account lockout.`,
        },
        { status: 401 }
      );
    }

    // Login successful — reset failed attempts
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await internalAuth.updateLockout(user.id, 0, null);
    }
    resetRateLimit(normalizedEmail);

    // Create session JWT
    const token = await createToken({
      sub: user.id,
      email: user.email,
      name: user.profile?.full_name,
      role: 'user',
      is_onboarded: user.is_onboarded,
    });

    const res = NextResponse.json({
      status: 'success',
      message: 'Logged in successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.profile?.full_name,
        is_onboarded: user.is_onboarded,
        profile: user.profile,
      },
      token,
    });

    setSessionCookie(res, token);
    return res;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { detail: err.detail || err.message || 'Internal server error during login.' },
      { status: err.status || 500 }
    );
  }
}

