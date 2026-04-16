import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../src/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function seed() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const email = 'rob@barcrawl.com';
  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    console.log('Admin user already exists');
    return;
  }

  const passwordHash = await bcrypt.hash('barcrawl_admin_2026', 10);
  await db.insert(users).values({
    email,
    passwordHash,
    name: 'Rob',
    role: 'admin',
  });
  console.log('Admin user created: rob@barcrawl.com');
}

seed().catch(console.error);
