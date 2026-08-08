import prisma from '@/lib/prisma';

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowMs);

  const count = await prisma.rateLimitHit.count({
    where: { key, createdAt: { gte: windowStart } },
  });

  if (count >= limit) return false; // blocked

  await prisma.rateLimitHit.create({ data: { key } });

  // Opportunistic cleanup — occasionally delete old rows so the table doesn't grow forever
  if (Math.random() < 0.05) {
    prisma.rateLimitHit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }).catch(() => {});
  }

  return true; // allowed
}