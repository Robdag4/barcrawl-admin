import { NextResponse } from 'next/server';
import { getLogoutCookieOptions } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const cookieOpts = getLogoutCookieOptions();
  response.cookies.set(cookieOpts.name, cookieOpts.value, cookieOpts);
  return response;
}
