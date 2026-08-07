export function Progress({
  value,
  max,
  color = "var(--color-primary-600)",
  height = 8,
  showLabel,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div
        className="overflow-hidden rounded-full bg-panel-strong"
        style={{ height, flex: 1 }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {showLabel ? (
        <span className="tabular w-10 text-right text-[12px] text-muted">{Math.round(pct)}%</span>
      ) : null}
    </div>
  );
}
