import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { crawlCandidates, auditLog } from '@/db/schema';
import { getCurrentOrganizer } from '@/lib/organizer-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentOrganizer();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, city, state, date, timeStart, timeEnd, price, ticketUrl, description, stops, includes, imageUrl } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = await db.insert(crawlCandidates).values({
      title,
      city,
      state,
      date,
      timeStart,
      timeEnd,
      price,
      ticketUrl,
      description,
      stops: stops ? Number(stops) : null,
      includes,
      imageUrl,
      organizerName: session.name,
      sourcePlatform: 'organizer_submit',
      status: 'pending',
    }).returning();

    const candidate = result[0];

    await db.insert(auditLog).values({
      action: 'organizer_submit_crawl',
      entityType: 'crawl_candidate',
      entityId: candidate.id,
      details: { organizerId: session.id, title },
    });

    return NextResponse.json({ success: true, crawl: candidate });
  } catch (error) {
    console.error('Submit crawl error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
