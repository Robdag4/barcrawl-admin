import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizers } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const results = await db.select().from(organizers).where(eq(organizers.verificationToken, token)).limit(1);
    if (results.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const organizer = results[0];

    // Check domain match for auto-claim
    let claimed = false;
    if (organizer.email && organizer.website) {
      const emailDomain = organizer.email.split('@')[1]?.toLowerCase();
      try {
        const websiteDomain = new URL(organizer.website.startsWith('http') ? organizer.website : `https://${organizer.website}`).hostname.replace(/^www\./, '').toLowerCase();
        if (emailDomain === websiteDomain) {
          claimed = true;
        }
      } catch {
        // invalid URL, skip domain check
      }
    }

    await db.update(organizers).set({
      emailVerified: true,
      verificationToken: null,
      ...(claimed ? { claimStatus: 'claimed' } : {}),
      updatedAt: new Date(),
    }).where(eq(organizers.id, organizer.id));

    return NextResponse.json({ success: true, claimed });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
