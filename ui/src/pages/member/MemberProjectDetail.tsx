import { useParams, Link, useNavigate } from "react-router-dom";
import { useGovFund } from "../../mock/store";
import { ProjectHeader } from "../../components/ProjectHeader";
import { ProposalList } from "../../components/ProposalList";
import { StagePanel } from "../../components/StagePanel";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { Progress } from "../../components/ui/Progress";
import { ArrowLeftIcon, VoteIcon } from "../../components/ui/icons";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  canCancel,
  canExpire,
  canFinalize,
  canFund,
  quorumNeeded,
  winnerProposal,
} from "../../mock/guards";
import { fmtNight } from "../../lib/format";
import { timeFromNow } from "../../lib/time";

export function MemberProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch, toast } = useGovFund();
  const navigate = useNavigate();

  const project = state.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<VoteIcon size={26} />}
          title="Project not found"
          body="It may have been removed from the demo snapshot."
          action={
            <Button variant="secondary" onClick={() => navigate("/member")}>
              Back to desk
            </Button>
          }
        />
      </div>
    );
  }

  const vote = (proposalId: string) => {
    dispatch({ type: "VOTE", projectId: project.id, proposalId });
    toast("Vote cast — recorded as a fresh nullifier.", "success");
  };

  const qNeeded = quorumNeeded(state);
  const quorumPct = Math.min(100, (project.totalVotes / qNeeded) * 100);

  return (
    <div>
      <Link
        to="/member"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={14} /> Back to member desk
      </Link>

      <ProjectHeader p={project} />

      {/* Quorum meter */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Vote quorum</h3>
          <span className="tabular text-[13px] text-muted">
            {project.totalVotes} of {qNeeded} votes
          </span>
        </div>
        <div className="mt-2">
          <Progress
            value={project.totalVotes}
            max={qNeeded}
            color={quorumPct >= 100 ? "var(--color-completed)" : "var(--color-voting)"}
            showLabel
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Proposals"
            subtitle={
              project.status === "Voting"
                ? project.voted
                  ? "You voted — nullifier prevents a second vote."
                  : state.now < project.deadline
                    ? "Cast one anonymous vote before the deadline."
                    : "Voting closed."
                : "Final bid list"
            }
          />
          {project.proposals.length === 0 ? (
            <EmptyState
              icon={<VoteIcon size={22} />}
              title="No proposals yet"
              body="Companies submit bids with a budget and stage schedule while voting is open."
            />
          ) : (
            <ProposalList project={project} onVote={project.status === "Voting" ? vote : undefined} />
          )}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <ActionPanel project={project} />
          <StagePanel project={project} role="member" />
          <VestingSummary project={project} />
        </div>
      </div>
    </div>
  );
}

function ActionPanel({ project }: { project: ReturnType<typeof useGovFund>["state"]["projects"][number] }) {
  const { state, dispatch, toast } = useGovFund();

  const next: {
    label: string;
    run?: () => void;
    variant?: "primary" | "secondary" | "danger";
    disabled?: boolean;
    note?: string;
  }[] = [];

  if (project.status === "Voting") {
    if (canFinalize(project, state)) {
      next.push({
        label: "Finalize selection",
        run: () => {
          dispatch({ type: "FINALIZE", projectId: project.id });
          toast("Winner selected. Awaiting reveal + funding.", "success");
        },
        note: "Quorum met — pick the plurality winner.",
      });
    } else if (canCancel(project, state)) {
      next.push({
        label: "Cancel project",
        variant: "danger",
        run: () => {
          dispatch({ type: "CANCEL", projectId: project.id });
          toast("Project cancelled. Collateral is refundable.", "info");
        },
        note: "Deadline passed without quorum — all collateral refundable.",
      });
    }
  }

  if (project.status === "Selected") {
    if (!project.winnerCompany) {
      next.push({
        label: "Waiting for reveal",
        variant: "secondary",
        disabled: true,
        note: "The winning company must open its identity before funding.",
      });
    } else if (canFund(project, state)) {
      next.push({
        label: "Fund project",
        run: () => {
          dispatch({ type: "FUND", projectId: project.id });
          toast("Budget deposited. Project is now in progress.", "success");
        },
        note: `Deposit the winner's budget (${project.budget > 0 ? fmtNight(project.budget) : "pending"}).`,
      });
    } else if (canExpire(project, state)) {
      next.push({
        label: "Expire funding",
        variant: "danger",
        run: () => {
          dispatch({ type: "EXPIRE", projectId: project.id });
          toast("Funding deadline missed — project cancelled.", "info");
        },
        note: "Funding deadline passed — cancel and refund collateral.",
      });
    }
  }

  if (next.length === 0) {
    return (
      <Card>
        <p className="text-[13px] text-muted">
          No action needed in this phase —{" "}
          {project.status === "Completed"
            ? "the project finished successfully."
            : project.status === "Cancelled"
              ? "the project was cancelled."
              : project.status === "Terminated"
                ? "the project was terminated."
                : "reviews are pending."}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader title="Next action" subtitle={timeFromNow(next[0].disabled ? project.deadline : project.status === "Voting" ? project.deadline : project.fundingDeadline, state.now)} />
      {next.map((a) => (
        <div key={a.label} className="space-y-2">
          <Button
            className="w-full"
            variant={a.variant ?? "primary"}
            disabled={a.disabled}
            onClick={a.run}
          >
            {a.label}
          </Button>
          {a.note ? <p className="text-[12px] text-muted">{a.note}</p> : null}
        </div>
      ))}
    </Card>
  );
}

function VestingSummary({ project }: { project: ReturnType<typeof useGovFund>["state"]["projects"][number] }) {
  const winner = winnerProposal(project);
  if (!winner) return null;
  const total = winner.budget;
  return (
    <Card>
      <CardHeader title="Vesting" subtitle="Milestone payments released by approval" />
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted">Released to winner</span>
        <span className="tabular font-semibold text-ink">{fmtNight(project.disbursed)}</span>
      </div>
      <div className="mt-2">
        <Progress
          value={project.disbursed}
          max={total}
          color="var(--color-completed)"
          showLabel
        />
      </div>
    </Card>
  );
}
