import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  'fdl-super-secret-auth-key-minimum-32-chars-long!';

const key = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  sub: string;
  email: string;
  name?: string;
  role?: string;
  is_onboarded?: boolean;
}

/**
 * Creates a cryptographically signed HS256 JWT using jose.
 */
export async function createToken(
  payload: TokenPayload,
  expiresIn: string = '7d'
): Promise<string> {
  return await new SignJWT({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    role: payload.role || 'user',
    is_onboarded: payload.is_onboarded ?? false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

/**
 * Verifies the HS256 signature and expiry of the given token.
 * Returns decoded payload if valid, or null if expired/tampered.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
      role: (payload.role as string) || 'user',
      is_onboarded: payload.is_onboarded as boolean | undefined,
    };
  } catch {
    return null;
  }
}

