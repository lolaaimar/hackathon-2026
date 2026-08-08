import type { GovFundPrivateState, ZswapCoinPublicKey } from '@govfund/api';
import {
  createAdminState,
  createCompanyState,
  createMemberState,
  memberCommit,
} from '@govfund/api';

const IDENTITY_KEY = 'govfund.identities.v1';

export type RoleIdentity = {
  readonly sk: Uint8Array;
  readonly salt?: Uint8Array;
  readonly nonce?: Uint8Array;
  readonly coinPk?: ZswapCoinPublicKey;
};

type Stored = Record<string, string>;

const bytesToHex = (b: Uint8Array): string =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');

const hexToBytes = (hex: string): Uint8Array =>
  new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => Number.parseInt(h, 16)));

const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

function loadStored(): Stored {
  try {
    const raw = window.localStorage.getItem(IDENTITY_KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    return {};
  }
}

function saveStored(stored: Stored): void {
  try {
    window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(stored));
  } catch {
    // storage unavailable — identities live for this session only
  }
}

/**
 * Returns (generating and persisting on first use) the contract identity for a
 * role. The identity is app-generated; the wallet is used only for signing,
 * fees and proving.
 */
export function getRoleIdentity(
  role: 'admin' | 'member' | 'company',
  contract?: string,
): RoleIdentity {
  const stored = loadStored();
  const key = contract ? `${role}:${contract}` : role;

  const raw = stored[key];
  if (raw) {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return {
      sk: hexToBytes(parsed.sk),
      salt: parsed.salt ? hexToBytes(parsed.salt) : undefined,
      nonce: parsed.nonce ? hexToBytes(parsed.nonce) : undefined,
      coinPk: parsed.coinPk ? { bytes: hexToBytes(parsed.coinPk) } : undefined,
    };
  }

  let identity: RoleIdentity;
  if (role === 'member') {
    identity = { sk: randomBytes(32), salt: randomBytes(32) };
  } else if (role === 'company') {
    identity = {
      sk: randomBytes(32),
      nonce: randomBytes(32),
      coinPk: { bytes: randomBytes(32) },
    };
  } else {
    identity = { sk: randomBytes(32) };
  }

  const serialized = JSON.stringify({
    sk: bytesToHex(identity.sk!),
    salt: identity.salt ? bytesToHex(identity.salt) : undefined,
    nonce: identity.nonce ? bytesToHex(identity.nonce) : undefined,
    coinPk: identity.coinPk ? bytesToHex(identity.coinPk.bytes) : undefined,
  });
  saveStored({ ...loadStored(), [key]: serialized });
  return identity;
}

/** The member's committed Merkle leaf, matching the contract's `memberCommit`. */
export const memberCommitOf = (identity: RoleIdentity): Uint8Array =>
  memberCommit(identity.sk!, identity.salt!);

/** A company's proposal commitment: persistentCommit(pk(sk), nonce). */
export const companyCommitOf = (identity: RoleIdentity): Uint8Array =>
  memberCommit(identity.sk!, identity.nonce!);

export { memberCommit };

export const toPrivateState = (identity: RoleIdentity): GovFundPrivateState => {
  if (identity.salt !== undefined) {
    return createMemberState(identity.sk!, identity.salt);
  }
  if (identity.nonce !== undefined && identity.coinPk !== undefined) {
    return createCompanyState(identity.sk!, identity.nonce, identity.coinPk);
  }
  return createAdminState(identity.sk!);
};
