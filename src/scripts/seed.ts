import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { users } from '../db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const email = 'rob@barcrawl.com';
  const existing = await db.select().from(users).where(eq(users.email, email));
  
  if (existing.length > 0) {
    console.log('Admin user already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('barcrawl_admin_2026', 12);
  
  const [user] = await db.insert(users).values({
    email,
    passwordHash,
    name: 'Rob',
    role: 'super_admin',
  }).returning();

  console.log('Created admin user:', user.email, 'id:', user.id);
}

main().catch(console.error);
