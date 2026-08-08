import type { ProjectInfo } from "../types";
import { useGovFund } from "../state/provider";
import { Button } from "./ui/Button";
import { Progress } from "./ui/Progress";
import { CheckIcon, ScaleIcon, XIcon } from "./ui/icons";
import { fmtNight } from "../lib/format";
import {
  canRequestPayment,
  canReviewStage,
  canTerminate,
  quorumNeeded,
  winnerProposal,
} from "../state/guards";
import type { Role } from "../types";

export function StagePanel({ project, role }: { project: ProjectInfo; role: Role }) {
  const { state, dispatch, toast } = useGovFund();
  const winner = winnerProposal(project);
  if (!winner || (project.status !== "InProgress" && project.status !== "Completed" && project.status !== "Terminated")) {
    return null;
  }

  const totalStages = winner.stages.length;
  const current = project.currentStage;
  const reviews = project.reviews[project.stageAttempt] ?? [];
  const approvals = reviews.filter((r) => r.action === "approve");
  const maxReached = project.stageRejections >= project.maxStageRejections;

  const approve = () => {
    dispatch({ type: "APPROVE_STAGE", projectId: project.id });
    toast("Stage approved.", "success");
  };
  const reject = () => {
    dispatch({ type: "REJECT_STAGE", projectId: project.id });
    toast("Stage rejected. Winner may retry.", "info");
  };
  const requestPayment = () => {
    dispatch({ type: "REQUEST_PAYMENT", projectId: project.id });
    toast("Payment requested for the current stage.", "success");
  };
  const voteTerminate = () => {
    dispatch({ type: "VOTE_TERMINATE", projectId: project.id });
    toast("Termination vote recorded.", "success");
  };

  const reviewOk = role === "member" && canReviewStage(project);
  const requestOk = role === "company" && canRequestPayment(project);
  const terminateOk = role === "member" && canTerminate(project);

  return (
    <div className="rounded-2xl border border-line bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Stage {current + 1} of {totalStages}</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            {winner.stages[current]?.title ?? "All stages complete"}
          </p>
        </div>
        <span className="tabular text-lg font-bold text-ink">
          {fmtNight(winner.stages[current]?.amount ?? 0)}
        </span>
      </div>

      <ol className="mt-5 space-y-2">
        {winner.stages.map((s, i) => {
          const done = i < current || project.status === "Completed";
          const isCurrent = i === current && project.status === "InProgress";
          return (
            <li key={i} className="flex items-center gap-3">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                style={{
                  backgroundColor: done
                    ? "var(--color-completed)"
                    : isCurrent
                      ? "var(--color-progress)"
                      : "var(--color-panel-strong)",
                  color: done || isCurrent ? "#fff" : "var(--color-muted)",
                }}
              >
                {done ? <CheckIcon size={11} /> : i + 1}
              </span>
              <span
                className={`flex-1 text-[13px] ${isCurrent ? "font-semibold text-ink" : done ? "text-body" : "text-muted"}`}
              >
                {s.title}
              </span>
              <span className="tabular text-[12px] text-muted">{fmtNight(s.amount)}</span>
            </li>
          );
        })}
      </ol>

      {project.status === "InProgress" ? (
        <div className="mt-5 rounded-xl bg-panel p-4">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-body">
              {project.stagePending
                ? "Awaiting reviewer approval"
                : maxReached
                  ? "Max rejections reached — stage blocked"
                  : "Awaiting payment request"}
            </span>
            <span className="tabular text-muted">
              {project.stageApprovals}/{state.config.approvalsRequired} approvals
            </span>
          </div>
          <div className="mt-2">
            <Progress
              value={project.stagePending ? project.stageApprovals : 0}
              max={state.config.approvalsRequired}
              color="var(--color-progress)"
              showLabel
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
            <span>
              Rejections:{" "}
              <span className="tabular font-medium">
                {project.stageRejections}/{project.maxStageRejections}
              </span>
            </span>
            {approvals.length > 0 ? (
              <span>{approvals.length} member(s) approved this attempt</span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {reviewOk ? (
              <>
                <Button size="sm" variant="success" onClick={approve}>
                  <CheckIcon size={14} /> Approve
                </Button>
                <Button size="sm" variant="danger" onClick={reject}>
                  <XIcon size={14} /> Reject
                </Button>
              </>
            ) : null}
            {requestOk ? (
              <Button size="sm" onClick={requestPayment}>
                Request payment
              </Button>
            ) : null}
            {role === "company" && project.stagePending ? (
              <span className="text-[12px] text-muted">Waiting for reviewers…</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {project.status === "InProgress" ? (
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[12px] text-muted">
              <ScaleIcon size={15} className="text-terminated" />
              <span>
                Terminate votes:{" "}
                <span className="tabular font-semibold text-ink">
                  {project.terminateVotes}/{quorumNeeded(state)}
                </span>
              </span>
            </div>
            {terminateOk ? (
              <Button size="sm" variant="danger" onClick={voteTerminate}>
                Vote to terminate
              </Button>
            ) : project.terminateVoted ? (
              <span className="text-[12px] font-medium text-muted">You voted to terminate</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
