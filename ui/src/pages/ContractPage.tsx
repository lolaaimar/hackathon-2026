import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Field, Input } from '../components/ui/Field';
import { AlertIcon, CheckIcon, CubeIcon, SearchIcon } from '../components/ui/icons';
import { fmtNight } from '../lib/format';
import { fmtDate } from '../lib/time';
import { memberByAddress } from '../state/guards';
import { useGovFund } from '../state/provider';
import { getSelectedNetwork, SUPPORTED_NETWORKS } from '../wallet/selectWallet';

export function ContractPage() {
  const { state } = useGovFund();
  const navigate = useNavigate();
  const { contract, config } = state;

  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState<string | null>(null);

  if (!contract.deployed) {
    return (
      <div className="py-16">
        <EmptyState
          icon={<CubeIcon size={26} />}
          title="No contract to enter yet"
          body="Deploy the GovFund contract first, then find it here by address."
          action={
            <Link to="/deploy">
              <Button>
                <CubeIcon size={15} /> Deploy contract
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const networkLabel =
    SUPPORTED_NETWORKS.find((n) => n.id === contract.networkId)?.label ??
    contract.networkId ??
    getSelectedNetwork();

  const resolvedAddress = contract.address ?? '';
  const hasSearched = searched !== null;
  const submitted = hasSearched ? (searched ?? '') : query.trim();
  const found = !hasSearched || submitted === resolvedAddress;
  const me = memberByAddress(state, state.wallet.address);

  const enter = () => {
    if (state.role === 'company') navigate('/company');
    else if (state.role === 'member') navigate('/member');
    else navigate('/admin');
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink">Enter a contract</h1>
        <p className="mt-1 text-sm text-muted">
          Find the deployed GovFund contract by its address on {networkLabel}, then open it to
          interact.
        </p>
      </div>

      <Card className="mb-6">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setSearched(query.trim());
          }}
        >
          <Field label="Contract address" className="min-w-0 flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={resolvedAddress}
              aria-label="Contract address"
              className="font-mono"
            />
          </Field>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">
              <SearchIcon size={15} /> Find contract
            </Button>
          </div>
        </form>
        <p className="mt-2 text-[12px] text-muted">
          The demo contract lives at <span className="font-mono">{resolvedAddress}</span>. Enter
          that address and hit Find to locate it.
        </p>
      </Card>

      {!found ? (
        <Card>
          <div className="flex items-start gap-3">
            <AlertIcon size={17} className="mt-0.5 shrink-0 text-danger" />
            <div>
              <p className="text-sm font-semibold text-ink">Contract not found</p>
              <p className="mt-0.5 text-[13px] text-muted">
                No GovFund contract at{' '}
                <span className="font-mono text-[12px] text-body">{submitted || '…'}</span> on{' '}
                {networkLabel}. Check the address and try again.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="GovFund contract"
            subtitle={`Deployed ${fmtDate(contract.deployedAt ?? state.now)} on ${networkLabel}`}
          />
          <dl className="grid gap-3 text-[13px] sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted">Address</dt>
              <dd className="mt-0.5 break-all font-mono text-[12px] text-body">
                {contract.address}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Network</dt>
              <dd className="mt-0.5 font-medium text-ink">{networkLabel}</dd>
            </div>
            <div>
              <dt className="text-muted">Funding token</dt>
              <dd className="mt-0.5 font-medium text-ink">{config.fundingToken}</dd>
            </div>
            <div>
              <dt className="text-muted">Treasury</dt>
              <dd className="mt-0.5 break-all font-mono text-[12px] text-body">
                {config.treasury}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Deployer</dt>
              <dd className="mt-0.5 break-all font-mono text-[12px] text-body">
                {contract.deployerAddress ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Registered members</dt>
              <dd className="mt-0.5 tabular font-medium text-ink">{config.members.length}</dd>
            </div>
            <div>
              <dt className="text-muted">Quorum</dt>
              <dd className="mt-0.5 tabular font-medium text-ink">{config.quorumPercent}%</dd>
            </div>
            <div>
              <dt className="text-muted">Approvals / stage</dt>
              <dd className="mt-0.5 tabular font-medium text-ink">{config.approvalsRequired}</dd>
            </div>
            <div>
              <dt className="text-muted">Treasury pot</dt>
              <dd className="mt-0.5 tabular font-medium text-ink">{fmtNight(config.pot)}</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <div className="flex items-center gap-2 text-[13px]">
              {me ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 font-medium text-success">
                  <CheckIcon size={13} />
                  Registered member — {me.name}
                </span>
              ) : state.wallet.connected ? (
                <span className="text-muted">
                  Connected, but this address isn't in the member registry.
                </span>
              ) : (
                <span className="text-muted">
                  Guest mode — connect a wallet to prove membership.
                </span>
              )}
            </div>
            <Button onClick={enter} size="lg">
              <CubeIcon size={16} /> Enter contract
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
