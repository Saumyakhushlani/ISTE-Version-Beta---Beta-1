import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { internalAuth } from '@/lib/auth/internal-client';

export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { detail: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { id } = params;
    const updated = await internalAuth.setPrimaryAccount(sessionUser.sub, id);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.detail || err.message || 'Failed to set primary account.' },
      { status: err.status || 500 }
    );
  }
}
