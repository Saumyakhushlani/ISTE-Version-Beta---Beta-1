import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { internalAuth } from '@/lib/auth/internal-client';

export async function PUT(
  req: NextRequest,
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
    const body = await req.json();

    const rawLast4 = String(body.masked_last4 || '').trim();
    const cleanLast4 = rawLast4.replace(/\D/g, '').slice(-4).padStart(4, '0');

    const updated = await internalAuth.updateAccount(sessionUser.sub, id, {
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

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.detail || err.message },
      { status: err.status || 500 }
    );
  }
}

export async function DELETE(
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
    const res = await internalAuth.deleteAccount(sessionUser.sub, id);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.detail || err.message },
      { status: err.status || 500 }
    );
  }
}

