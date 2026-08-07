import { useState } from "react";
import { useGovFund } from "../mock/store";
import { Button } from "./ui/Button";
import { Field, Input, Textarea } from "./ui/Field";
import { addDays } from "../lib/time";

export function CreateProjectForm({ onDone }: { onDone?: () => void }) {
  const { state, dispatch, toast } = useGovFund();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [votingDays, setVotingDays] = useState("7");
  const [fundingDays, setFundingDays] = useState("14");
  const [collateral, setCollateral] = useState("10000");
  const [maxRejections, setMaxRejections] = useState("2");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const voting = Number(votingDays);
    const funding = Number(fundingDays);
    const collateralN = Number(collateral);
    const rejections = Number(maxRejections);

    if (!title.trim()) return setError("Give the project a title.");
    if (!Number.isFinite(voting) || voting < 0) return setError("Voting deadline must be today or later.");
    if (!Number.isFinite(funding) || funding <= voting)
      return setError("Funding deadline must come after the voting deadline.");
    if (!Number.isFinite(collateralN) || collateralN < 0)
      return setError("Collateral required must be a non-negative amount.");
    if (!Number.isFinite(rejections) || rejections < 1)
      return setError("Max stage rejections must be at least 1.");

    const now = state.now;
    dispatch({
      type: "CREATE_PROJECT",
      input: {
        title: title.trim(),
        description: description.trim(),
        deadline: addDays(now, voting),
        fundingDeadline: addDays(now, funding),
        collateralRequired: collateralN,
        maxStageRejections: rejections,
      },
    });
    toast("Project opened — now accepting proposals.", "success");
    setTitle("");
    setDescription("");
    onDone?.();
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-white p-5">
      <h3 className="text-[15px] font-semibold text-ink">Open a new procurement project</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Street lighting retrofit"
            required
          />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Scope, goals, constraints…"
            rows={3}
          />
        </Field>
        <Field label="Voting deadline (days)" hint="Proposals + votes close here">
          <Input
            type="number"
            min={0}
            value={votingDays}
            onChange={(e) => setVotingDays(e.target.value)}
          />
        </Field>
        <Field label="Funding deadline (days)" hint="Winner must be funded by here">
          <Input
            type="number"
            min={1}
            value={fundingDays}
            onChange={(e) => setFundingDays(e.target.value)}
          />
        </Field>
        <Field label="Collateral required (NIGHT)">
          <Input
            type="number"
            min={0}
            value={collateral}
            onChange={(e) => setCollateral(e.target.value)}
          />
        </Field>
        <Field label="Max stage rejections">
          <Input
            type="number"
            min={1}
            value={maxRejections}
            onChange={(e) => setMaxRejections(e.target.value)}
          />
        </Field>
      </div>
      {error ? (
        <p className="mt-3 rounded-lg bg-terminated-soft px-3 py-2 text-[12px] text-danger">{error}</p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit">Open project</Button>
      </div>
    </form>
  );
}
