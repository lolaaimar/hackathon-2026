import { Modal } from "./Modal";
import { NetworkPicker } from "./NetworkPicker";

export function ConfigModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
    </Modal>
  );
}
