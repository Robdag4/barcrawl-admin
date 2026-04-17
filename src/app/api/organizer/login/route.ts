import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizers, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { createOrganizerToken, getOrganizerSessionCookie } from '@/lib/organizer-auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const results = await db.select().from(organizers).where(eq(organizers.email, email)).limit(1);
    if (results.length === 0 || !results[0].passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const organizer = results[0];
    const valid = await bcrypt.compare(password, organizer.passwordHash!);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createOrganizerToken({
      id: organizer.id,
      name: organizer.name,
      email: organizer.email!,
      claimStatus: organizer.claimStatus,
    });

    await db.update(organizers).set({ lastLoginAt: new Date() }).where(eq(organizers.id, organizer.id));

    const cookieStore = await cookies();
    const cookieOpts = getOrganizerSessionCookie(token);
    cookieStore.set(cookieOpts.name, cookieOpts.value, cookieOpts);

    await db.insert(auditLog).values({
      action: 'organizer_login',
      entityType: 'organizer',
      entityId: organizer.id,
      details: { email },
    });

    return NextResponse.json({
      success: true,
      organizer: {
        id: organizer.id,
        name: organizer.name,
        email: organizer.email,
        claimStatus: organizer.claimStatus,
        emailVerified: organizer.emailVerified,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
