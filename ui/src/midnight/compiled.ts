import { GovFund, witnesses } from '@govfund/api';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

/** Served base for the compiled GovFund ZK assets (keys/ + zkir/). */
export const ZK_ASSETS_BASE = 'managed/govfund';

/**
 * Browser binding to the compiled GovFund contract. The compiled ZK assets are
 * served as static files under `public/managed/govfund` (see vite.config.ts) and
 * loaded at proving time by `FetchZkConfigProvider`.
 */
export const govfundCompiledContract = CompiledContract.make('GovFund', GovFund).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(ZK_ASSETS_BASE),
);
