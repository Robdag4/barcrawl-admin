import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { crawlCandidates, auditLog } from '@/db/schema';
import { eq, and, ne, isNull, sql } from 'drizzle-orm';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Find potential duplicates: same title+city, not already resolved
  const pairs = await db.execute(sql`
    SELECT a.id as left_id, b.id as right_id
    FROM crawl_candidates a
    JOIN crawl_candidates b ON lower(a.title) = lower(b.title)
      AND lower(coalesce(a.city,'')) = lower(coalesce(b.city,''))
      AND a.id < b.id
    WHERE a.duplicate_of_id IS NULL
      AND b.duplicate_of_id IS NULL
      AND a.status != 'rejected'
      AND b.status != 'rejected'
    ORDER BY a.id DESC
    LIMIT 50
  `);

  // Fetch full records for each pair
  const pairRows = pairs.rows as Array<{ left_id: number; right_id: number }>;
  const allIds = [...new Set(pairRows.flatMap(p => [p.left_id, p.right_id]))];

  let candidates: Record<number, typeof crawlCandidates.$inferSelect> = {};
  if (allIds.length > 0) {
    const rows = await db.select().from(crawlCandidates)
      .where(sql`${crawlCandidates.id} = ANY(${allIds})`);
    for (const r of rows) candidates[r.id] = r;
  }

  const result = pairRows.map(p => ({
    left: candidates[p.left_id],
    right: candidates[p.right_id],
  })).filter(p => p.left && p.right);

  return NextResponse.json({ pairs: result });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json();
  const { action, leftId, rightId } = body;

  if (!action || !leftId || !rightId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  if (action === 'keep_left') {
    await db.update(crawlCandidates).set({ duplicateOfId: leftId, status: 'rejected', updatedAt: new Date() }).where(eq(crawlCandidates.id, rightId));
  } else if (action === 'keep_right') {
    await db.update(crawlCandidates).set({ duplicateOfId: rightId, status: 'rejected', updatedAt: new Date() }).where(eq(crawlCandidates.id, leftId));
  } else if (action === 'not_dupe') {
    // Mark both with a special note so they don't show again
    await db.update(crawlCandidates).set({ notes: sql`coalesce(notes,'') || ' [not-dupe-' || ${rightId}::text || ']'`, updatedAt: new Date() }).where(eq(crawlCandidates.id, leftId));
    await db.update(crawlCandidates).set({ notes: sql`coalesce(notes,'') || ' [not-dupe-' || ${leftId}::text || ']'`, updatedAt: new Date() }).where(eq(crawlCandidates.id, rightId));
  } else if (action === 'merge') {
    // Keep left, merge best fields from right into left
    const [left] = await db.select().from(crawlCandidates).where(eq(crawlCandidates.id, leftId));
    const [right] = await db.select().from(crawlCandidates).where(eq(crawlCandidates.id, rightId));
    if (left && right) {
      await db.update(crawlCandidates).set({
        description: left.description || right.description,
        imageUrl: left.imageUrl || right.imageUrl,
        ticketUrl: left.ticketUrl || right.ticketUrl,
        price: left.price || right.price,
        stops: left.stops || right.stops,
        includes: left.includes || right.includes,
        timeStart: left.timeStart || right.timeStart,
        timeEnd: left.timeEnd || right.timeEnd,
        updatedAt: new Date(),
      }).where(eq(crawlCandidates.id, leftId));
      await db.update(crawlCandidates).set({ duplicateOfId: leftId, status: 'rejected', updatedAt: new Date() }).where(eq(crawlCandidates.id, rightId));
    }
  }

  await db.insert(auditLog).values({
    userId: user.id,
    action: `dedupe_${action}`,
    entityType: 'crawl_candidate',
    entityId: leftId,
    details: { leftId, rightId, action },
  });

  return NextResponse.json({ ok: true });
}
