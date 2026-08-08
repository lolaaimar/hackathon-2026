import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { shortAddr } from '../lib/format';
import { useGovFund } from '../state/provider';
import { Button } from './ui/Button';
import { ConfigModal } from './ui/ConfigModal';
import { CubeIcon, LogOutIcon, SettingsIcon, ShieldIcon, WalletIcon } from './ui/icons';
import { ToastStack } from './ui/ToastStack';

export function AppShell() {
  const { state, setRole } = useGovFund();
  const navigate = useNavigate();
  const [showConfig, setShowConfig] = useState(false);

  const handleLogout = () => {
    setRole(null);
    navigate('/login');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-sticky border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <NavLink to="/deploy" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-600 text-white">
              <ShieldIcon size={16} />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-ink">GovFund</span>
          </NavLink>

          {state.contract.deployed ? (
            <NavLink
              to="/contract"
              className={({ isActive }) =>
                `flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-muted hover:bg-panel hover:text-ink'
                }`
              }
            >
              <CubeIcon size={14} />
              <span className="hidden md:inline">Contract</span>
            </NavLink>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <RoleSwitcher />
            <WalletChip />
            <Button size="sm" variant="ghost" onClick={handleLogout}>
              <LogOutIcon size={14} />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <button
        type="button"
        onClick={() => setShowConfig(true)}
        className="fixed bottom-4 left-4 z-toast flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white/95 px-3 text-[12px] font-medium text-body shadow-lg shadow-ink/10 backdrop-blur transition-colors hover:border-primary-600 hover:text-ink"
        title="Config"
        aria-label="Open config"
      >
        <SettingsIcon size={15} className="text-muted" />
        Config
      </button>
      <ToastStack />
      <ConfigModal open={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  );
}

function RoleSwitcher() {
  const { state, setRole } = useGovFund();
  const navigate = useNavigate();

  const zones: { key: 'admin' | 'member' | 'company'; label: string; to: string }[] = [
    { key: 'admin', label: 'Admin', to: '/admin' },
    { key: 'member', label: 'Member', to: '/member' },
    { key: 'company', label: 'Company', to: '/company' },
  ];

  return (
    <fieldset
      className="flex min-w-0 items-center gap-0.5 rounded-lg border border-line bg-panel p-0.5"
      aria-label="Demo user"
    >
      {zones.map((z) => {
        const active = state.role === z.key;
        return (
          <button
            key={z.key}
            type="button"
            onClick={() => {
              setRole(z.key);
              navigate(z.to);
            }}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
              active ? 'bg-primary-600 text-white' : 'text-muted hover:bg-bg hover:text-ink'
            }`}
          >
            {z.label}
          </button>
        );
      })}
    </fieldset>
  );
}

function WalletChip() {
  const { state, dispatch } = useGovFund();
  if (state.wallet.connected && state.wallet.address) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5">
        <WalletIcon size={14} className="text-success" />
        <span className="text-[12px] font-medium text-body">{shortAddr(state.wallet.address)}</span>
        <button
          type="button"
          onClick={() => dispatch({ type: 'WALLET_DISCONNECTED' })}
          className="text-muted transition-colors hover:text-ink"
          title="Disconnect wallet"
          aria-label="Disconnect wallet"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    );
  }
  return (
    <NavLink
      to="/login"
      className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[12px] font-medium text-muted transition-colors hover:bg-panel hover:text-ink"
    >
      <WalletIcon size={14} />
      Connect
    </NavLink>
  );
}
