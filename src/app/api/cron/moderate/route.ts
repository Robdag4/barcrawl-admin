import { NextRequest, NextResponse } from 'next/server';
import { verifyCron } from '@/lib/cron-auth';
import { db } from '@/db';
import { crawlCandidates, auditLog } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const candidates = await db.select()
      .from(crawlCandidates)
      .where(and(
        eq(crawlCandidates.status, 'pending'),
        isNotNull(crawlCandidates.internalScore),
      ));

    let approved = 0;
    let rejected = 0;
    let needsReview = 0;

    for (const c of candidates) {
      try {
        const score = c.internalScore!;
        if (score >= 75) {
          await db.update(crawlCandidates)
            .set({ status: 'approved', updatedAt: new Date() })
            .where(eq(crawlCandidates.id, c.id));
          approved++;
        } else if (score < 40) {
          await db.update(crawlCandidates)
            .set({ status: 'rejected', updatedAt: new Date() })
            .where(eq(crawlCandidates.id, c.id));
          rejected++;
        } else {
          needsReview++;
        }
      } catch (err) {
        console.error(`Error moderating candidate ${c.id}:`, err);
      }
    }

    await db.insert(auditLog).values({
      action: 'cron_moderate',
      entityType: 'crawl_candidate',
      details: { approved, rejected, needsReview },
    });

    return NextResponse.json({ success: true, approved, rejected, needsReview });
  } catch (err) {
    console.error('Moderate cron error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
