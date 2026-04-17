import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { crawlCandidates, auditLog } from '@/db/schema';
import { eq, ilike, and, desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = req.nextUrl;
  const status = url.searchParams.get('status');
  const city = url.searchParams.get('city');
  const platform = url.searchParams.get('platform');

  const conditions = [];
  if (status) conditions.push(eq(crawlCandidates.status, status));
  if (city) conditions.push(ilike(crawlCandidates.city, `%${city}%`));
  if (platform) conditions.push(eq(crawlCandidates.sourcePlatform, platform));

  const rows = await db.select().from(crawlCandidates)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(crawlCandidates.createdAt))
    .limit(200);

  // Get distinct cities and platforms for filter dropdowns
  const cities = await db.selectDistinct({ city: crawlCandidates.city }).from(crawlCandidates).where(sql`${crawlCandidates.city} is not null`);
  const platforms = await db.selectDistinct({ platform: crawlCandidates.sourcePlatform }).from(crawlCandidates).where(sql`${crawlCandidates.sourcePlatform} is not null`);

  return NextResponse.json({ rows, cities: cities.map(c => c.city), platforms: platforms.map(p => p.platform) });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const [row] = await db.insert(crawlCandidates).values({
    title: body.title,
    sourceUrl: body.sourceUrl || null,
    sourcePlatform: body.sourcePlatform || null,
    city: body.city || null,
    state: body.state || null,
    neighborhood: body.neighborhood || null,
    date: body.date || null,
    timeStart: body.timeStart || null,
    timeEnd: body.timeEnd || null,
    price: body.price || null,
    organizerName: body.organizerName || null,
    ticketUrl: body.ticketUrl || null,
    imageUrl: body.imageUrl || null,
    description: body.description || null,
    stops: body.stops || null,
    includes: body.includes || null,
    confidence: body.confidence || null,
    status: 'pending',
  }).returning();

  await db.insert(auditLog).values({
    userId: user.id,
    action: 'create_candidate',
    entityType: 'crawl_candidate',
    entityId: row.id,
    details: { title: body.title },
  });

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { id, status, duplicateOfId, notes } = body;

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (status) {
    updates.status = status;
    updates.reviewedBy = user.id;
    updates.reviewedAt = new Date();
  }
  if (duplicateOfId !== undefined) updates.duplicateOfId = duplicateOfId;
  if (notes !== undefined) updates.notes = notes;

  const [row] = await db.update(crawlCandidates).set(updates).where(eq(crawlCandidates.id, id)).returning();

  await db.insert(auditLog).values({
    userId: user.id,
    action: status ? `candidate_${status}` : 'candidate_updated',
    entityType: 'crawl_candidate',
    entityId: id,
    details: { status, duplicateOfId },
  });

  return NextResponse.json(row);
}
