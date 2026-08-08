import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useGovFund } from "../../state/provider";
import { ProjectHeader } from "../../components/ProjectHeader";
import { ProposalList } from "../../components/ProposalList";
import { StagePanel } from "../../components/StagePanel";
import { SubmitProposalForm } from "../../components/SubmitProposalForm";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader } from "../../components/ui/Card";
import { EmptyState } from "../../components/ui/EmptyState";
import { ArrowLeftIcon, BuildingIcon, LockIcon } from "../../components/ui/icons";
import { canSubmitProposal, canWithdraw, isWinner, mineOf } from "../../state/guards";
import { fmtNight } from "../../lib/format";

export function CompanyProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { state, dispatch, toast } = useGovFund();
  const navigate = useNavigate();
  const [showSubmit, setShowSubmit] = useState(false);

  const project = state.projects.find((p) => p.id === id);
  if (!project) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<BuildingIcon size={26} />}
          title="Project not found"
          action={
            <Button variant="secondary" onClick={() => navigate("/company")}>
              Back to portal
            </Button>
          }
        />
      </div>
    );
  }

  const myProposal = project.proposals.find((pr) => mineOf(state, pr));
  const winner = project.proposals.find((pr) => isWinner(project, pr));
  const submitOpen = canSubmitProposal(project, state) && !myProposal;
  const canReveal =
    project.status === "Selected" &&
    winner !== undefined &&
    mineOf(state, winner) &&
    !project.winnerCompany &&
    !winner.revealed;

  const withdraw = (proposalId: string) => {
    const pr = project.proposals.find((p) => p.id === proposalId);
    if (!pr) return;
    dispatch({ type: "WITHDRAW_COLLATERAL", projectId: project.id, proposalId });
    toast(`Collateral of ${fmtNight(pr.collateral)} returned to your wallet.`, "success");
  };

  const reveal = () => {
    dispatch({ type: "REVEAL_COMPANY", projectId: project.id });
    toast("Identity revealed — the contract now knows the winner.", "success");
  };

  return (
    <div>
      <Link
        to="/company"
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeftIcon size={14} /> Back to company portal
      </Link>

      <ProjectHeader p={project} />

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {canReveal ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-selected/50 bg-selected-soft/60 p-4">
              <div className="flex items-center gap-3">
                <LockIcon size={18} className="text-selected" />
                <div>
                  <p className="text-sm font-semibold text-ink">Your bid won</p>
                  <p className="text-[12px] text-muted">
                    Open your commitment to receive the budget and start vesting.
                  </p>
                </div>
              </div>
              <Button onClick={reveal}>Reveal company</Button>
            </div>
          ) : null}

          {showSubmit || submitOpen ? (
            showSubmit ? (
              <SubmitProposalForm project={project} onDone={() => setShowSubmit(false)} />
            ) : (
              <div className="flex items-center justify-between rounded-2xl border border-dashed border-line-strong bg-panel/50 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink">Place a bid on this project</p>
                  <p className="text-[12px] text-muted">
                    Submit a budget and a stage schedule summing to it.
                  </p>
                </div>
                <Button onClick={() => setShowSubmit(true)}>Submit proposal</Button>
              </div>
            )
          ) : null}

          <Card>
            <CardHeader
              title="Proposals"
              subtitle={
                project.status === "Voting"
                  ? "Vote counts are public; who voted is hidden."
                  : "Final bid list"
              }
            />
            <ProposalList project={project} onWithdraw={withdraw} />
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <StagePanel project={project} role="company" />
          <MyBidStatus project={project} />
        </div>
      </div>
    </div>
  );
}

function MyBidStatus({ project }: { project: ReturnType<typeof useGovFund>["state"]["projects"][number] }) {
  const { state } = useGovFund();
  const mine = project.proposals.filter((pr) => mineOf(state, pr));
  if (mine.length === 0) {
    return (
      <Card>
        <CardHeader title="Your position" />
        <p className="text-[13px] text-muted">
          You haven't bid on this project yet.
          {project.status === "Voting" ? " Bids stay open until the voting deadline." : ""}
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Your position" />
      <ul className="space-y-2">
        {mine.map((pr) => {
          const isW = isWinner(project, pr);
          return (
            <li key={pr.id} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${pr.withdrawn ? "bg-cancelled" : isW ? "bg-selected" : "bg-progress"}`} />
                <span className="font-medium text-ink">{pr.id}</span>
                <span className="text-muted">{pr.voteCount} votes</span>
              </span>
              <span className="tabular text-muted">
                {pr.withdrawn
                  ? "collateral withdrawn"
                  : project.status === "Voting"
                    ? `collateral held · ${fmtNight(pr.collateral)}`
                    : isW
                      ? pr.revealed || project.winnerCompany
                        ? "winner — revealed"
                        : "winner — reveal pending"
                      : canWithdraw(project, pr)
                        ? "not selected — withdraw"
                        : "not selected"}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
