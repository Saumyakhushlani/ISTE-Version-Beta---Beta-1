import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { internalAuth } from '@/lib/auth/internal-client';
import { DEMO_ACCOUNTS } from '@/lib/auth/demo-accounts';

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

    let fullUser: any = null;
    try {
      fullUser = await internalAuth.getUserById(sessionUser.sub);
    } catch (err) {
      console.warn('Could not query full user from internal auth:', err);
    }

    if (!fullUser) {
      const demoConfig = DEMO_ACCOUNTS[sessionUser.email?.toLowerCase() || ''];
      if (demoConfig) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: sessionUser.sub,
            email: sessionUser.email,
            name: sessionUser.name || demoConfig.full_name,
            is_onboarded: true,
            profile: {
              id: 'prof_' + sessionUser.sub,
              full_name: sessionUser.name || demoConfig.full_name,
              mobile_number: demoConfig.mobile_number,
              country: demoConfig.country,
              preferred_currency: demoConfig.preferred_currency,
            },
            accounts: [],
          },
        });
      }

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
