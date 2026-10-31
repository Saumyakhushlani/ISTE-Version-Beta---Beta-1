import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { internalAuth } from '@/lib/auth/internal-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    const fullUser = await internalAuth.getUserById(sessionUser.sub);
    if (!fullUser) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.profile?.full_name || sessionUser.name,
        is_onboarded: fullUser.is_onboarded,
        profile: fullUser.profile,
        accounts: fullUser.accounts || [],
      },
    });
  } catch (err: any) {
    console.error('Error fetching current user:', err);
    return NextResponse.json(
      { authenticated: false, error: err.message },
      { status: 500 }
    );
  }
}
