export function fmtAmount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

export function fmtNight(n: number): string {
  return `${fmtAmount(n)} NIGHT`;
}

export function fmtCompact(n: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(n);
}

export function shortAddr(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}
