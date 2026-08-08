import { useState } from "react";
import { useGovFund } from "../../state/provider";
import {
  getSelectedNetwork,
  setSelectedNetwork,
  SUPPORTED_NETWORKS,
  type NetworkId,
} from "../../wallet/selectWallet";

export function NetworkPicker({
  className = "",
  label = "Network",
}: {
  className?: string;
  label?: string;
}) {
  const { dispatch, toast, state } = useGovFund();
  const [network, setNetwork] = useState<NetworkId>(() => getSelectedNetwork());

  const handleChange = (id: NetworkId) => {
    setSelectedNetwork(id);
    setNetwork(id);
    if (state.wallet.connected) {
      dispatch({ type: "WALLET_DISCONNECTED" });
      toast(
        `Wallet disconnected. Reconnect on the ${SUPPORTED_NETWORKS.find((n) => n.id === id)?.label} network.`,
        "info"
      );
    }
  };

  return (
    <label className={`flex items-center gap-1.5 ${className}`}>
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <select
        value={network}
        onChange={(e) => handleChange(e.target.value as NetworkId)}
        className="h-8 cursor-pointer rounded-lg border border-line bg-white px-2 pr-7 text-[12px] font-medium text-body transition-colors hover:border-primary-600 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-100"
        aria-label="Blockchain network"
      >
        {SUPPORTED_NETWORKS.map((n) => (
          <option key={n.id} value={n.id}>
            {n.label}
          </option>
        ))}
      </select>
    </label>
  );
}
