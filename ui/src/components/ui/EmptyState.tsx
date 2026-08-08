import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line-strong bg-panel/50 px-6 py-10 text-center">
      <div className="text-muted">{icon}</div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {body ? <p className="max-w-sm text-[13px] text-muted">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
