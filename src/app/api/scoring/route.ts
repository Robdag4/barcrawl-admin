import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { crawlCandidates, auditLog } from '@/db/schema';
import { eq, desc, or } from 'drizzle-orm';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const rows = await db.select().from(crawlCandidates)
    .where(or(eq(crawlCandidates.status, 'approved'), eq(crawlCandidates.status, 'published')))
    .orderBy(desc(crawlCandidates.internalScore))
    .limit(200);

  return NextResponse.json({ rows });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { id, internalScore, bottleCaps, scoreInputs } = body;

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (internalScore !== undefined) updates.internalScore = internalScore;
  if (bottleCaps !== undefined) updates.bottleCaps = String(bottleCaps);
  if (scoreInputs !== undefined) updates.scoreInputs = scoreInputs;

  const [row] = await db.update(crawlCandidates).set(updates).where(eq(crawlCandidates.id, id)).returning();

  await db.insert(auditLog).values({
    userId: user.id,
    action: 'score_override',
    entityType: 'crawl_candidate',
    entityId: id,
    details: { internalScore, bottleCaps, scoreInputs },
  });

  return NextResponse.json(row);
}
