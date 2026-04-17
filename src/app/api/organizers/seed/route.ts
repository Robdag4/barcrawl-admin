import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { organizers, crawlCandidates, auditLog } from '@/db/schema';
import { sql } from 'drizzle-orm';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  // Get unique organizer names from crawl_candidates not already in organizers table
  const result = await db.execute(sql`
    INSERT INTO organizers (name, claim_status)
    SELECT DISTINCT cc.organizer_name, 'unclaimed'
    FROM crawl_candidates cc
    WHERE cc.organizer_name IS NOT NULL
      AND cc.organizer_name != ''
      AND NOT EXISTS (
        SELECT 1 FROM organizers o WHERE lower(o.name) = lower(cc.organizer_name)
      )
    RETURNING id, name
  `);

  const created = result.rows as Array<{ id: number; name: string }>;

  if (created.length > 0) {
    await db.insert(auditLog).values({
      userId: user.id,
      action: 'seed_organizers',
      entityType: 'organizer',
      entityId: 0,
      details: { count: created.length, names: created.map(r => r.name) },
    });
  }

  return NextResponse.json({ created: created.length, organizers: created });
}
