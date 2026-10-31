import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth/session';
import { internalAuth } from '@/lib/auth/internal-client';

export const dynamic = 'force-dynamic';

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
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return NextResponse.json(
        { detail: 'Both current password and new password are required.' },
        { status: 400 }
      );
    }

    if (typeof new_password !== 'string' || new_password.length < 8) {
      return NextResponse.json(
        { detail: 'New password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const hasLetter = /[a-zA-Z]/.test(new_password);
    const hasDigit = /\d/.test(new_password);
    if (!hasLetter || !hasDigit) {
      return NextResponse.json(
        { detail: 'New password must contain at least one letter and one number.' },
        { status: 400 }
      );
    }

    const user = await internalAuth.getUserById(sessionUser.sub);
    if (!user) {
      return NextResponse.json(
        { detail: 'User not found.' },
        { status: 404 }
      );
    }

    // Verify current password against stored hash
    const isValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { detail: 'Incorrect current password. Please verify and try again.' },
        { status: 400 }
      );
    }

    // Check if new password is identical
    const isSame = await bcrypt.compare(new_password, user.password_hash);
    if (isSame) {
      return NextResponse.json(
        { detail: 'New password cannot be the same as your current password.' },
        { status: 400 }
      );
    }

    // Hash new password and commit
    const newHash = await bcrypt.hash(new_password, 10);
    await internalAuth.updatePassword(sessionUser.sub, newHash);

    return NextResponse.json({
      status: 'success',
      message: 'Password changed successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.detail || err.message || 'Failed to update password.' },
      { status: err.status || 500 }
    );
  }
}
