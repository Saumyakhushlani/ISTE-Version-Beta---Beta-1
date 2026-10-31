import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { internalAuth } from '@/lib/auth/internal-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { detail: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const user = await internalAuth.getUserById(sessionUser.sub);
    if (!user) {
      return NextResponse.json(
        { detail: 'User not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      is_onboarded: user.is_onboarded,
      profile: user.profile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.detail || err.message },
      { status: err.status || 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { detail: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const updated = await internalAuth.updateProfile(sessionUser.sub, body);

    return NextResponse.json({
      status: 'success',
      message: 'Profile updated successfully.',
      user: {
        id: updated.id,
        email: updated.email,
        profile: updated.profile,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.detail || err.message },
      { status: err.status || 500 }
    );
  }
}
