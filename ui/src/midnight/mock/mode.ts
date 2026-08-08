import { GovFundMockClient } from './GovFundMockClient.js';

/**
 * The UI always runs against the in-memory GovFundMockClient for this demo
 * build — no URL parameter is required.
 */
export const isMockMode = (): boolean => true;

/**
 * Fake contract address used in mock mode. It is what the UI shows as the
 * deployed contract's address and what identity keys are scoped to.
 */
export const MOCK_CONTRACT_ADDRESS = 'mock-govfund-contract';

let mockClient: GovFundMockClient | null = null;

/**
 * The mock client is a singleton: `provider.tsx` re-runs `attach`/`find` on
 * every role change, and reusing one instance keeps the in-memory ledger alive
 * across role switches.
 */
export const getMockClient = (): GovFundMockClient => {
  if (mockClient === null) {
    mockClient = new GovFundMockClient();
  }
  return mockClient;
};

export const resetMockClient = (): void => {
  mockClient?.reset();
  mockClient = null;
};
