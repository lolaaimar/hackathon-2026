import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import {
  CompiledContract,
} from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import { GovFund, witnesses, createAdminState } from "../../contract/src/index.js";
import type { ZswapCoinPublicKey } from "../../contract/src/index.js";
import { GovFundPrivateStateId } from "./common-types.js";
import type {
  GovFundDeployedContract,
  GovFundProviders,
} from "./common-types.js";
import type { GovFundPrivateState } from "./index.js";

export * from "./index.js";

/**
 * Absolute path to the compiled GovFund assets produced by `compactc`
 * (prover/verifier keys under `keys/`, ZKIRs under `zkir/`).
 */
export const zkConfigPath = fileURLToPath(
  new URL("../../contract/src/managed/govfund", import.meta.url),
);

/**
 * A Compact-js binding to the compiled GovFund contract: witnesses + the
 * location of the compiled file assets.
 */
export const govfundCompiledContract = CompiledContract.make(
  "GovFund",
  GovFund,
).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

/**
 * A filesystem-backed {@link ZKConfigProvider} for the GovFund circuits.
 * Reads prover/verifier keys and ZKIRs from `zkConfigPath`.
 *
 * @throws If the compiled proving keys are missing — run `npm run compile:zk`
 * to generate them (`npm run compile` uses `--skip-zk`).
 */
export const createZkConfigProvider = () => {
  const keysPath = fileURLToPath(
    new URL("../../contract/src/managed/govfund/keys", import.meta.url),
  );
  if (!existsSync(keysPath)) {
    throw new Error(
      `GovFund proving keys not found under ${keysPath}. ` +
        "Run `npm run compile:zk` to generate them (the default `compile` script uses --skip-zk).",
    );
  }
  return new NodeZkConfigProvider(zkConfigPath);
};

/**
 * Deploys the GovFund contract with the given constructor arguments.
 */
export const deployGovFundContract = async (
  providers: GovFundProviders,
  args: {
    quorumPercentParam: bigint;
    fundingTokenParam: Uint8Array;
    treasuryParam: ZswapCoinPublicKey;
    approvalsRequiredParam: bigint;
  },
  adminSk: Uint8Array,
) => {
  return deployContract(providers, {
    compiledContract: govfundCompiledContract,
    privateStateId: GovFundPrivateStateId,
    initialPrivateState: createAdminState(adminSk),
    args: [ args.quorumPercentParam, args.fundingTokenParam, args.treasuryParam, args.approvalsRequiredParam ]
  });
}

/**
 * Finds an already-deployed GovFund contract at `contractAddress`.
 */
export const findGovFundContract = async (
  providers: GovFundProviders,
  options: {
    readonly contractAddress: string;
    readonly signingKey?: Uint8Array;
    readonly initialPrivateState?: GovFundPrivateState;
  },
) => {
  const base = {
    compiledContract: govfundCompiledContract,
    contractAddress: options.contractAddress,
    signingKey: options.signingKey ? toHex(options.signingKey) : undefined,
  };
  return options.initialPrivateState !== undefined
    ? findDeployedContract(providers, {
        ...base,
        privateStateId: GovFundPrivateStateId,
        initialPrivateState: options.initialPrivateState,
      })
    : findDeployedContract(providers, base);
};
