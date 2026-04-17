import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { organizers, crawlCandidates, auditLog } from '@/db/schema';
import { eq, ilike, and, desc, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = req.nextUrl;
  const claimStatus = url.searchParams.get('claimStatus');
  const search = url.searchParams.get('search');
  const id = url.searchParams.get('id');

  // Single organizer detail
  if (id) {
    const [org] = await db.select().from(organizers).where(eq(organizers.id, Number(id)));
    if (!org) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const crawls = await db.select().from(crawlCandidates)
      .where(ilike(crawlCandidates.organizerName, org.name))
      .orderBy(desc(crawlCandidates.createdAt)).limit(50);
    return NextResponse.json({ organizer: org, crawls });
  }

  const conditions = [];
  if (claimStatus) conditions.push(eq(organizers.claimStatus, claimStatus));
  if (search) conditions.push(ilike(organizers.name, `%${search}%`));

  const rows = await db.select({
    id: organizers.id,
    name: organizers.name,
    email: organizers.email,
    website: organizers.website,
    claimStatus: organizers.claimStatus,
    outreachStatus: organizers.outreachStatus,
    createdAt: organizers.createdAt,
    updatedAt: organizers.updatedAt,
    crawlCount: sql<number>`(SELECT count(*)::int FROM crawl_candidates WHERE lower(organizer_name) = lower(${organizers.name}))`,
  }).from(organizers)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(organizers.updatedAt))
    .limit(200);

  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const [row] = await db.insert(organizers).values({
    name: body.name,
    email: body.email || null,
    phone: body.phone || null,
    website: body.website || null,
    logoUrl: body.logoUrl || null,
    bio: body.bio || null,
    claimStatus: 'unclaimed',
  }).returning();

  await db.insert(auditLog).values({
    userId: user.id,
    action: 'create_organizer',
    entityType: 'organizer',
    entityId: row.id,
    details: { name: body.name },
  });

  return NextResponse.json(row, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const allowed = ['name', 'email', 'phone', 'website', 'logoUrl', 'bio', 'claimStatus', 'outreachStatus', 'outreachNotes'];
  for (const k of allowed) {
    if (fields[k] !== undefined) updates[k] = fields[k];
  }

  const [row] = await db.update(organizers).set(updates).where(eq(organizers.id, id)).returning();

  await db.insert(auditLog).values({
    userId: user.id,
    action: fields.claimStatus ? `organizer_${fields.claimStatus}` : 'organizer_updated',
    entityType: 'organizer',
    entityId: id,
    details: fields,
  });

  return NextResponse.json(row);
}
