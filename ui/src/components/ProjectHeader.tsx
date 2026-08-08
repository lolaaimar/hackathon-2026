import { fmtNight } from '../lib/format';
import type { ProjectInfo } from '../types';
import { STATUS_META } from '../types';
import { LifecycleTimeline } from './LifecycleTimeline';
import { StatusBadge } from './StatusBadge';
import { Stat } from './ui/Card';

export function ProjectHeader({ p }: { p: ProjectInfo }) {
  const meta = STATUS_META[p.status];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] text-muted">{p.id}</span>
        <StatusBadge status={p.status} />
        <span className="text-[12px] text-muted">opened by {p.createdBy}</span>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-ink text-balance">{p.title}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{p.description}</p>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-line bg-white p-5">
        <LifecycleTimeline status={p.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Budget"
          value={p.budget > 0 ? fmtNight(p.budget) : '—'}
          hint={p.budget === 0 && p.status === 'Selected' ? 'deposit after reveal' : undefined}
        />
        <Stat
          label="Collateral required"
          value={fmtNight(p.collateralRequired)}
          hint="per proposal"
        />
        <Stat
          label={p.status === 'Completed' ? 'Disbursed' : 'Disbursed'}
          value={fmtNight(p.disbursed)}
          hint={
            p.budget > 0 && p.status !== 'Completed'
              ? `${Math.round((p.disbursed / p.budget) * 100)}% of budget`
              : undefined
          }
        />
        {p.status === 'Selected' ? (
          <Stat
            label="Winner"
            value={p.winnerCompany ? 'Revealed' : 'Committed'}
            hint={p.winnerCompany ? undefined : 'identity hidden until reveal'}
          />
        ) : (
          <Stat
            label="Status"
            value={
              <span className="inline-flex items-center gap-1.5" style={{ color: meta.color }}>
                {p.status}
              </span>
            }
          />
        )}
      </div>
    </div>
  );
}
