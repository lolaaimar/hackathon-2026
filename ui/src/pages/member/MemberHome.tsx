import { useState } from "react";
import { useGovFund } from "../../state/provider";
import { ProjectCard } from "../../components/ProjectCard";
import { CreateProjectForm } from "../../components/CreateProjectForm";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Stat } from "../../components/ui/Card";
import { PlusIcon, UsersIcon } from "../../components/ui/icons";
import { quorumNeeded } from "../../state/guards";
import type { ProjectStatus } from "../../types";

const FILTERS: ("All" | ProjectStatus)[] = [
  "All",
  "Voting",
  "Selected",
  "InProgress",
  "Completed",
  "Terminated",
];

export function MemberHome() {
  const { state } = useGovFund();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const projects = state.projects.filter(
    (p) => filter === "All" || p.status === filter
  );
  const active = state.projects.filter(
    (p) => p.status === "Voting" || p.status === "Selected" || p.status === "InProgress"
  );

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Government member desk</h1>
          <p className="mt-1 text-sm text-muted">
            Open projects, vote anonymously, and review milestone stages.
          </p>
        </div>
        <Button onClick={() => setShowCreate((v) => !v)}>
          <PlusIcon size={15} /> New project
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Active projects" value={active.length} />
        <Stat label="Quorum" value={`${state.config.quorumPercent}%`} hint={`${quorumNeeded(state)} of ${state.config.members.length} members`} />
        <Stat label="Approvals / stage" value={state.config.approvalsRequired} />
      </div>

      {showCreate ? (
        <div className="mt-6">
          <CreateProjectForm onDone={() => setShowCreate(false)} />
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-1" role="tablist" aria-label="Filter projects">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              filter === f
                ? "bg-ink text-white"
                : "bg-panel text-body hover:bg-panel-strong"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<UsersIcon size={26} />}
            title="No projects in this state"
            body="Switch filters or open a new procurement project above."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.id} p={p} now={state.now} to={`/member/projects/${p.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
