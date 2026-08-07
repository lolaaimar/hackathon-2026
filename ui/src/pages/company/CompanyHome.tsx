import { useNavigate } from "react-router-dom";
import { useGovFund } from "../../mock/store";
import { ProjectCard } from "../../components/ProjectCard";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { BuildingIcon, CheckIcon } from "../../components/ui/icons";
import { canWithdraw, isWinner, mineOf } from "../../mock/guards";
import { fmtNight } from "../../lib/format";
import { timeFromNow } from "../../lib/time";
import { DEMO_COMPANIES } from "../../types";

export function CompanyHome() {
  const { state, dispatch, toast } = useGovFund();
  const navigate = useNavigate();

  const myProposals = state.projects.flatMap((p) =>
    p.proposals
      .filter((pr) => mineOf(state, pr))
      .map((pr) => ({ project: p, proposal: pr }))
  );
  const myWinner = myProposals.find(({ project, proposal }) => isWinner(project, proposal));
  const openForBids = state.projects.filter(
    (p) => p.status === "Voting" && state.now < p.deadline
  );
  const revealPendingProject =
    myWinner &&
    !myWinner.project.winnerCompany &&
    !myWinner.proposal.revealed
      ? myWinner.project
      : null;

  const withdraw = (projectId: string, proposalId: string, amount: number) => {
    dispatch({ type: "WITHDRAW_COLLATERAL", projectId, proposalId });
    toast(`Collateral of ${fmtNight(amount)} returned to your wallet.`, "success");
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Company portal</h1>
        <p className="mt-1 text-sm text-muted">
          Bidding as <span className="font-semibold text-ink">{state.demoCompany}</span> — a single
          demo identity behind hidden commitments.
        </p>
      </div>

      <CompanyIdentitySwitcher />

      {revealPendingProject ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-selected/50 bg-selected-soft/60 p-4">
          <div>
            <p className="text-sm font-semibold text-ink">
              You won <span className="text-selected">{revealPendingProject.title}</span>
            </p>
            <p className="text-[13px] text-muted">
              Reveal your identity to unlock funding, or withdraw your collateral.
            </p>
          </div>
          <Button onClick={() => navigate(`/company/projects/${revealPendingProject.id}`)}>
            Go to project
          </Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Your proposals"
            subtitle={`${myProposals.length} submitted · collateral tracked per bid`}
          />
          {myProposals.length === 0 ? (
            <EmptyState
              icon={<BuildingIcon size={24} />}
              title="No bids yet"
              body="Find a project in voting below and submit a budget + stage schedule."
            />
          ) : (
            <ul className="divide-y divide-line">
              {myProposals.map(({ project, proposal }) => (
                <li key={proposal.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{project.title}</p>
                    <p className="text-[12px] text-muted">
                      <span className="font-mono">{proposal.id}</span> ·{" "}
                      {fmtNight(proposal.budget)} ·{" "}
                      {isWinner(project, proposal)
                        ? "winner"
                        : project.status === "Voting"
                          ? `${proposal.voteCount} votes`
                          : "not selected"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      proposal.revealed || (isWinner(project, proposal) && project.winnerCompany)
                        ? "bg-selected-soft text-selected"
                        : project.status === "Cancelled"
                          ? "bg-cancelled-soft text-cancelled"
                          : "bg-panel text-muted"
                    }`}
                  >
                    {proposal.withdrawn
                      ? "Withdrawn"
                      : proposal.revealed || (isWinner(project, proposal) && project.winnerCompany)
                        ? "Revealed"
                        : isWinner(project, proposal)
                          ? "Winner"
                          : project.status}
                  </span>
                  {canWithdraw(project, proposal) ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => withdraw(project.id, proposal.id, proposal.collateral)}
                    >
                      <CheckIcon size={13} /> Withdraw
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Open for bids"
            subtitle="Voting is live — submit before the deadline"
          />
          {openForBids.length === 0 ? (
            <EmptyState
              icon={<BuildingIcon size={24} />}
              title="Nothing open right now"
              body="New procurement projects appear here once government members open them."
            />
          ) : (
            <div className="space-y-3">
              {openForBids.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-line bg-white p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{p.title}</p>
                      <p className="text-[12px] text-muted">
                        closes {timeFromNow(p.deadline, state.now)} · collateral{" "}
                        {fmtNight(p.collateralRequired)}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => navigate(`/company/projects/${p.id}`)}>
                      Bid
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold tracking-tight text-ink">All projects</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {state.projects.map((p) => (
            <ProjectCard key={p.id} p={p} now={state.now} to={`/company/projects/${p.id}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CompanyIdentitySwitcher() {
  const { state, dispatch, toast } = useGovFund();
  return (
    <Card className="mb-6">
      <CardHeader
        title="Switch demo identity"
        subtitle="Simulate another company on stage — proposals, votes and winner stay as-is."
      />
      <div className="flex flex-wrap gap-2">
        {DEMO_COMPANIES.map((company) => {
          const active = company === state.demoCompany;
          return (
            <button
              key={company}
              type="button"
              onClick={() => {
                dispatch({ type: "SET_DEMO_COMPANY", company });
                toast(`Now bidding as ${company}`, "success");
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                active
                  ? "border-selected bg-selected text-white"
                  : "border-line bg-white text-muted hover:border-selected/60 hover:text-ink"
              }`}
            >
              {active ? <CheckIcon size={13} /> : <BuildingIcon size={13} />}
              {company}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
