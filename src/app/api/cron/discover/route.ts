import { NextRequest, NextResponse } from 'next/server';
import { verifyCron } from '@/lib/cron-auth';
import { db } from '@/db';
import { crawlCandidates, organizers, auditLog } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Top 50 US cities for bar crawls — 2 queries each = 100 searches/month (free tier)
// Runs weekly on Monday in 4 batches of ~13 cities

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const QUERIES = ['bar crawl', 'pub crawl'];
const BATCH_SIZE = 13; // cities per invocation

interface SerpEvent {
  title?: string;
  date?: { start_date?: string; when?: string };
  address?: string[];
  link?: string;
  description?: string;
  venue?: { name?: string; rating?: number };
  thumbnail?: string;
  event_location_map?: { image?: string };
}

function extractCityState(address: string[]): { city: string | null; state: string | null } {
  // Address is usually ["venue", "123 Main St, City, ST 12345"] or ["City, ST"]
  for (const line of [...address].reverse()) {
    const match = line.match(/([A-Za-z\s.'-]+),\s*([A-Z]{2})/);
    if (match) return { city: match[1].trim(), state: match[2] };
  }
  return { city: null, state: null };
}

function extractPlatform(url: string): string {
  if (!url) return 'unknown';
  if (url.includes('eventbrite.com')) return 'eventbrite';
  if (url.includes('posh.vip')) return 'posh';
  if (url.includes('squadup.com')) return 'squadup';
  if (url.includes('facebook.com')) return 'facebook';
  if (url.includes('meetup.com')) return 'meetup';
  return 'other';
}

function parseDate(dateObj: SerpEvent['date']): string | null {
  if (!dateObj) return null;
  const when = dateObj.start_date || dateObj.when || '';
  // Try to extract a date from formats like "Apr 18", "May 2, 2026", "Friday, Apr 18"
  const match = when.match(/([A-Z][a-z]+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (!match) return null;
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const mon = months[match[1]];
  if (!mon) return null;
  const year = match[3] || new Date().getFullYear().toString();
  const day = match[2].padStart(2, '0');
  return `${year}-${mon}-${day}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.SERPAPI_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing SERPAPI_KEY' }, { status: 500 });
  }

  try {
    // Get batch offset from query param (for chained invocations)
    const batchOffset = parseInt(req.nextUrl.searchParams.get('batch') || '0');

    // Get all cities from our organizer/crawl data, or use a static list
    // For now, query distinct cities from existing data, fallback to querying all
    const cityRows = await db.selectDistinct({ city: crawlCandidates.city })
      .from(crawlCandidates)
      .where(sql`${crawlCandidates.city} is not null`);

    // Static city list as fallback (top US cities for bar crawls)
    // Top 50 US cities for bar crawl activity (100 searches/month = free tier)
    const staticCities = [
      'New York, NY', 'Chicago, IL', 'Austin, TX', 'Nashville, TN', 'Miami, FL',
      'San Diego, CA', 'Las Vegas, NV', 'Denver, CO', 'Portland, OR', 'Savannah, GA',
      'New Orleans, LA', 'Scottsdale, AZ', 'San Francisco, CA', 'Los Angeles, CA',
      'Houston, TX', 'Dallas, TX', 'Philadelphia, PA', 'Boston, MA', 'Seattle, WA',
      'Atlanta, GA', 'Minneapolis, MN', 'Milwaukee, WI', 'Pittsburgh, PA', 'Detroit, MI',
      'Cleveland, OH', 'Columbus, OH', 'St. Louis, MO', 'Jacksonville, FL', 'Tampa, FL',
      'Fort Lauderdale, FL', 'Hoboken, NJ', 'Jersey City, NJ', 'Honolulu, HI',
      'Louisville, KY', 'Charlotte, NC', 'Raleigh, NC', 'Baltimore, MD', 'Washington, DC',
      'Indianapolis, IN', 'Kansas City, MO', 'Orlando, FL', 'Charleston, SC',
      'Cincinnati, OH', 'San Antonio, TX', 'Sacramento, CA', 'Phoenix, AZ',
      'Salt Lake City, UT', 'Richmond, VA', 'Madison, WI', 'Asheville, NC',
    ];

    const cities = staticCities.slice(batchOffset, batchOffset + BATCH_SIZE);
    if (cities.length === 0) {
      return NextResponse.json({ success: true, message: 'No more cities to process', batch: batchOffset });
    }

    let newCount = 0;
    let skippedCount = 0;
    let organizerCount = 0;
    let searchCount = 0;
    const errors: string[] = [];

    for (const cityStr of cities) {
      for (const q of QUERIES) {
        try {
          const params = new URLSearchParams({
            engine: 'google_events',
            q: `${q} in ${cityStr}`,
            api_key: apiKey,
            hl: 'en',
            gl: 'us',
          });

          const res = await fetch(`${SERPAPI_BASE}?${params}`);
          searchCount++;

          if (!res.ok) {
            errors.push(`SerpAPI error for "${q} in ${cityStr}": ${res.status}`);
            continue;
          }

          const data = await res.json();
          const events: SerpEvent[] = data.events_results || [];

          for (const event of events) {
            try {
              const sourceUrl = event.link || '';
              if (!sourceUrl) continue;

              // Must contain "crawl" in title
              const title = event.title || '';
              if (!title.toLowerCase().includes('crawl')) continue;

              // Dedup check
              const existing = await db.select({ id: crawlCandidates.id })
                .from(crawlCandidates)
                .where(eq(crawlCandidates.sourceUrl, sourceUrl))
                .limit(1);

              if (existing.length > 0) {
                skippedCount++;
                continue;
              }

              const { city, state } = event.address
                ? extractCityState(event.address)
                : { city: cityStr.split(',')[0].trim(), state: cityStr.split(',')[1]?.trim() || null };

              const platform = extractPlatform(sourceUrl);
              const date = parseDate(event.date);

              await db.insert(crawlCandidates).values({
                title,
                sourceUrl,
                sourcePlatform: platform,
                city,
                state,
                date,
                organizerName: null, // SerpAPI doesn't always include organizer
                ticketUrl: sourceUrl,
                imageUrl: event.thumbnail || null,
                description: event.description || null,
                confidence: 65,
                status: 'pending',
              });
              newCount++;

              // If venue info available, could track organizer later via enrichment
            } catch (err) {
              errors.push(`Error processing "${event.title}": ${String(err)}`);
            }
          }

          // Small delay between requests to be respectful
          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          errors.push(`Failed "${q} in ${cityStr}": ${String(err)}`);
        }
      }
    }

    await db.insert(auditLog).values({
      action: 'cron_discover',
      entityType: 'crawl_candidate',
      details: {
        newCount,
        skippedCount,
        organizerCount,
        searchCount,
        batchOffset,
        citiesProcessed: cities.length,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      batch: batchOffset,
      citiesProcessed: cities.length,
      searchesUsed: searchCount,
      newCandidates: newCount,
      skipped: skippedCount,
      newOrganizers: organizerCount,
      nextBatch: batchOffset + BATCH_SIZE < staticCities.length ? batchOffset + BATCH_SIZE : null,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (err) {
    console.error('Discover cron error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
