import { NextRequest, NextResponse } from 'next/server';
import { verifyCron } from '@/lib/cron-auth';
import { db } from '@/db';
import { crawlCandidates, organizers, auditLog } from '@/db/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function bottleCapsFromScore(score: number): number {
  if (score >= 81) return 5;
  if (score >= 61) return 4;
  if (score >= 41) return 3;
  if (score >= 21) return 2;
  return 1;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pending = await db.select()
      .from(crawlCandidates)
      .where(and(
        eq(crawlCandidates.status, 'pending'),
        isNull(crawlCandidates.duplicateOfId),
      ));

    let scoredCount = 0;

    for (const c of pending) {
      try {
        // --- Trust (25%) ---
        let trust = 0;
        if (c.organizerName) {
          const org = await db.select({ claimStatus: organizers.claimStatus })
            .from(organizers)
            .where(eq(organizers.name, c.organizerName))
            .limit(1);
          if (org.length > 0 && (org[0].claimStatus === 'claimed' || org[0].claimStatus === 'verified')) {
            trust += 40;
          } else {
            trust += 10;
          }
        }
        if (c.ticketUrl) trust += 30;
        if (c.sourcePlatform === 'eventbrite') trust += 30;
        trust = clamp(trust, 0, 100);

        // --- Completeness (20%) ---
        const fields = [c.title, c.city, c.date, c.price, c.description, c.imageUrl, c.organizerName, c.stops];
        const filled = fields.filter(f => f !== null && f !== undefined && f !== '').length;
        const completeness = clamp(Math.round((filled / fields.length) * 100), 0, 100);

        // --- Quality (25%) ---
        let quality = 0;
        if (c.imageUrl) quality += 25;
        if (c.description && c.description.length > 50) quality += 30;
        if (c.price) quality += 25;
        if (c.stops && c.stops > 1) quality += 20;
        quality = clamp(quality, 0, 100);

        // --- Freshness (15%) ---
        let freshness = 0;
        if (c.date) {
          const eventDate = new Date(c.date);
          const now = new Date();
          const daysOut = Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOut < 0) {
            freshness = 0;
          } else if (daysOut <= 30) {
            freshness = 100;
          } else if (daysOut <= 90) {
            freshness = 60;
          } else {
            freshness = 20;
          }
        }

        // --- Popularity (15%) ---
        let popularity = 0;
        if (c.organizerName) {
          const crawlCount = await db.select({ count: sql<number>`count(*)` })
            .from(crawlCandidates)
            .where(eq(crawlCandidates.organizerName, c.organizerName));
          const cnt = Number(crawlCount[0]?.count || 0);
          if (cnt >= 5) popularity += 60;
          else if (cnt >= 2) popularity += 30;
        }
        if (c.sourcePlatform === 'eventbrite') popularity += 40;
        popularity = clamp(popularity, 0, 100);

        const internalScore = Math.round(
          trust * 0.25 + completeness * 0.20 + quality * 0.25 + freshness * 0.15 + popularity * 0.15
        );

        await db.update(crawlCandidates)
          .set({
            internalScore,
            bottleCaps: String(bottleCapsFromScore(internalScore)),
            scoreInputs: { trust, completeness, quality, freshness, popularity },
            updatedAt: new Date(),
          })
          .where(eq(crawlCandidates.id, c.id));
        scoredCount++;
      } catch (err) {
        console.error(`Error scoring candidate ${c.id}:`, err);
      }
    }

    await db.insert(auditLog).values({
      action: 'cron_score',
      entityType: 'crawl_candidate',
      details: { scored: scoredCount },
    });

    return NextResponse.json({ success: true, scored: scoredCount });
  } catch (err) {
    console.error('Score cron error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
