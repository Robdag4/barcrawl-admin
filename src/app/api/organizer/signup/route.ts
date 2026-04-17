import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizers, auditLog } from '@/db/schema';
import { eq, ilike } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, companyName, website, phone } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    // Check if email already exists
    const existing = await db.select().from(organizers).where(eq(organizers.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const displayName = companyName || name;

    // Check if organizer record exists with matching name (from crawl import)
    const matchByName = await db.select().from(organizers).where(ilike(organizers.name, displayName)).limit(1);

    let organizerId: number;

    if (matchByName.length > 0) {
      // Link to existing record
      const match = matchByName[0];
      await db.update(organizers).set({
        email,
        passwordHash,
        phone: phone || match.phone,
        website: website || match.website,
        claimStatus: 'pending',
        verificationToken,
        updatedAt: new Date(),
      }).where(eq(organizers.id, match.id));
      organizerId = match.id;
    } else {
      // Create new organizer
      const result = await db.insert(organizers).values({
        name: displayName,
        email,
        passwordHash,
        phone,
        website,
        claimStatus: 'pending',
        verificationToken,
      }).returning({ id: organizers.id });
      organizerId = result[0].id;
    }

    await db.insert(auditLog).values({
      action: 'organizer_signup',
      entityType: 'organizer',
      entityId: organizerId,
      details: { email, name: displayName, linked: matchByName.length > 0 },
    });

    return NextResponse.json({
      success: true,
      organizerId,
      message: 'Check your email to verify',
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
