import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { internalAuth } from '@/lib/auth/internal-client';
import { createToken } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, full_name, mobile_number, country, preferred_currency } = body;

    // Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { detail: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { detail: 'Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    // Require basic complexity: at least 1 letter and 1 digit
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLetter || !hasDigit) {
      return NextResponse.json(
        { detail: 'Password must contain at least one letter and one number.' },
        { status: 400 }
      );
    }

    const name = (full_name || '').trim();
    if (!name) {
      return NextResponse.json(
        { detail: 'Full name is required.' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await internalAuth.getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { detail: 'An account with this email address already exists.' },
        { status: 409 }
      );
    }

    // Securely hash password with bcrypt
    const password_hash = await bcrypt.hash(password, 10);

    // Create user and initial profile in database via internal API
    const user = await internalAuth.createUser({
      email: email.trim().toLowerCase(),
      password_hash,
      full_name: name,
      mobile_number: mobile_number?.trim() || undefined,
      country: country || 'India',
      preferred_currency: preferred_currency || 'INR',
    });

    // Generate signed HS256 JWT
    const token = await createToken({
      sub: user.id,
      email: user.email,
      name: user.profile?.full_name || name,
      role: 'user',
      is_onboarded: false,
    });

    // Create response and attach HttpOnly cookie
    const res = NextResponse.json({
      status: 'success',
      message: 'Account successfully registered.',
      user: {
        id: user.id,
        email: user.email,
        name: user.profile?.full_name || name,
        is_onboarded: user.is_onboarded,
      },
      token,
    });

    setSessionCookie(res, token);
    return res;
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json(
      { detail: err.detail || err.message || 'Internal server error during registration.' },
      { status: err.status || 500 }
    );
  }
}

