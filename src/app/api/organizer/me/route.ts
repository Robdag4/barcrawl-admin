import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentOrganizer } from '@/lib/organizer-auth';

export async function GET() {
  try {
    const session = await getCurrentOrganizer();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await db.select().from(organizers).where(eq(organizers.id, session.id)).limit(1);
    if (results.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const o = results[0];
    return NextResponse.json({
      id: o.id,
      name: o.name,
      email: o.email,
      phone: o.phone,
      website: o.website,
      logoUrl: o.logoUrl,
      bio: o.bio,
      socialLinks: o.socialLinks,
      claimStatus: o.claimStatus,
      emailVerified: o.emailVerified,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentOrganizer();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const allowedFields = ['name', 'phone', 'website', 'bio', 'socialLinks'] as const;
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    await db.update(organizers).set(updates).where(eq(organizers.id, session.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
