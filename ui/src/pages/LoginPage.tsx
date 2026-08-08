import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGovFund } from "../state/provider";
import {
  connectWallet,
  getSelectedNetwork,
  listWallets,
  type WalletDescriptor,
} from "../wallet/selectWallet";
import { Button } from "../components/ui/Button";
import { NetworkPicker } from "../components/ui/NetworkPicker";
import {
  BuildingIcon,
  LockIcon,
  RefreshIcon,
  ShieldIcon,
  UsersIcon,
  VoteIcon,
} from "../components/ui/icons";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "../lib/roles";
import type { Role } from "../types";

const DEMO_ROLES: { role: Role; icon: React.ReactNode; blurb: string }[] = [
  {
    role: "admin",
    icon: <ShieldIcon size={20} />,
    blurb: ROLE_DESCRIPTIONS.admin,
  },
  {
    role: "member",
    icon: <UsersIcon size={20} />,
    blurb: ROLE_DESCRIPTIONS.member,
  },
  {
    role: "company",
    icon: <BuildingIcon size={20} />,
    blurb: ROLE_DESCRIPTIONS.company,
  },
];

export function LoginPage() {
  const { dispatch, toast, setRole } = useGovFund();
  const navigate = useNavigate();

  const [wallets, setWallets] = useState<WalletDescriptor[]>(() =>
    listWallets(),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const enterAs = (role: Role) => {
    setRole(role);
    navigate("/deploy");
  };

  const handleConnect = async (w: WalletDescriptor) => {
    setBusy(w.rdns);
    setError(null);
    try {
      const { api, address, networkId } = await connectWallet(
        w.api,
        getSelectedNetwork(),
      );
      dispatch({
        type: "WALLET_CONNECTED",
        walletName: w.name,
        address,
        networkId,
        api,
      });
      toast(`Connected to ${w.name}.`, "success");
      enterAs("member");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      dispatch({ type: "WALLET_ERROR", error: msg });
      toast("Wallet connection failed.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary-800 p-10 text-white lg:flex">
        <div className="relative z-10 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <ShieldIcon size={20} />
          </span>
          <span className="text-lg font-bold tracking-tight">GovFund</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance">
            Private procurement, publicly verifiable.
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-white/75">
            One contract manages many government projects. Companies bid
            anonymously, members vote in secret, and funds release stage by
            stage as milestones pass.
          </p>
          <ul className="mt-8 space-y-3 text-[14px]">
            {[
              {
                icon: <VoteIcon size={17} />,
                text: "Anonymous voting — counts are public, identities hidden.",
              },
              {
                icon: <LockIcon size={17} />,
                text: "Proposer privacy — identity revealed only to get funded.",
              },
              {
                icon: <BuildingIcon size={17} />,
                text: "Stage-based vesting with reviewer approval.",
              },
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-white/90">
                <span className="text-white/70">{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-[12px] text-white/50">
          Hackathon build
        </p>
      </aside>

      <section className="flex items-center justify-center bg-bg p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600 text-white">
                <ShieldIcon size={20} />
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">
                GovFund
              </span>
            </div>
          </div>

          <h2 className="text-xl font-bold text-ink">
            Connect your Midnight wallet
          </h2>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              Required to prove who you are on-chain.
            </p>
            <NetworkPicker label="Network" />
          </div>

          <div className="mt-5">
            {wallets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong bg-panel/50 p-5 text-center">
                <p className="text-sm font-medium text-ink">
                  No Midnight wallet detected
                </p>
                <p className="mt-1 text-[13px] text-muted">
                  Install a DApp Connector wallet extension (e.g. Lace or 1AM)
                  and refresh this page.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => setWallets(listWallets())}
                >
                  <RefreshIcon size={14} />
                  Refresh
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {wallets.map((w) => (
                  <li key={w.rdns}>
                    <button
                      onClick={() => handleConnect(w)}
                      disabled={busy !== null}
                      className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 text-left transition-colors hover:border-primary-600 hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {w.icon ? (
                        <img
                          src={w.icon}
                          alt=""
                          className="h-7 w-7 rounded-lg"
                        />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-panel-strong text-muted">
                          <UsersIcon size={16} />
                        </span>
                      )}
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-ink">
                          {w.name}
                        </span>
                        <span className="block text-[12px] text-muted">
                          {busy === w.rdns
                            ? "Awaiting authorization…"
                            : "Click to authorize"}
                        </span>
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={busy === w.rdns}
                      >
                        Connect
                      </Button>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {error ? (
              <p className="mt-3 rounded-lg bg-terminated-soft px-3 py-2 text-[12px] text-danger">
                {error}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex items-center gap-3 text-[12px] text-muted">
            <span className="h-px flex-1 bg-line" />
            or continue without a wallet
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            {DEMO_ROLES.map(({ role, icon, blurb }) => (
              <button
                key={role}
                onClick={() => enterAs(role)}
                className="group flex flex-col items-start gap-2 rounded-xl border border-line bg-white p-4 text-left transition-colors hover:border-primary-600 hover:bg-primary-50"
              >
                <span className="text-primary-700">{icon}</span>
                <span>
                  <span className="block text-sm font-semibold text-ink">
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted">
                    {blurb}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <p className="mt-5 rounded-lg bg-panel px-3 py-2 text-[12px] text-muted">
            Demo roles simulate on-chain identities locally; nothing is
            broadcast.
          </p>
        </div>
      </section>
    </div>
  );
}
