import { useEffect, useState } from 'react';
import { useGovFund } from '../../state/provider';
import { Button } from './Button';
import { RefreshIcon } from './icons';
import { Modal } from './Modal';
import { NetworkPicker } from './NetworkPicker';

const STATE_KEY = 'govfund.app.v1';
const NETWORK_KEY = 'govfund.networkId';

export function ConfigModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { reset, toast } = useGovFund();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) setConfirming(false);
  }, [open]);

  const restart = () => {
    try {
      localStorage.removeItem(STATE_KEY);
      localStorage.removeItem(NETWORK_KEY);
    } catch {
      // Storage unavailable — the in-memory reset below still applies.
    }
    setConfirming(false);
    reset();
    toast('Demo restarted — saved state cleared.', 'info');
  };

  return (
    <Modal open={open} onClose={onClose} title="Config">
      <div className="space-y-4">
        <h3 className="text-[13px] font-semibold text-ink">Blockchain network</h3>
        <p className="text-[12px] text-muted">
          The DApp Connector wallet is asked to connect on this network, and new contract
          deployments use it.
        </p>
        <NetworkPicker label="Network" />
      </div>

      <div className="mt-6 space-y-3 border-t border-line pt-4">
        <h3 className="text-[13px] font-semibold text-ink">Restart demo</h3>
        <p className="text-[12px] leading-5 text-muted">
          Clears all saved demo data (members, projects, votes, the deployed contract) and
          returns to the login screen.
        </p>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-medium text-warning">
              Are you sure? This can't be undone.
            </span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={restart}>
                <RefreshIcon size={13} /> Confirm restart
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="danger" onClick={() => setConfirming(true)}>
            <RefreshIcon size={13} /> Restart demo
          </Button>
        )}
      </div>
    </Modal>
  );
}
