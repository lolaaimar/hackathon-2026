import { Link } from 'react-router-dom';
import { fmtNight, shortAddr } from '../lib/format';
import type { ProjectInfo } from '../types';
import { StatusBadge } from './StatusBadge';

export function ProjectCard({ p, to }: { p: ProjectInfo; to: string }) {
  const open = p.status === 'Voting' || p.status === 'Selected';

  return (
    <Link
      to={to}
      className="group rounded-2xl border border-line bg-white p-5 transition-all duration-150 hover:border-primary-600/50 hover:shadow-lg hover:shadow-ink/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-mono text-[11px] text-muted">{shortAddr(p.id)}</span>
            <StatusBadge status={p.status} />
          </div>
          <h3 className="mt-2 text-[15px] font-semibold text-ink group-hover:text-primary-700">
            {p.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-muted">{p.description}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-[12px]">
        <div>
          <dt className="text-muted">Budget</dt>
          <dd className="tabular mt-0.5 font-semibold text-ink">
            {p.budget > 0 ? fmtNight(p.budget) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Proposals</dt>
          <dd className="tabular mt-0.5 font-semibold text-ink">{p.proposals.length}</dd>
        </div>
        <div>
          <dt className="text-muted">{open ? 'Votes' : 'Paid'}</dt>
          <dd className="tabular mt-0.5 font-semibold text-ink">
            {open ? p.totalVotes : fmtNight(p.disbursed)}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
