import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { dappConnectorProofProvider } from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-utils";
import { Transaction } from "@midnight-ntwrk/ledger-v8";
import { CostModel } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type {
  MidnightProvider,
  PrivateStateProvider,
  WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import type {
  GovFundCircuits,
  GovFundPrivateState,
  GovFundProviders,
} from "@govfund/api";
import { GovFundPrivateStateId } from "@govfund/api";
import { ZK_ASSETS_BASE } from "./compiled.js";

/**
 * A session-scoped private state provider. GovFund's private state (the current
 * actor's sk/salt/nonce) is small and the app already keeps identities in
 * localStorage, so an in-memory provider is sufficient.
 */
export function inMemoryPrivateStateProvider(): PrivateStateProvider<
  typeof GovFundPrivateStateId,
  GovFundPrivateState
> {
  const states = new Map<string, GovFundPrivateState | null>();
  const signingKeys = new Map<string, string | null>();
  return {
    setContractAddress: () => {},
    set: async (id, state) => {
      states.set(id, state);
    },
    get: async (id) => states.get(id) ?? null,
    remove: async (id) => {
      states.delete(id);
    },
    clear: async () => {
      states.clear();
    },
    setSigningKey: async (address, key) => {
      signingKeys.set(address, key);
    },
    getSigningKey: async (address) => signingKeys.get(address) ?? null,
    removeSigningKey: async (address) => {
      signingKeys.delete(address);
    },
    clearSigningKeys: async () => {
      signingKeys.clear();
    },
    exportPrivateStates: async () => {
      throw new Error("export not supported by in-memory provider");
    },
    importPrivateStates: async () => {
      throw new Error("import not supported by in-memory provider");
    },
    exportSigningKeys: async () => {
      throw new Error("export not supported by in-memory provider");
    },
    importSigningKeys: async () => {
      throw new Error("import not supported by in-memory provider");
    },
  };
}

/**
 * Assembles the full GovFund {@link MidnightProviders} from a connected DApp
 * Connector wallet, using the wallet's own endpoints (`getConfiguration`) so the
 * app always talks to the network the user selected in their wallet.
 */
export async function createGovFundProviders(
  api: ConnectedAPI,
): Promise<GovFundProviders> {
  const config = await api.getConfiguration();
  setNetworkId(config.networkId);

  const publicDataProvider = indexerPublicDataProvider(
    config.indexerUri,
    config.indexerWsUri,
  );

  const zkConfigProvider = new FetchZkConfigProvider<GovFundCircuits>(
    `${window.location.origin}/${ZK_ASSETS_BASE}`,
    fetch.bind(window),
  );

  // Wallet-delegated proving: no proof server connection from the browser.
  const proofProvider = await dappConnectorProofProvider(
    api,
    zkConfigProvider,
    CostModel.initialCostModel(),
  );

  const { shieldedCoinPublicKey, shieldedEncryptionPublicKey } =
    await api.getShieldedAddresses();

  const walletProvider: WalletProvider = {
    getCoinPublicKey: () => shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedEncryptionPublicKey,
    balanceTx: async (tx) => {
      const { tx: balancedHex } = await api.balanceUnsealedTransaction(
        toHex(tx.serialize()),
        {},
      );
      return Transaction.deserialize(
        "signature",
        "proof",
        "binding",
        fromHex(balancedHex),
      );
    },
  };

  const midnightProvider: MidnightProvider = {
    submitTx: async (tx) => {
      await api.submitTransaction(toHex(tx.serialize()));
      return tx.identifiers()[0];
    },
  };

  return {
    privateStateProvider: inMemoryPrivateStateProvider(),
    publicDataProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}
