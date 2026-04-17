import { NextResponse } from 'next/server';
import { db } from '@/db';
import { crawlCandidates } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentOrganizer } from '@/lib/organizer-auth';

export async function GET() {
  try {
    const session = await getCurrentOrganizer();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await db.select().from(crawlCandidates).where(eq(crawlCandidates.organizerName, session.name));

    return NextResponse.json({ crawls: results });
  } catch (error) {
    console.error('Get crawls error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
