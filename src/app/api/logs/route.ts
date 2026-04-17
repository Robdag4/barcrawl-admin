import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/db';
import { auditLog, users } from '@/db/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const limit = 50;
  const offset = (page - 1) * limit;
  const entityType = url.searchParams.get('entityType');
  const action = url.searchParams.get('action');
  const dateFrom = url.searchParams.get('dateFrom');
  const dateTo = url.searchParams.get('dateTo');

  const conditions = [];
  if (entityType) conditions.push(eq(auditLog.entityType, entityType));
  if (action) conditions.push(eq(auditLog.action, action));
  if (dateFrom) conditions.push(gte(auditLog.createdAt, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(auditLog.createdAt, new Date(dateTo)));

  const where = conditions.length ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select({
      id: auditLog.id,
      userId: auditLog.userId,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      details: auditLog.details,
      createdAt: auditLog.createdAt,
      userName: sql<string>`(SELECT name FROM users WHERE id = ${auditLog.userId})`,
    }).from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(auditLog).where(where),
  ]);

  return NextResponse.json({
    rows,
    total: countResult[0]?.count || 0,
    page,
    pageSize: limit,
  });
}
