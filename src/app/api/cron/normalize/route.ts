import { NextRequest, NextResponse } from 'next/server';
import { verifyCron } from '@/lib/cron-auth';
import { db } from '@/db';
import { crawlCandidates, auditLog } from '@/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';

const STATE_MAP: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
  'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};

function titleCase(s: string): string {
  return s.trim().toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function normalizeState(s: string): string {
  const trimmed = s.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();
  return STATE_MAP[trimmed.toLowerCase()] || trimmed;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pending = await db.select()
      .from(crawlCandidates)
      .where(eq(crawlCandidates.status, 'pending'));

    let normalizedCount = 0;
    let duplicateCount = 0;

    for (const candidate of pending) {
      try {
        const updates: Record<string, unknown> = { updatedAt: new Date() };

        // Normalize city
        if (candidate.city) {
          updates.city = titleCase(candidate.city);
        }
        // Normalize state
        if (candidate.state) {
          updates.state = normalizeState(candidate.state);
        }
        // Trim title
        if (candidate.title) {
          updates.title = candidate.title.trim();
        }

        // Duplicate detection: same city + similar title prefix + same date
        if (candidate.city && candidate.date && !candidate.duplicateOfId) {
          const normalizedCity = (candidate.city || '').trim().toLowerCase();
          const titlePrefix = (candidate.title || '').trim().toLowerCase().substring(0, 10);

          if (titlePrefix.length > 0) {
            const dupes = await db.select({ id: crawlCandidates.id, createdAt: crawlCandidates.createdAt })
              .from(crawlCandidates)
              .where(and(
                ne(crawlCandidates.id, candidate.id),
                eq(crawlCandidates.date, candidate.date),
                sql`lower(${crawlCandidates.city}) = ${normalizedCity}`,
                sql`lower(left(${crawlCandidates.title}, 10)) = ${titlePrefix}`,
              ))
              .limit(1);

            if (dupes.length > 0) {
              updates.duplicateOfId = dupes[0].id;
              updates.status = 'duplicate';
              duplicateCount++;
            }
          }
        }

        await db.update(crawlCandidates)
          .set(updates)
          .where(eq(crawlCandidates.id, candidate.id));
        normalizedCount++;
      } catch (err) {
        console.error(`Error normalizing candidate ${candidate.id}:`, err);
      }
    }

    await db.insert(auditLog).values({
      action: 'cron_normalize',
      entityType: 'crawl_candidate',
      details: { processed: normalizedCount, duplicatesFound: duplicateCount },
    });

    return NextResponse.json({
      success: true,
      processed: normalizedCount,
      duplicatesFound: duplicateCount,
    });
  } catch (err) {
    console.error('Normalize cron error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
