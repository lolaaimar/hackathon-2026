import { fmtNight } from '../lib/format';
import { sumStages } from '../lib/validation';
import { canWithdraw, isWinner, mineOf } from '../state/guards';
import { useGovFund } from '../state/provider';
import type { ProjectInfo, Proposal } from '../types';
import { Button } from './ui/Button';
import { AlertIcon, CheckIcon, LockIcon, VoteIcon } from './ui/icons';

export function ProposalList({
  project,
  onVote,
  onWithdraw,
}: {
  project: ProjectInfo;
  onVote?: (proposalId: string) => void;
  onWithdraw?: (proposalId: string) => void;
}) {
  const { state } = useGovFund();
  const sorted = [...project.proposals].sort((a, b) => b.voteCount - a.voteCount);

  return (
    <div className="space-y-3">
      {sorted.map((pr) => (
        <ProposalRow
          key={pr.id}
          proposal={pr}
          project={project}
          mine={mineOf(state, pr)}
          onVote={onVote}
          onWithdraw={onWithdraw}
        />
      ))}
    </div>
  );
}

function ProposalRow({
  proposal,
  project,
  mine,
  onVote,
  onWithdraw,
}: {
  proposal: Proposal;
  project: ProjectInfo;
  mine: boolean;
  onVote?: (proposalId: string) => void;
  onWithdraw?: (proposalId: string) => void;
}) {
  const voteOk = project.status === 'Voting' && project.voted === null;
  const withdrawOk = canWithdraw(project, proposal);
  const winner = isWinner(project, proposal);
  const revealed = proposal.revealed || mine;
  const total = proposal.stages.length;

  const initials = proposal.companyName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition-colors ${
        winner ? 'border-selected/60 bg-selected-soft/50' : 'border-line'
      }`}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold"
          style={{
            backgroundColor: winner ? 'var(--color-selected-soft)' : 'var(--color-panel-strong)',
            color: winner ? 'var(--color-selected)' : 'var(--color-muted)',
          }}
        >
          {initials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-sm font-semibold text-ink">
              {revealed ? proposal.companyName : 'Anonymous bidder'}
            </h4>
            {!revealed ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted">
                <LockIcon size={11} /> identity hidden
              </span>
            ) : null}
            <span className="font-mono text-[11px] text-muted">{proposal.id}</span>
            {winner ? (
              <span className="rounded-full bg-selected px-2 py-0.5 text-[11px] font-medium text-white">
                Winner
              </span>
            ) : null}
            {mine ? (
              <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                Yours
              </span>
            ) : null}
          </div>

          <div className="mt-2 grid max-w-md gap-1.5">
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-panel-strong">
              {proposal.stages.map((s, i) => (
                <span
                  key={i}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${(s.amount / proposal.budget) * 100}%`,
                    backgroundColor: winner ? 'var(--color-selected)' : 'var(--color-progress)',
                  }}
                />
              ))}
            </div>
            <p className="text-[11px] text-muted">
              {total} stage{total === 1 ? '' : 's'} · {fmtNight(sumStages(proposal.stages))}
            </p>
          </div>

          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
            <div>
              <dt className="inline text-muted">Budget </dt>
              <dd className="tabular inline font-semibold text-ink">{fmtNight(proposal.budget)}</dd>
            </div>
            <div>
              <dt className="inline text-muted">Collateral </dt>
              <dd className="tabular inline font-semibold text-ink">
                {proposal.withdrawn ? 'withdrawn' : fmtNight(proposal.collateral)}
              </dd>
            </div>
            {proposal.withdrawn ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-success">
                <CheckIcon size={11} /> collateral refunded
              </span>
            ) : null}
          </dl>

          {proposal.description && revealed ? (
            <p className="mt-3 text-[13px] leading-relaxed text-body border-t border-line pt-3">
              {proposal.description}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-panel px-2.5 py-1 text-[12px] font-semibold text-ink">
            <VoteIcon size={13} className="text-muted" />
            <span className="tabular">{proposal.voteCount}</span>
          </span>

          {onVote && voteOk ? (
            <Button size="sm" onClick={() => onVote(proposal.id)}>
              Vote
            </Button>
          ) : project.voted === proposal.id ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-success">
              <CheckIcon size={13} /> Your vote
            </span>
          ) : null}

          {onWithdraw && withdrawOk ? (
            <Button size="sm" variant="secondary" onClick={() => onWithdraw(proposal.id)}>
              Withdraw collateral
            </Button>
          ) : null}

          {mine &&
          project.status === 'Selected' &&
          project.winnerProposalId === proposal.id &&
          project.winnerCompany === null ? (
            <span className="inline-flex items-center gap-1 text-[12px] text-warning">
              <AlertIcon size={13} /> Reveal to proceed
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
