import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGovFund } from "../mock/store";
import { getSelectedNetwork, SUPPORTED_NETWORKS } from "../wallet/selectWallet";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field, Input, Select } from "../components/ui/Field";
import {
  BuildingIcon,
  CheckIcon,
  CubeIcon,
  UsersIcon,
} from "../components/ui/icons";
import { fmtDate } from "../lib/time";

export function DeployPage() {
  const { state, dispatch, toast } = useGovFund();
  const navigate = useNavigate();
  const { config, contract } = state;

  const [quorum, setQuorum] = useState(String(config.quorumPercent));
  const [approvals, setApprovals] = useState(String(config.approvalsRequired));

  const deployed = contract.deployed;
  const networkLabel =
    SUPPORTED_NETWORKS.find((n) => n.id === getSelectedNetwork())?.label ??
    getSelectedNetwork();

  const deploy = () => {
    const q = Number(quorum);
    const a = Number(approvals);
    if (!Number.isFinite(q) || q < 1 || q > 100) {
      toast("Quorum percent must be between 1 and 100.", "error");
      return;
    }
    if (!Number.isFinite(a) || a < 1 || a > 100) {
      toast("Approvals required must be between 1 and 100.", "error");
      return;
    }
    dispatch({
      type: "CONTRACT_DEPLOY",
      networkId: getSelectedNetwork(),
      fundingToken: "NIGHT",
      quorumPercent: q,
      approvalsRequired: a,
    });
    toast(`Contract deployed to ${networkLabel}.`, "success");
    navigate("/gov");
  };

  const deployerAddress =
    contract.deployed
      ? (contract.deployerAddress ?? "unknown")
      : (state.wallet.address ?? "a simulated demo address");

  if (deployed) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-ink">GovFund is live</h1>
          <p className="mt-1 text-sm text-muted">
            Choose where to go next. Government members run projects; companies bid on them.
          </p>
        </div>

        <div className="mb-6 rounded-2xl border border-success/40 bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-completed-soft text-completed">
              <CheckIcon size={18} />
            </span>
            <div>
              <h3 className="text-[15px] font-semibold text-ink">Contract deployed</h3>
              <p className="text-[12px] text-muted">
                Live on {contract.networkId} · {fmtDate(contract.deployedAt ?? state.now)}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted">Address</dt>
              <dd className="mt-0.5 truncate font-mono text-[12px] text-body">{contract.address}</dd>
            </div>
            <div>
              <dt className="text-muted">Deployer</dt>
              <dd className="mt-0.5 truncate font-mono text-[12px] text-body">
                {contract.deployerAddress ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Quorum</dt>
              <dd className="mt-0.5 tabular font-medium text-ink">
                {config.quorumPercent}%
              </dd>
            </div>
            <div>
              <dt className="text-muted">Approvals / stage</dt>
              <dd className="mt-0.5 tabular font-medium text-ink">
                {config.approvalsRequired}
              </dd>
            </div>
          </dl>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Link to="/gov">
            <Card className="h-full transition-all duration-150 hover:border-primary-600/50 hover:shadow-lg hover:shadow-ink/5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                  <UsersIcon size={20} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">Government desk</h3>
                  <p className="text-[12px] text-muted">
                    Create projects, vote, review stages, manage members.
                  </p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/company">
            <Card className="h-full transition-all duration-150 hover:border-primary-600/50 hover:shadow-lg hover:shadow-ink/5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                  <BuildingIcon size={20} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">Company portal</h3>
                  <p className="text-[12px] text-muted">
                    Submit bids, deposit collateral, request milestone payments.
                  </p>
                </div>
              </div>
            </Card>
          </Link>
          <Link to="/contract">
            <Card className="h-full transition-all duration-150 hover:border-primary-600/50 hover:shadow-lg hover:shadow-ink/5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                  <CubeIcon size={20} />
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink">Enter a contract</h3>
                  <p className="text-[12px] text-muted">
                    Find the deployed contract and interact with it.
                  </p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-600 text-white">
          <CubeIcon size={24} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Deploy the GovFund contract</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted">
          One contract manages many projects. Set the parameters, then deploy once — the
          Government desk and Company portal open after.
        </p>
      </div>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            deploy();
          }}
        >
          <Field label="Funding token" hint="The shielded token used to fund projects.">
            <Select value="NIGHT" aria-label="Funding token" disabled>
              <option value="NIGHT">NIGHT</option>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Quorum (%)"
              hint="Percent of members that must vote."
            >
              <Input
                type="number"
                min={1}
                max={100}
                value={quorum}
                onChange={(e) => setQuorum(e.target.value)}
                aria-label="Quorum percent"
              />
            </Field>
            <Field
              label="Approvals / stage"
              hint={`Reviewers that must approve each milestone stage.`}
            >
              <Input
                type="number"
                min={1}
                max={100}
                value={approvals}
                onChange={(e) => setApprovals(e.target.value)}
                aria-label="Approvals required per stage"
              />
            </Field>
          </div>

          <p className="rounded-lg bg-panel px-3 py-2 text-[12px] leading-5 text-muted">
            You deploy as <span className="font-mono">{deployerAddress}</span>. This address
            is registered as the first member (Admin) and is the only one that can add or
            remove members after deployment.
          </p>

          <p className="rounded-lg bg-panel px-3 py-2 text-[12px] leading-5 text-muted">
            Deploys to {networkLabel}. Network is set in Config (bottom-left).
          </p>

          <p className="rounded-lg bg-warning/10 px-3 py-2 text-[12px] leading-5 text-warning">
            The registry starts with the Admin as its first member. Add more members from the
            Admin console after deploying, and keep approvals per stage at or below the member
            count so stages can be approved.
          </p>

          <Button type="submit" className="w-full" size="lg">
            <CubeIcon size={16} /> Deploy contract
          </Button>
        </form>
      </Card>
    </div>
  );
}
