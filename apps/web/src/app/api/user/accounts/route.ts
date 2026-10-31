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

    const accounts = await internalAuth.listAccounts(sessionUser.sub);
    return NextResponse.json(accounts);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.detail || err.message },
      { status: err.status || 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { detail: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const rawLast4 = String(body.masked_last4 || '').trim();
    const cleanLast4 = rawLast4.replace(/\D/g, '').slice(-4).padStart(4, '0');

    const created = await internalAuth.createAccount(sessionUser.sub, {
      bank: String(body.bank || 'Bank').trim(),
      nickname: String(body.nickname || `${body.bank || 'Bank'} Account`).trim(),
      type: body.type || 'savings',
      masked_last4: cleanLast4,
      opening_balance_minor: parseInt(body.opening_balance_minor || 0, 10),
      currency: body.currency || 'INR',
      is_primary: !!body.is_primary,
      account_holder_name: body.account_holder_name ? String(body.account_holder_name).trim() : undefined,
      ifsc: body.ifsc ? String(body.ifsc).trim().toUpperCase() : undefined,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.detail || err.message },
      { status: err.status || 500 }
    );
  }
}
