import { useState } from "react";
import { useGovFund } from "../mock/store";
import { Button } from "./ui/Button";
import { Field, Input, Textarea } from "./ui/Field";
import { XIcon, PlusIcon } from "./ui/icons";
import { validateProposal } from "../lib/validation";
import type { ProjectInfo } from "../types";

export function SubmitProposalForm({ project, onDone }: { project: ProjectInfo; onDone?: () => void }) {
  const { state, dispatch, toast } = useGovFund();
  const [budget, setBudget] = useState("");
  const [collateral, setCollateral] = useState(String(project.collateralRequired));
  const [description, setDescription] = useState("");
  const [stages, setStages] = useState<{ title: string; amount: string }[]>([
    { title: "", amount: "" },
    { title: "", amount: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const updateStage = (i: number, patch: Partial<{ title: string; amount: string }>) => {
    setStages((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
  };

  const addStage = () => setStages((s) => [...s, { title: "", amount: "" }]);
  const removeStage = (i: number) => setStages((s) => s.filter((_, idx) => idx !== i));

  const parsed = () => {
    const budgetN = Number(budget);
    const collateralN = Number(collateral);
    const parsedStages = stages.map((s, i) => ({
      title: s.title.trim() || `Stage ${i + 1}`,
      amount: Number(s.amount),
    }));
    const errorMsg = validateProposal(
      budgetN,
      parsedStages.map((s) => ({ title: s.title, description: "", amount: s.amount })),
      collateralN,
      project.collateralRequired
    );
    return { budgetN, collateralN, parsedStages, errorMsg };
  };

  const remaining = (() => {
    const { budgetN, parsedStages } = parsed();
    const sum = parsedStages.reduce((acc, s) => acc + (Number.isFinite(s.amount) ? s.amount : 0), 0);
    return Number.isFinite(budgetN) ? budgetN - sum : null;
  })();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { budgetN, collateralN, parsedStages, errorMsg } = parsed();
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    dispatch({
      type: "SUBMIT_PROPOSAL",
      projectId: project.id,
      input: {
        companyName: state.demoCompany,
        description: description.trim(),
        budget: budgetN,
        collateral: collateralN,
        stages: parsedStages.map((s) => ({ title: s.title, description: "", amount: s.amount })),
      },
    });
    toast("Proposal submitted — identity hidden behind a commitment.", "success");
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-5">
      <h3 className="text-[15px] font-semibold text-ink">Submit a proposal</h3>
      <p className="mt-0.5 text-[13px] text-muted">
        Your identity stays hidden; you open it only if you win.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Total budget (NIGHT)" hint="Must equal the sum of all stages">
          <Input
            type="number"
            min={1}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="e.g. 900000"
            required
          />
        </Field>
        <Field
          label="Collateral (NIGHT)"
          hint={`Required: ${project.collateralRequired} NIGHT`}
        >
          <Input
            type="number"
            min={0}
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
            required
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Proposal description" hint="Explain why your bid deserves the grant">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your approach, timeline, and qualifications..."
            rows={4}
          />
        </Field>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-medium text-body">Stage schedule</span>
          <Button type="button" size="sm" variant="ghost" onClick={addStage}>
            <PlusIcon size={13} /> Add stage
          </Button>
        </div>
        <div className="space-y-2">
          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-panel text-[12px] font-semibold text-muted">
                {i + 1}
              </span>
              <Input
                value={s.title}
                onChange={(e) => updateStage(i, { title: e.target.value })}
                placeholder={`Stage ${i + 1} title`}
                aria-label={`Stage ${i + 1} title`}
              />
              <Input
                type="number"
                min={0}
                value={s.amount}
                onChange={(e) => updateStage(i, { amount: e.target.value })}
                placeholder="amount"
                className="w-32"
                aria-label={`Stage ${i + 1} amount`}
              />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={stages.length <= 1}
                onClick={() => removeStage(i)}
                aria-label={`Remove stage ${i + 1}`}
              >
                <XIcon size={14} />
              </Button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted">
          Stage sum:{" "}
          <span className={`tabular font-medium ${remaining === 0 ? "text-success" : remaining !== null && remaining !== 0 ? "text-warning" : ""}`}>
            {remaining === null ? "—" : `${remaining} remaining`}
          </span>
        </p>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg bg-terminated-soft px-3 py-2 text-[12px] text-danger">{error}</p>
      ) : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Submit bid</Button>
      </div>
    </form>
  );
}
