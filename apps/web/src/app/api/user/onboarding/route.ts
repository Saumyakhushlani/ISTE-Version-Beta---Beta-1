import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, setSessionCookie } from '@/lib/auth/session';
import { internalAuth } from '@/lib/auth/internal-client';
import { createToken } from '@/lib/auth/jwt';

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json(
        { detail: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { full_name, mobile_number, country, preferred_currency, bank_accounts } = body;

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json(
        { detail: 'Full name is required.' },
        { status: 400 }
      );
    }

    // Format and sanitize bank accounts
    const formattedAccounts = Array.isArray(bank_accounts)
      ? bank_accounts.map((acct: any, idx: number) => {
          const rawLast4 = String(acct.masked_last4 || '').trim();
          const cleanLast4 = rawLast4.replace(/\D/g, '').slice(-4).padStart(4, '0');
          return {
            bank: String(acct.bank || 'Bank').trim(),
            nickname: String(acct.nickname || `${acct.bank || 'Bank'} Account`).trim(),
            type: acct.type || 'savings',
            masked_last4: cleanLast4,
            opening_balance_minor: parseInt(acct.opening_balance_minor || 0, 10),
            currency: acct.currency || 'INR',
            is_primary: idx === 0 || !!acct.is_primary,
            account_holder_name: acct.account_holder_name ? String(acct.account_holder_name).trim() : undefined,
            ifsc: acct.ifsc ? String(acct.ifsc).trim().toUpperCase() : undefined,
          };
        })
      : [];

    const updatedUser = await internalAuth.completeOnboarding(sessionUser.sub, {
      full_name: full_name.trim(),
      mobile_number: mobile_number?.trim() || undefined,
      country: country || 'India',
      preferred_currency: preferred_currency || 'INR',
      bank_accounts: formattedAccounts,
    });

    // Re-issue JWT with is_onboarded: true
    const newToken = await createToken({
      sub: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.profile?.full_name || full_name.trim(),
      role: 'user',
      is_onboarded: true,
    });

    const res = NextResponse.json({
      status: 'success',
      message: 'Onboarding completed successfully.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.profile?.full_name,
        is_onboarded: true,
        profile: updatedUser.profile,
        accounts: updatedUser.accounts || [],
      },
    });

    setSessionCookie(res, newToken);
    return res;
  } catch (err: any) {
    console.error('Onboarding error:', err);
    return NextResponse.json(
      { detail: err.detail || err.message || 'Error saving onboarding profile.' },
      { status: err.status || 500 }
    );
  }
}

