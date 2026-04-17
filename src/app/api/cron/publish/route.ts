import { NextRequest, NextResponse } from 'next/server';
import { verifyCron } from '@/lib/cron-auth';
import { db } from '@/db';
import { crawlCandidates, auditLog } from '@/db/schema';
import { eq, isNull, and, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(crawlCandidates)
      .where(and(
        eq(crawlCandidates.status, 'approved'),
        isNull(crawlCandidates.wpPostId),
      ));

    const readyCount = Number(result[0]?.count || 0);

    await db.insert(auditLog).values({
      action: 'cron_publish',
      entityType: 'crawl_candidate',
      details: { message: `${readyCount} candidates ready for WordPress publish` },
    });

    return NextResponse.json({
      success: true,
      readyForPublish: readyCount,
      message: `${readyCount} candidates ready for WordPress publish (sync not yet implemented)`,
    });
  } catch (err) {
    console.error('Publish cron error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
