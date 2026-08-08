import type { GovFundDeployedContract, Ledger, ShieldedCoinInfo } from '@govfund/api';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { GovFundClient } from '../midnight/client';
import {
  companyCommitOf,
  getRoleIdentity,
  memberCommitOf,
  type RoleIdentity,
} from '../midnight/identities';
import { createGovFundProviders } from '../midnight/providers';
import type { AppState, ContractInfo, Role, WalletInfo } from '../types';
import type { Action } from './actions';
import { bytesToHex, hexToBytes, toViewModel, type ViewModelLocal } from './viewModel';

export interface Toast {
  id: number;
  kind: 'success' | 'error' | 'info';
  message: string;
}

interface StoreValue {
  state: AppState;
  dispatch: (action: Action) => Promise<void>;
  toasts: Toast[];
  toast: (message: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
  setRole: (role: Role | null) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

let toastSeq = 0;

const APP_KEY = 'govfund.app.v1';

type Persisted = {
  role?: Role;
  address?: string;
  networkId?: string;
  demoCompany?: string;
  memberRegistry?: { commit: string; label: string }[];
  descriptions?: Record<string, string>;
  projectDescriptions?: Record<string, string>;
  myVotes?: Record<string, string>;
  myReviewedAttempt?: Record<string, number>;
  myTerminateVotes?: Record<string, boolean>;
  myCompanyCommit?: string | null;
};

function loadPersisted(): Persisted {
  try {
    const raw = window.localStorage.getItem(APP_KEY);
    return raw ? (JSON.parse(raw) as Persisted) : {};
  } catch {
    return {};
  }
}

function savePersisted(p: Persisted): void {
  try {
    window.localStorage.setItem(APP_KEY, JSON.stringify(p));
  } catch {
    // storage unavailable
  }
}

const ZEROS = new Uint8Array(32);
const random32 = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

const EMPTY_STATE: AppState = {
  config: {
    adminPk: '',
    quorumPercent: 50,
    approvalsRequired: 1,
    fundingToken: 'NIGHT',
    treasury: '',
    pot: 0,
    potHasCoin: false,
    members: [],
  },
  projects: [],
  now: Math.floor(Date.now() / 1000),
  role: null,
  wallet: { connected: false, walletName: null, address: null, networkId: null, error: null },
  contract: {
    deployed: false,
    address: null,
    networkId: null,
    deployedAt: null,
    deployerAddress: null,
  },
  demoCompany: 'My Company',
};

function initialRole(): Role | null {
  const role = new URLSearchParams(window.location.search).get('role');
  if (role === 'admin' || role === 'member' || role === 'company') return role;
  return null;
}

export function GovFundProvider({ children }: { children: ReactNode }) {
  const persisted = useRef<Persisted>(loadPersisted()).current;

  const [api, setApi] = useState<ConnectedAPI | null>(null);
  const [client, setClient] = useState<GovFundClient | null>(null);
  const [deployed, setDeployed] = useState<GovFundDeployedContract | null>(null);
  const [ledger, setLedger] = useState<Ledger | null>(null);

  const [role, setRoleState] = useState<Role | null>(persisted.role ?? initialRole());
  const [wallet, setWallet] = useState<WalletInfo>({
    connected: false,
    walletName: null,
    address: null,
    networkId: persisted.networkId ?? null,
    error: null,
  });
  const [contract, setContract] = useState<ContractInfo>({
    deployed: false,
    address: persisted.address ?? null,
    networkId: persisted.networkId ?? null,
    deployedAt: null,
    deployerAddress: null,
  });
  const [demoCompany, setDemoCompany] = useState(persisted.demoCompany ?? 'My Company');
  const [memberRegistry, setMemberRegistry] = useState(persisted.memberRegistry ?? []);
  const [descriptions, setDescriptions] = useState(persisted.descriptions ?? {});
  const [projectDescriptions, setProjectDescriptions] = useState(
    persisted.projectDescriptions ?? {},
  );
  const [myVotes, setMyVotes] = useState(persisted.myVotes ?? {});
  const [myReviewedAttempt, setMyReviewedAttempt] = useState(persisted.myReviewedAttempt ?? {});
  const [myTerminateVotes, setMyTerminateVotes] = useState(persisted.myTerminateVotes ?? {});
  const [myCompanyCommit, setMyCompanyCommit] = useState<string | null>(
    persisted.myCompanyCommit ?? null,
  );

  const [toasts, setToasts] = useState<Toast[]>([]);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    savePersisted({
      role: role ?? undefined,
      address: contract.address ?? undefined,
      networkId: contract.networkId ?? undefined,
      demoCompany,
      memberRegistry,
      descriptions,
      projectDescriptions,
      myVotes,
      myReviewedAttempt,
      myTerminateVotes,
      myCompanyCommit,
    });
  }, [
    role,
    contract,
    demoCompany,
    memberRegistry,
    descriptions,
    projectDescriptions,
    myVotes,
    myReviewedAttempt,
    myTerminateVotes,
    myCompanyCommit,
  ]);

  const identityFor = useCallback(
    (r: Role): RoleIdentity => {
      const key = contract.address ?? undefined;
      const id = getRoleIdentity(r, key);
      if (r === 'company' && id.nonce) {
        setMyCompanyCommit(bytesToHex(companyCommitOf(id)));
      }
      return id;
    },
    [contract.address],
  );

  const attach = useCallback(
    async (address: string, r: Role | null, apiObj: ConnectedAPI) => {
      const providers = await createGovFundProviders(apiObj);
      const c = new GovFundClient(providers);
      const identity = r ? identityFor(r) : undefined;
      const d = await c.find(address, identity);
      subRef.current?.unsubscribe();
      const sub = c.ledger$(address).subscribe({
        next: (l) => setLedger(l),
        error: () => {},
      });
      subRef.current = sub;
      setClient(c);
      setDeployed(d);
      setContract((prev) => ({ ...prev, deployed: true, address }));
    },
    [identityFor],
  );

  // Re-seed the private state whenever the active role changes. `attach` and
  // `contract.address` are intentionally omitted: address changes are handled
  // by the deploy/connect paths that call `attach` directly.
  // biome-ignore lint/correctness/useExhaustiveDependencies: deliberate re-seed on role/api change
  useEffect(() => {
    if (api && contract.address && role) {
      attach(contract.address, role, api).catch(() => {});
    }
  }, [role, api]);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: Toast['kind'] = 'success') => {
      const id = ++toastSeq;
      setToasts((t) => [...t, { id, kind, message }]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  const setRole = useCallback((r: Role | null) => {
    setRoleState(r);
  }, []);

  const reset = useCallback(() => {
    subRef.current?.unsubscribe();
    window.localStorage.removeItem(APP_KEY);
    setApi(null);
    setClient(null);
    setDeployed(null);
    setLedger(null);
    setRoleState(null);
    setWallet({ connected: false, walletName: null, address: null, networkId: null, error: null });
    setContract({
      deployed: false,
      address: null,
      networkId: null,
      deployedAt: null,
      deployerAddress: null,
    });
    setMemberRegistry([]);
    setDescriptions({});
    setProjectDescriptions({});
    setMyVotes({});
    setMyReviewedAttempt({});
    setMyTerminateVotes({});
    setMyCompanyCommit(null);
    setDemoCompany('My Company');
  }, []);

  const dispatch = async (action: Action) => {
    switch (action.type) {
      case 'ROLE_SET':
        setRoleState(action.role);
        return;

      case 'SET_DEMO_COMPANY':
        setDemoCompany(action.company);
        return;

      case 'WALLET_CONNECTED':
        setApi(action.api);
        setWallet({
          connected: true,
          walletName: action.walletName,
          address: action.address,
          networkId: action.networkId,
          error: null,
        });
        setContract((prev) => ({ ...prev, networkId: action.networkId }));
        if (contract.address) {
          try {
            await attach(contract.address, role, action.api);
          } catch (e) {
            toast(e instanceof Error ? e.message : 'Failed to connect to contract', 'error');
          }
        }
        return;

      case 'WALLET_DISCONNECTED':
        setApi(null);
        setClient(null);
        setDeployed(null);
        setLedger(null);
        setWallet({
          connected: false,
          walletName: null,
          address: null,
          networkId: null,
          error: null,
        });
        return;

      case 'WALLET_ERROR':
        setWallet((prev) => ({ ...prev, error: action.error }));
        toast(action.error, 'error');
        return;

      case 'TIME_SKIP':
        // On-chain time cannot be skipped; the contract uses real block time.
        return;

      case 'RESET':
        reset();
        return;

      case 'CONTRACT_DEPLOY': {
        if (!api) {
          toast('Connect a Midnight wallet before deploying.', 'error');
          return;
        }
        if (client || contract.deployed) {
          toast('Contract already deployed.', 'error');
          return;
        }
        try {
          const providers = await createGovFundProviders(api);
          const c = new GovFundClient(providers);
          const admin = getRoleIdentity('admin');
          const d = await c.deploy(
            {
              quorumPercentParam: BigInt(action.quorumPercent),
              fundingTokenParam: ZEROS,
              treasuryParam: { bytes: random32() },
              approvalsRequiredParam: BigInt(action.approvalsRequired),
            },
            admin,
          );
          const address = (
            d as unknown as { deployTxData: { public: { contractAddress: string } } }
          ).deployTxData.public.contractAddress;
          setClient(c);
          setDeployed(d);
          setContract({
            deployed: true,
            address,
            networkId: action.networkId,
            deployedAt: Math.floor(Date.now() / 1000),
            deployerAddress: null,
          });
          const sub = c.ledger$(address).subscribe({
            next: (l) => setLedger(l),
            error: () => {},
          });
          subRef.current = sub;
          toast('Contract deployed.');
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Deployment failed', 'error');
        }
        return;
      }

      case 'ADD_MEMBER':
      case 'REMOVE_MEMBER':
      case 'CREATE_PROJECT':
      case 'VOTE':
      case 'FINALIZE':
      case 'FUND':
      case 'APPROVE_STAGE':
      case 'REJECT_STAGE':
      case 'VOTE_TERMINATE':
      case 'SUBMIT_PROPOSAL':
      case 'REVEAL_COMPANY':
      case 'REQUEST_PAYMENT':
      case 'WITHDRAW_COLLATERAL': {
        if (!client || !deployed || !contract.address) {
          toast('Contract not connected.', 'error');
          return;
        }
        try {
          await runContractAction(action);
        } catch (e) {
          toast(e instanceof Error ? e.message : 'Transaction failed', 'error');
        }
        return;
      }

      case 'MERGE_DESCRIPTIONS':
        setDescriptions((prev) => {
          const next = { ...prev };
          for (const d of action.descriptions) next[d.proposalId] = d.description;
          return next;
        });
        return;
    }
  };

  const runContractAction = async (action: Action) => {
    const c = client!;
    const d = deployed!;
    const addr = contract.address!;

    switch (action.type) {
      case 'ADD_MEMBER': {
        const member = getRoleIdentity('member', addr);
        const commit = memberCommitOf(member);
        await c.addMember(d, commit);
        setMemberRegistry((prev) => [
          ...prev.filter((m) => m.commit !== bytesToHex(commit)),
          { commit: bytesToHex(commit), label: action.name },
        ]);
        toast('Member added.');
        return;
      }

      case 'REMOVE_MEMBER': {
        await c.removeMember(d, hexToBytes(action.id));
        setMemberRegistry((prev) => prev.filter((m) => m.commit !== action.id));
        toast('Member removed.');
        return;
      }

      case 'CREATE_PROJECT': {
        const member = getRoleIdentity('member', addr);
        const now = Math.floor(Date.now() / 1000);
        const projectId = random32();
        await c.createProject(d, {
          projectId,
          title: action.input.title,
          collateralRequired: BigInt(action.input.collateralRequired),
          maxStageRejections: BigInt(action.input.maxStageRejections),
        });
        void member;
        void now;
        if (action.input.description) {
          setProjectDescriptions((prev) => ({
            ...prev,
            [bytesToHex(projectId)]: action.input.description,
          }));
        }
        toast('Project opened.');
        return;
      }

      case 'VOTE':
        await c.vote(d, hexToBytes(action.projectId), hexToBytes(action.proposalId));
        setMyVotes((prev) => ({ ...prev, [action.projectId]: action.proposalId }));
        toast('Vote recorded (anonymous nullifier).');
        return;

      case 'FINALIZE':
        await c.settleProject(d, hexToBytes(action.projectId));
        toast('Winner selected.');
        return;

      case 'FUND': {
        const member = getRoleIdentity('member', addr);
        const project = findProject(action.projectId);
        if (!project?.winner.is_some) {
          toast('No winner to fund.', 'error');
          return;
        }
        let budget = 0n;
        if (ledger) {
          for (const [, pr] of ledger.proposals) {
            if (pr.projectId.every((b, i) => b === project.id[i])) {
              budget = pr.budget;
            }
          }
        }
        await c.fundProject(d, hexToBytes(action.projectId), {
          nonce: random32(),
          color: ZEROS,
          value: budget,
        });
        void member;
        toast('Project funded.');
        return;
      }

      case 'APPROVE_STAGE':
        await c.approveStage(d, hexToBytes(action.projectId));
        setMyReviewedAttempt((prev) => ({
          ...prev,
          [action.projectId]: Math.floor(Date.now() / 1000),
        }));
        toast('Stage approved.');
        return;

      case 'REJECT_STAGE':
        await c.rejectStage(d, hexToBytes(action.projectId));
        setMyReviewedAttempt((prev) => ({
          ...prev,
          [action.projectId]: Math.floor(Date.now() / 1000),
        }));
        toast('Stage rejected.');
        return;

      case 'VOTE_TERMINATE':
        await c.voteTerminate(d, hexToBytes(action.projectId));
        setMyTerminateVotes((prev) => ({ ...prev, [action.projectId]: true }));
        toast('Termination vote cast.');
        return;

      case 'SUBMIT_PROPOSAL': {
        const company = getRoleIdentity('company', addr);
        const proposalId = random32();
        const stages = action.input.stages
          .map((s) => ({ amount: BigInt(Math.round(s.amount)) }))
          .concat(Array.from({ length: 60 - action.input.stages.length }, () => ({ amount: 0n })));
        const collateralCoin: ShieldedCoinInfo = {
          nonce: random32(),
          color: ZEROS,
          value: BigInt(Math.round(action.input.collateral)),
        };
        await c.submitProposal(d, {
          projectId: hexToBytes(action.projectId),
          proposalId,
          budget: BigInt(Math.round(action.input.budget)),
          collateralAmount: BigInt(Math.round(action.input.collateral)),
          stageCount: BigInt(action.input.stages.length),
          stages,
          collateralCoin,
        });
        setMyCompanyCommit(bytesToHex(companyCommitOf(company)));
        if (action.input.description) {
          setDescriptions((prev) => ({
            ...prev,
            [bytesToHex(proposalId)]: action.input.description,
          }));
        }
        toast('Bid submitted with collateral deposited.');
        return;
      }

      case 'REVEAL_COMPANY': {
        const company = getRoleIdentity('company', addr);
        const project = findProject(action.projectId);
        const winnerId = project?.winner.is_some ? bytesToHex(project.winner.value) : null;
        if (!winnerId) {
          toast('No winner to reveal.', 'error');
          return;
        }
        await c.revealCompany(d, {
          projectId: hexToBytes(action.projectId),
          proposalId: hexToBytes(winnerId),
          nonce: company.nonce ?? new Uint8Array(32),
          coinPk: company.coinPk ?? { bytes: new Uint8Array(32) },
        });
        toast('Company revealed.');
        return;
      }

      case 'REQUEST_PAYMENT':
        await c.requestPayment(d, hexToBytes(action.projectId));
        toast('Payment requested for the current stage.');
        return;

      case 'WITHDRAW_COLLATERAL': {
        const company = getRoleIdentity('company', addr);
        await c.withdrawCollateral(d, {
          projectId: hexToBytes(action.projectId),
          proposalId: hexToBytes(action.proposalId),
          nonce: company.nonce ?? new Uint8Array(32),
          coinPk: company.coinPk ?? { bytes: new Uint8Array(32) },
        });
        toast('Collateral withdrawn.');
        return;
      }
    }
  };

  const findProject = (projectIdHex: string) => {
    const l = ledger;
    if (!l) return undefined;
    for (const [id, p] of l.projects) {
      if (bytesToHex(id) === projectIdHex) return p;
    }
    return undefined;
  };

  const local: ViewModelLocal = {
    memberRegistry,
    descriptions,
    projectDescriptions,
    myVotes,
    myReviewedAttempt,
    myTerminateVotes,
    demoCompany,
    myCompanyCommit,
  };

  const state: AppState = ledger
    ? toViewModel(ledger, local, role, wallet, contract)
    : { ...EMPTY_STATE, role, wallet, contract, demoCompany };

  return (
    <StoreContext.Provider
      value={{
        state,
        dispatch,
        toasts,
        toast,
        dismissToast,
        setRole,
        reset,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useGovFund(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useGovFund must be used within GovFundProvider');
  return ctx;
}
