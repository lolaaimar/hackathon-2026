import { useState } from 'react';
import { useGovFund } from '../state/provider';
import { Button } from './ui/Button';
import { Field, Input, Textarea } from './ui/Field';

export function CreateProjectForm({ onDone }: { onDone?: () => void }) {
  const { dispatch, toast } = useGovFund();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [collateral, setCollateral] = useState('10000');
  const [maxRejections, setMaxRejections] = useState('2');
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const collateralN = Number(collateral);
    const rejections = Number(maxRejections);

    if (!title.trim()) return setError('Give the project a title.');
    if (!Number.isFinite(collateralN) || collateralN < 0)
      return setError('Collateral required must be a non-negative amount.');
    if (!Number.isFinite(rejections) || rejections < 1)
      return setError('Max stage rejections must be at least 1.');

    dispatch({
      type: 'CREATE_PROJECT',
      input: {
        title: title.trim(),
        description: description.trim(),
        collateralRequired: collateralN,
        maxStageRejections: rejections,
      },
    });
    toast('Project opened — now accepting proposals.', 'success');
    setTitle('');
    setDescription('');
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
        <p className="mt-3 rounded-lg bg-terminated-soft px-3 py-2 text-[12px] text-danger">
          {error}
        </p>
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
