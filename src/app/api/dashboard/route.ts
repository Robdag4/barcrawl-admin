import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { crawlCandidates, venueCandidates, organizers, auditLog } from '@/db/schema';
import { sql, desc } from 'drizzle-orm';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [crawlStats, venueStats, organizerStats, recentActivity] = await Promise.all([
    db.select({ status: crawlCandidates.status, count: sql<number>`count(*)::int` })
      .from(crawlCandidates).groupBy(crawlCandidates.status),
    db.select({ status: venueCandidates.status, count: sql<number>`count(*)::int` })
      .from(venueCandidates).groupBy(venueCandidates.status),
    db.select({ claimStatus: organizers.claimStatus, count: sql<number>`count(*)::int` })
      .from(organizers).groupBy(organizers.claimStatus),
    db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(10),
  ]);

  return NextResponse.json({ crawlStats, venueStats, organizerStats, recentActivity });
}
