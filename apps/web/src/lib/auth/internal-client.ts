/**
 * Internal Service Client
 * Secure communication layer from Next.js server to FastAPI internal endpoints.
 * Authenticated via X-Internal-Secret header.
 */

const rawFastApiUrl =
  process.env.API_URL ||
  process.env.FASTAPI_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';
const FASTAPI_INTERNAL_URL = rawFastApiUrl.replace(/\/+$/, '');

const INTERNAL_SERVICE_KEY =
  process.env.INTERNAL_SERVICE_KEY ||
  'fdl-internal-shared-secret-key-min32-chars-xyz';

export interface InternalUser {
  id: string;
  email: string;
  password_hash: string;
  is_active: boolean;
  is_onboarded: boolean;
  failed_login_attempts: number;
  locked_until?: string | null;
  created_at: string;
  profile?: {
    id: string;
    full_name: string;
    mobile_number?: string | null;
    country: string;
    preferred_currency: string;
    created_at?: string;
    updated_at?: string;
  } | null;
  accounts?: any[];
}

export interface CreateUserInput {
  email: string;
  password_hash: string;
  full_name: string;
  mobile_number?: string;
  country?: string;
  preferred_currency?: string;
}

export interface BankAccountInput {
  bank: string;
  nickname: string;
  type?: string;
  masked_last4: string;
  opening_balance_minor?: number;
  currency?: string;
  is_primary?: boolean;
  account_holder_name?: string;
  ifsc?: string;
}

export interface OnboardingInput {
  full_name: string;
  mobile_number?: string;
  country?: string;
  preferred_currency?: string;
  bank_accounts: BankAccountInput[];
}

async function internalFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${FASTAPI_INTERNAL_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Internal-Secret': INTERNAL_SERVICE_KEY,
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    let errorDetail = res.statusText;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    const error = new Error(`Internal API Error [${res.status}]: ${errorDetail}`);
    (error as any).status = res.status;
    (error as any).detail = errorDetail;
    throw error;
  }

  return await res.json();
}

export const internalAuth = {
  /**
   * Look up user by email (returns hashed password for verification)
   */
  async getUserByEmail(email: string): Promise<InternalUser | null> {
    try {
      return await internalFetch<InternalUser>(
        `/api/internal/users/by-email?email=${encodeURIComponent(email)}`
      );
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  /**
   * Look up user by ID with profile and accounts
   */
  async getUserById(userId: string): Promise<InternalUser | null> {
    try {
      return await internalFetch<InternalUser>(`/api/internal/users/${userId}`);
    } catch (err: any) {
      if (err.status === 404) return null;
      throw err;
    }
  },

  /**
   * Create a new user with initial profile
   */
  async createUser(payload: CreateUserInput): Promise<InternalUser> {
    return await internalFetch<InternalUser>('/api/internal/users/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update failed login count and temporary lockout
   */
  async updateLockout(
    userId: string,
    failedAttempts: number,
    lockedUntil?: string | null
  ): Promise<any> {
    return await internalFetch(`/api/internal/users/${userId}/lockout`, {
      method: 'POST',
      body: JSON.stringify({
        failed_attempts: failedAttempts,
        locked_until: lockedUntil || null,
      }),
    });
  },

  /**
   * Update profile details
   */
  async updateProfile(userId: string, payload: Partial<CreateUserInput>): Promise<InternalUser> {
    return await internalFetch<InternalUser>(`/api/internal/users/${userId}/profile`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Complete onboarding: personal info + initial bank accounts
   */
  async completeOnboarding(
    userId: string,
    payload: OnboardingInput
  ): Promise<InternalUser> {
    return await internalFetch<InternalUser>(`/api/internal/users/${userId}/onboarding`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * List user's bank accounts
   */
  async listAccounts(userId: string): Promise<any[]> {
    return await internalFetch<any[]>(`/api/internal/users/${userId}/accounts`);
  },

  /**
   * Create a new bank account for user
   */
  async createAccount(userId: string, payload: BankAccountInput): Promise<any> {
    return await internalFetch(`/api/internal/users/${userId}/accounts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update an existing bank account for user
   */
  async updateAccount(
    userId: string,
    accountId: string,
    payload: BankAccountInput
  ): Promise<any> {
    return await internalFetch(`/api/internal/users/${userId}/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Set an account as primary
   */
  async setPrimaryAccount(userId: string, accountId: string): Promise<any> {
    return await internalFetch(`/api/internal/users/${userId}/accounts/${accountId}/primary`, {
      method: 'POST',
    });
  },

  /**
   * Update password hash for user
   */
  async updatePassword(userId: string, newPasswordHash: string): Promise<any> {
    return await internalFetch(`/api/internal/users/${userId}/password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password_hash: newPasswordHash }),
    });
  },

  /**
   * Delete a bank account
   */
  async deleteAccount(userId: string, accountId: string): Promise<any> {
    return await internalFetch(`/api/internal/users/${userId}/accounts/${accountId}`, {
      method: 'DELETE',
    });
  },
};

