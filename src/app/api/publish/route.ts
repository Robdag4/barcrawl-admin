import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { crawlCandidates, auditLog } from '@/db/schema';
import { eq, or, desc, inArray } from 'drizzle-orm';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const rows = await db.select().from(crawlCandidates)
    .where(or(eq(crawlCandidates.status, 'approved'), eq(crawlCandidates.status, 'published')))
    .orderBy(desc(crawlCandidates.updatedAt))
    .limit(200);

  return NextResponse.json({ rows });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { ids, action, wpPostId } = body;

  if (!ids?.length || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  if (action === 'publish') {
    await db.update(crawlCandidates).set({
      status: 'published',
      wpPostId: wpPostId || null,
      updatedAt: new Date(),
    }).where(inArray(crawlCandidates.id, ids));
  } else if (action === 'unpublish') {
    await db.update(crawlCandidates).set({
      status: 'approved',
      wpPostId: null,
      updatedAt: new Date(),
    }).where(inArray(crawlCandidates.id, ids));
  }

  for (const id of ids) {
    await db.insert(auditLog).values({
      userId: user.id,
      action: `publish_${action}`,
      entityType: 'crawl_candidate',
      entityId: id,
      details: { action, wpPostId },
    });
  }

  return NextResponse.json({ ok: true });
}
