import { NextRequest, NextResponse } from 'next/server';
import { verifyCron } from '@/lib/cron-auth';
import { db } from '@/db';
import { crawlCandidates, organizers, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Scrape Eventbrite and Posh public search pages for bar crawl events
const QUERIES = ['bar+crawl', 'pub+crawl'];
const EVENTBRITE_SEARCH = 'https://www.eventbrite.com/d/united-states/';
const POSH_SEARCH = 'https://posh.vip/s?q=';

// Simple HTML text extractor
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').trim();
}

async function scrapeEventbrite(): Promise<Array<{
  title: string; sourceUrl: string; city: string | null; state: string | null;
  date: string | null; organizerName: string | null; imageUrl: string | null;
  price: string | null;
}>> {
  const results: Array<{
    title: string; sourceUrl: string; city: string | null; state: string | null;
    date: string | null; organizerName: string | null; imageUrl: string | null;
    price: string | null;
  }> = [];

  for (const q of QUERIES) {
    try {
      const url = `${EVENTBRITE_SEARCH}${q}/`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BarcrawlBot/1.0)' },
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Extract JSON-LD structured data (Eventbrite embeds it)
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          const events = Array.isArray(data) ? data : data['@type'] === 'ItemList' ? (data.itemListElement || []) : [data];
          for (const item of events) {
            const event = item.item || item;
            if (event['@type'] !== 'Event') continue;
            const name = typeof event.name === 'string' ? event.name : event.name?.['@value'] || '';
            if (!name) continue;
            // Filter: must contain "crawl" in title
            if (!name.toLowerCase().includes('crawl')) continue;

            const loc = event.location || {};
            const addr = loc.address || {};

            results.push({
              title: stripHtml(name),
              sourceUrl: event.url || '',
              city: addr.addressLocality || null,
              state: addr.addressRegion || null,
              date: event.startDate ? event.startDate.split('T')[0] : null,
              organizerName: event.organizer?.name || null,
              imageUrl: typeof event.image === 'string' ? event.image : event.image?.url || null,
              price: event.offers?.lowPrice ? `$${event.offers.lowPrice}` : null,
            });
          }
        } catch { /* skip malformed JSON-LD */ }
      }

      // Fallback: parse event cards from HTML if no JSON-LD
      if (results.length === 0) {
        // Look for event card patterns (Eventbrite uses data attributes and structured markup)
        const cardPattern = /data-testid="event-card"[\s\S]*?href="(https:\/\/www\.eventbrite\.com\/e\/[^"]+)"[\s\S]*?<h2[^>]*>(.*?)<\/h2>/g;
        let cardMatch;
        while ((cardMatch = cardPattern.exec(html)) !== null) {
          const title = stripHtml(cardMatch[2]);
          if (!title.toLowerCase().includes('crawl')) continue;
          results.push({
            title,
            sourceUrl: cardMatch[1],
            city: null, state: null, date: null,
            organizerName: null, imageUrl: null, price: null,
          });
        }
      }
    } catch (err) {
      console.error(`Eventbrite scrape error for "${q}":`, err);
    }
  }

  return results;
}

async function scrapePosh(): Promise<Array<{
  title: string; sourceUrl: string; city: string | null; state: string | null;
  date: string | null; organizerName: string | null; imageUrl: string | null;
  price: string | null;
}>> {
  const results: Array<{
    title: string; sourceUrl: string; city: string | null; state: string | null;
    date: string | null; organizerName: string | null; imageUrl: string | null;
    price: string | null;
  }> = [];

  for (const q of QUERIES) {
    try {
      const url = `${POSH_SEARCH}${q}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BarcrawlBot/1.0)' },
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Posh also uses JSON-LD or embedded JSON for event data
      const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
      for (const match of jsonLdMatches) {
        try {
          const data = JSON.parse(match[1]);
          const events = Array.isArray(data) ? data : [data];
          for (const event of events) {
            if (event['@type'] !== 'Event') continue;
            const name = typeof event.name === 'string' ? event.name : '';
            if (!name.toLowerCase().includes('crawl')) continue;

            const loc = event.location || {};
            const addr = loc.address || {};

            results.push({
              title: stripHtml(name),
              sourceUrl: event.url || '',
              city: addr.addressLocality || null,
              state: addr.addressRegion || null,
              date: event.startDate ? event.startDate.split('T')[0] : null,
              organizerName: event.organizer?.name || null,
              imageUrl: typeof event.image === 'string' ? event.image : event.image?.url || null,
              price: event.offers?.lowPrice ? `$${event.offers.lowPrice}` : null,
            });
          }
        } catch { /* skip */ }
      }

      // Fallback: look for event data in Next.js __NEXT_DATA__ or similar
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (nextDataMatch) {
        try {
          const nextData = JSON.parse(nextDataMatch[1]);
          const events = nextData?.props?.pageProps?.events || nextData?.props?.pageProps?.results || [];
          for (const event of events) {
            const name = event.name || event.title || '';
            if (!name.toLowerCase().includes('crawl')) continue;
            results.push({
              title: stripHtml(name),
              sourceUrl: event.url || (event.slug ? `https://posh.vip/e/${event.slug}` : ''),
              city: event.city || event.venue?.city || null,
              state: event.state || event.venue?.state || null,
              date: event.date || event.startDate || event.start_date || null,
              organizerName: event.organizer?.name || event.host?.name || null,
              imageUrl: event.image || event.flyer || event.cover_image || null,
              price: event.price ? `$${event.price}` : null,
            });
          }
        } catch { /* skip */ }
      }
    } catch (err) {
      console.error(`Posh scrape error for "${q}":`, err);
    }
  }

  return results;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let newCount = 0;
    let skippedCount = 0;
    let organizerCount = 0;
    const errors: string[] = [];

    // Scrape both platforms
    const [ebResults, poshResults] = await Promise.allSettled([
      scrapeEventbrite(),
      scrapePosh(),
    ]);

    const allResults: Array<{
      title: string; sourceUrl: string; city: string | null; state: string | null;
      date: string | null; organizerName: string | null; imageUrl: string | null;
      price: string | null; platform: string;
    }> = [];

    if (ebResults.status === 'fulfilled') {
      allResults.push(...ebResults.value.map(r => ({ ...r, platform: 'eventbrite' })));
    } else {
      errors.push(`Eventbrite scrape failed: ${ebResults.reason}`);
    }

    if (poshResults.status === 'fulfilled') {
      allResults.push(...poshResults.value.map(r => ({ ...r, platform: 'posh' })));
    } else {
      errors.push(`Posh scrape failed: ${poshResults.reason}`);
    }

    // Process results
    for (const event of allResults) {
      try {
        if (!event.sourceUrl) continue;

        // Dedup check
        const existing = await db.select({ id: crawlCandidates.id })
          .from(crawlCandidates)
          .where(eq(crawlCandidates.sourceUrl, event.sourceUrl))
          .limit(1);

        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        await db.insert(crawlCandidates).values({
          title: event.title,
          sourceUrl: event.sourceUrl,
          sourcePlatform: event.platform,
          city: event.city,
          state: event.state,
          date: event.date,
          price: event.price,
          organizerName: event.organizerName,
          ticketUrl: event.sourceUrl,
          imageUrl: event.imageUrl,
          confidence: 60, // lower confidence for web scrape vs API
          status: 'pending',
        });
        newCount++;

        // Upsert organizer
        if (event.organizerName) {
          const existingOrg = await db.select({ id: organizers.id })
            .from(organizers)
            .where(eq(organizers.name, event.organizerName))
            .limit(1);

          if (existingOrg.length === 0) {
            await db.insert(organizers).values({
              name: event.organizerName,
              claimStatus: 'unclaimed',
            });
            organizerCount++;
          }
        }
      } catch (err) {
        console.error(`Error processing event "${event.title}":`, err);
        errors.push(`Failed: ${event.title}`);
      }
    }

    await db.insert(auditLog).values({
      action: 'cron_discover',
      entityType: 'crawl_candidate',
      details: {
        newCount,
        skippedCount,
        organizerCount,
        totalScraped: allResults.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      totalScraped: allResults.length,
      newCandidates: newCount,
      skipped: skippedCount,
      newOrganizers: organizerCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Discover cron error:', err);
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
