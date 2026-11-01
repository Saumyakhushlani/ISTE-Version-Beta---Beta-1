import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { internalAuth } from '@/lib/auth/internal-client';
import { createToken } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from '@/lib/auth/rate-limiter';
import { DEMO_ACCOUNTS } from '@/lib/auth/demo-accounts';

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
    const demoConfig = DEMO_ACCOUNTS[normalizedEmail];
    const isDemoUser = !!demoConfig;
    const isDemoPassword = isDemoUser && password === demoConfig.password;

    // In-memory rate limiting check (bypassed if correct demo credentials provided)
    if (!isDemoPassword) {
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
    }

    // Look up user from database
    let user: any = null;
    try {
      user = await internalAuth.getUserByEmail(normalizedEmail);
    } catch (err) {
      console.warn('Could not query user by email:', err);
    }

    // If user does not exist yet and this is a recognized demo persona
    if (!user && isDemoUser && isDemoPassword) {
      try {
        await internalAuth.seedDemoUsers();
        user = await internalAuth.getUserByEmail(normalizedEmail);
      } catch (seedErr) {
        console.warn('Auto-seeding demo users failed:', seedErr);
      }

      if (!user) {
        try {
          const password_hash = await bcrypt.hash(password, 10);
          user = await internalAuth.createUser({
            email: demoConfig.email,
            password_hash,
            full_name: demoConfig.full_name,
            mobile_number: demoConfig.mobile_number,
            country: demoConfig.country,
            preferred_currency: demoConfig.preferred_currency,
          });
        } catch (createErr) {
          console.warn('Direct demo user creation failed:', createErr);
        }
      }

      // If database is completely unreachable or ephemeral, use synthetic demo user object
      if (!user) {
        user = {
          id: demoConfig.id,
          email: demoConfig.email,
          password_hash: '',
          is_active: true,
          is_onboarded: true,
          failed_login_attempts: 0,
          created_at: new Date().toISOString(),
          profile: {
            id: 'prof_' + demoConfig.id,
            full_name: demoConfig.full_name,
            mobile_number: demoConfig.mobile_number,
            country: demoConfig.country,
            preferred_currency: demoConfig.preferred_currency,
          },
        };
      }
    }

    if (!user) {
      recordFailedAttempt(normalizedEmail);
      return NextResponse.json(
        { detail: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Check database-persisted lockout (unless correct demo credentials)
    if (user.locked_until && !isDemoPassword) {
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
    let isValid = false;
    if (user.password_hash) {
      try {
        isValid = await bcrypt.compare(password, user.password_hash);
      } catch {}
    }
    // Grant access if standard demo credentials match
    if (!isValid && isDemoUser && isDemoPassword) {
      isValid = true;
    }

    if (!isValid) {
      const failedCount = (user.failed_login_attempts || 0) + 1;
      recordFailedAttempt(normalizedEmail);

      let lockedUntil: string | null = null;
      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        const lockDate = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
        lockedUntil = lockDate.toISOString();
      }

      if (user.id) {
        try {
          await internalAuth.updateLockout(user.id, failedCount, lockedUntil);
        } catch {}
      }

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
    if (user.id && (user.failed_login_attempts > 0 || user.locked_until)) {
      try {
        await internalAuth.updateLockout(user.id, 0, null);
      } catch {}
    }
    resetRateLimit(normalizedEmail);

    // Create session JWT
    const token = await createToken({
      sub: user.id,
      email: user.email,
      name: user.profile?.full_name,
      role: 'user',
      is_onboarded: user.is_onboarded ?? true,
    });

    const res = NextResponse.json({
      status: 'success',
      message: 'Logged in successfully.',
      user: {
        id: user.id,
        email: user.email,
        name: user.profile?.full_name,
        is_onboarded: user.is_onboarded ?? true,
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
