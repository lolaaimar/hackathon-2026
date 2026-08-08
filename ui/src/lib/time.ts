const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

export function addDays(base: number, days: number): number {
  return base + days * DAY;
}

export function addHours(base: number, hours: number): number {
  return base + hours * HOUR;
}

export function fmtDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function timeFromNow(ms: number, now: number): string {
  const diff = ms - now;
  const abs = Math.abs(diff);
  const future = diff >= 0;
  const label = future ? 'in' : 'ago';
  const units: [number, string][] = [
    [DAY, 'd'],
    [HOUR, 'h'],
    [60 * 1000, 'm'],
  ];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const n = Math.max(1, Math.round(abs / size));
      return `${label} ${n}${suffix}`;
    }
  }
  return future ? 'now' : 'just now';
}

export function daysBetween(a: number, b: number): number {
  return Math.round((b - a) / DAY);
}
