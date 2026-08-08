import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, Stat } from '../../components/ui/Card';
import { Field, Input } from '../../components/ui/Field';
import { AlertIcon, UsersIcon, XIcon } from '../../components/ui/icons';
import { shortAddr } from '../../lib/format';
import { fmtDate } from '../../lib/time';
import { isDeployer, quorumMet, quorumNeeded } from '../../state/guards';
import { useGovFund } from '../../state/provider';

export function AdminHome() {
  const { state, dispatch, toast } = useGovFund();
  const { config } = state;
  const deployer = isDeployer(state);

  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const addMember = () => {
    const name = newName.trim();
    const address = newAddress.trim();
    if (!name) {
      toast('Enter a member name.', 'error');
      return;
    }
    if (!address) {
      toast("Enter the member's address.", 'error');
      return;
    }
    if (config.members.some((m) => m.address.toLowerCase() === address.toLowerCase())) {
      toast('That address is already registered.', 'error');
      return;
    }
    dispatch({ type: 'ADD_MEMBER', name, address });
    setNewName('');
    setNewAddress('');
    toast(`Member ${name} added to the registry.`, 'success');
  };

  const removeMember = (id: string, name: string) => {
    const remaining = config.members.length - 1;
    if (remaining < config.approvalsRequired) {
      toast(
        `Cannot remove: approvalsRequired (${config.approvalsRequired}) would be unreachable with ${remaining} members.`,
        'error',
      );
      return;
    }
    if (!quorumMet(state, remaining)) {
      toast(
        `Cannot remove: quorum (${config.quorumPercent}%) would be unreachable with ${remaining} members.`,
        'error',
      );
      return;
    }
    dispatch({ type: 'REMOVE_MEMBER', id });
    toast(`${name} revoked from the registry.`, 'success');
  };

  const removalHint = useMemo(() => {
    return removeGuardHints(state);
  }, [state]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Admin console</h1>
          <p className="mt-1 text-sm text-muted">
            Manage the government member registry. Quorum and stage approvals are fixed at deploy
            time.
          </p>
        </div>
      </div>

      {!deployer ? (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <AlertIcon size={17} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="text-sm font-semibold text-ink">
              Only the deployer can change the member registry
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              The deployer recorded at deploy time is{' '}
              <span className="font-mono text-[12px] text-body">
                {shortAddr(state.contract.deployerAddress ?? 'unknown')}
              </span>
              .{' '}
              {state.wallet.connected
                ? `You are connected as ${shortAddr(state.wallet.address ?? '')}.`
                : 'Connect the deployer wallet to unlock registry management.'}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Members" value={config.members.length} hint="active in registry" />
        <Stat
          label="Quorum"
          value={`${config.quorumPercent}%`}
          hint={`${quorumNeeded(state)} votes needed`}
        />
        <Stat
          label="Approvals / stage"
          value={config.approvalsRequired}
          hint="reviewers required"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Member registry"
            subtitle={`${config.members.length} members · identities stored as Merkle-tree commitments`}
          />
          <form
            className="mb-4 grid gap-2 sm:grid-cols-[1fr_1.4fr_auto]"
            onSubmit={(e) => {
              e.preventDefault();
              addMember();
            }}
          >
            <Field label="Name" className="min-w-0">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. J. Delgado"
                aria-label="New member name"
                disabled={!deployer}
              />
            </Field>
            <Field label="Address" className="min-w-0">
              <Input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="e.g. 0x1a2b… (Midnight shielded address)"
                aria-label="New member address"
                disabled={!deployer}
                className="font-mono"
              />
            </Field>
            <div className="flex items-end">
              <Button type="submit" disabled={!deployer}>
                <UsersIcon size={15} /> Add
              </Button>
            </div>
          </form>

          <ul className="divide-y divide-line">
            {config.members.map((m, i) => {
              const blocked =
                !deployer ||
                config.members.length - 1 < config.approvalsRequired ||
                !quorumMet(state, config.members.length - 1);
              return (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-strong text-[12px] font-bold text-muted">
                    {m.name
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                    <p className="truncate font-mono text-[11px] text-muted">
                      {m.address ? shortAddr(m.address) : 'no address'} · leaf {i + 1} ·{' '}
                      {m.commit.slice(0, 10)}…
                    </p>
                  </div>
                  <span className="hidden text-[11px] text-muted sm:block">
                    added {fmtDate(m.addedAt)}
                  </span>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={blocked}
                    title={
                      !deployer
                        ? 'Only the deployer can revoke membership'
                        : blocked
                          ? (removalHint ?? 'Revoke membership')
                          : 'Revoke membership'
                    }
                    onClick={() => removeMember(m.id, m.name)}
                  >
                    <XIcon size={13} /> Remove
                  </Button>
                </li>
              );
            })}
          </ul>
          {config.members.length === 0 ? (
            <p className="mt-2 rounded-lg bg-panel px-3 py-2 text-[12px] text-muted">
              No members registered besides the Admin deployer. Add the first reviewer with the form
              above.
            </p>
          ) : null}
          {removalHint ? (
            <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-[12px] text-warning">
              Some members can't be removed yet: {removalHint.toLowerCase()}
            </p>
          ) : null}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Contract thresholds" subtitle="Fixed at deploy time by the Admin" />
            <dl className="grid grid-cols-2 gap-3 text-[13px]">
              <div>
                <dt className="text-muted">Quorum</dt>
                <dd className="mt-0.5 tabular font-semibold text-ink">{config.quorumPercent}%</dd>
              </div>
              <div>
                <dt className="text-muted">Approvals / stage</dt>
                <dd className="mt-0.5 tabular font-semibold text-ink">
                  {config.approvalsRequired}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-[12px] leading-5 text-muted">
              These were sealed in the constructor when the contract was deployed. To change them,
              redeploy the GovFund contract.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function removeGuardHints(state: ReturnType<typeof useGovFund>['state']): string | null {
  const remaining = state.config.members.length - 1;
  if (remaining < state.config.approvalsRequired) {
    return `Removal would leave ${remaining} members — below the approvals threshold (${state.config.approvalsRequired}).`;
  }
  if (!quorumMet(state, remaining)) {
    return `Removal would leave ${remaining} members — below quorum (${state.config.quorumPercent}%).`;
  }
  return null;
}
