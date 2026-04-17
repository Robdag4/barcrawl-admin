import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'fallback-secret');
const COOKIE_NAME = 'barcrawl-organizer-session';

export interface OrganizerSession {
  type: 'organizer';
  id: number;
  name: string;
  email: string;
  claimStatus: string;
}

export async function createOrganizerToken(organizer: Omit<OrganizerSession, 'type'>): Promise<string> {
  return new SignJWT({ type: 'organizer', ...organizer })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyOrganizerToken(token: string): Promise<OrganizerSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.type !== 'organizer') return null;
    return payload as unknown as OrganizerSession;
  } catch {
    return null;
  }
}

export async function getCurrentOrganizer(): Promise<OrganizerSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyOrganizerToken(token);
}

export function getOrganizerSessionCookie(token: string) {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  };
}
