import { LedgerParameters } from "@midnight-ntwrk/ledger-v8";
import { createUnprovenDeployTxFromVerifierKeys } from "@midnight-ntwrk/midnight-js-contracts";
import { CompiledContract } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { fileURLToPath } from "node:url";
import { Contract as GovFund, pureCircuits } from "./src/managed/govfund/contract/index.js";

setNetworkId("undeployed");

const zkConfigPath = fileURLToPath(
  new URL("./src/managed/govfund", import.meta.url),
);

const govfundCompiledContract = CompiledContract.make(
  "GovFund",
  GovFund,
).pipe(
  CompiledContract.withWitnesses({
    admin_sk: ({ privateState: ps }) => [ps, ps.sk],
    member_sk: ({ privateState: ps }) => [ps, ps.sk],
    member_pk: ({ privateState: ps }) => [ps, pureCircuits.publicKeyOf(ps.sk)],
    member_salt: ({ privateState: ps }) => [ps, ps.salt],
    member_path: () => {
      throw new Error("member_path witness not available");
    },
    company_sk: ({ privateState: ps }) => [ps, ps.sk],
    company_nonce: ({ privateState: ps }) => [ps, ps.nonce],
  }),
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);

const createZkConfigProvider = () =>
  new NodeZkConfigProvider(zkConfigPath);

const adminSk = new Uint8Array(32);
adminSk[0] = 0x01;
const signingKey = new Uint8Array(32);
signingKey[0] = 0x02;
const coinPk = new Uint8Array(32);
coinPk[0] = 0x03;
const encPk = new Uint8Array(32);
encPk[0] = 0x04;

const zkConfigProvider = createZkConfigProvider();

const result = await createUnprovenDeployTxFromVerifierKeys(
  zkConfigProvider,
  Buffer.from(coinPk).toString("hex"),
  {
    compiledContract: govfundCompiledContract,
    signingKey: Buffer.from(signingKey).toString("hex"),
    initialPrivateState: { sk: adminSk },
    args: [
      50n,
      new Uint8Array(32),
      { bytes: new Uint8Array(32).fill(0xee) },
      2n,
      pureCircuits.memberCommit(pureCircuits.publicKeyOf(adminSk), new Uint8Array(32)),
    ],
  },
  Buffer.from(encPk).toString("hex"),
);

const params = LedgerParameters.initialParameters();
const cost = result.private.unprovenTx.cost(params);

const fmt = (n) => n.toString();
console.log("=== Unproven deploy tx synthetic cost ===");
console.log(`readTime:     ${fmt(cost.readTime)} ps`);
console.log(`computeTime:  ${fmt(cost.computeTime)} ps`);
console.log(`blockUsage:   ${fmt(cost.blockUsage)} B`);
console.log(`bytesWritten: ${fmt(cost.bytesWritten)} B`);
console.log(`bytesChurned: ${fmt(cost.bytesChurned)} B`);

const blockLimits = {
  readTime: 2_000_000_000_000n,
  computeTime: 2_000_000_000_000n,
  blockUsage: 1_000_000n,
  bytesWritten: 50_000n,
  bytesChurned: 50_000_000n,
};
console.log("\n=== vs block limits ===");
console.log(`readTime:     ${fmt(cost.readTime)} / ${fmt(blockLimits.readTime)} = ${(Number(cost.readTime) / Number(blockLimits.readTime) * 100).toFixed(2)}%`);
console.log(`computeTime:  ${fmt(cost.computeTime)} / ${fmt(blockLimits.computeTime)} = ${(Number(cost.computeTime) / Number(blockLimits.computeTime) * 100).toFixed(2)}%`);
console.log(`blockUsage:   ${fmt(cost.blockUsage)} / ${fmt(blockLimits.blockUsage)} = ${(Number(cost.blockUsage) / Number(blockLimits.blockUsage) * 100).toFixed(2)}%`);
console.log(`bytesWritten: ${fmt(cost.bytesWritten)} / ${fmt(blockLimits.bytesWritten)} = ${(Number(cost.bytesWritten) / Number(blockLimits.bytesWritten) * 100).toFixed(2)}%`);
console.log(`bytesChurned: ${fmt(cost.bytesChurned)} / ${fmt(blockLimits.bytesChurned)} = ${(Number(cost.bytesChurned) / Number(blockLimits.bytesChurned) * 100).toFixed(2)}%`);

const normalized = params.normalizeFullness(cost);
console.log("\n=== normalizeFullness (real node limits) ===");
console.log(JSON.stringify(normalized, (_k, v) => typeof v === "bigint" ? v.toString() : v, 2));