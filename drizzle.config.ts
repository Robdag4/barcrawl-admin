import type { Config } from 'drizzle-kit';
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
  tablesFilter: ['users', 'crawl_candidates', 'venue_candidates', 'organizers', 'audit_log'],
} satisfies Config;
