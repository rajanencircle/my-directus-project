export function isExpired(expiryDate: unknown, now: Date = new Date()): boolean {
  if (!expiryDate) return false;
  if (typeof expiryDate !== 'string') return false;
  const d = new Date(expiryDate);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < now.getTime();
}

