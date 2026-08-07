import type { ConnectedAPI, InitialAPI } from "@midnight-ntwrk/dapp-connector-api";
import "@midnight-ntwrk/dapp-connector-api";

export const SUPPORTED_NETWORKS = [
  { id: "preview", label: "Preview" },
  { id: "undeployed", label: "Undeployed (local)" },
] as const;

export type NetworkId = (typeof SUPPORTED_NETWORKS)[number]["id"];

const NETWORK_STORAGE_KEY = "govfund.networkId";

export function getSelectedNetwork(): NetworkId {
  const stored = window.localStorage.getItem(NETWORK_STORAGE_KEY);
  if (stored === "preview" || stored === "undeployed") return stored;
  return "preview";
}

export function setSelectedNetwork(networkId: NetworkId): NetworkId {
  window.localStorage.setItem(NETWORK_STORAGE_KEY, networkId);
  return networkId;
}

export interface WalletDescriptor {
  rdns: string;
  name: string;
  icon: string | null;
  api: InitialAPI;
}

export function listWallets(): WalletDescriptor[] {
  const injected = window.midnight;
  if (!injected) return [];
  return Object.values(injected).map((w) => ({
    rdns: w.rdns,
    name: w.name,
    icon: w.icon ?? null,
    api: w,
  }));
}

export interface ConnectResult {
  api: ConnectedAPI;
  address: string;
  networkId: string;
}

export async function connectWallet(
  wallet: InitialAPI,
  networkId: string
): Promise<ConnectResult> {
  const api = await wallet.connect(networkId);
  const { unshieldedAddress } = await api.getUnshieldedAddress();

  const status = await api.getConnectionStatus();
  if (status.status !== "connected") {
    throw new Error(`Wallet reports connection lost (${status.status}).`);
  }

  try {
    const config = await api.getConfiguration();
    // Diagnostics: surface the wallet's service endpoints so the connection
    // can be verified in the browser console.
    // eslint-disable-next-line no-console
    console.info("[govfund] wallet configuration", {
      networkId: config.networkId,
      indexerUri: config.indexerUri,
      substrateNodeUri: config.substrateNodeUri,
    });
  } catch {
    // getConfiguration is optional; ignore failures here.
  }

  return { api, address: unshieldedAddress, networkId };
}
