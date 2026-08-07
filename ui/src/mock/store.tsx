import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import { reducer, type Action } from "./actions";
import { createSeedState } from "./seed";
import type { AppState, Role } from "../types";

export interface Toast {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
}

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  toasts: Toast[];
  toast: (message: string, kind?: Toast["kind"]) => void;
  dismissToast: (id: number) => void;
  setRole: (role: Role | null) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

let toastSeq = 0;

const STORAGE_KEY = "govfund.state.v1";

function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>;
      if (
        parsed &&
        parsed.config &&
        Array.isArray(parsed.projects) &&
        parsed.wallet &&
        typeof parsed.now === "number" &&
        parsed.contract
      ) {
        const restored: AppState = {
          ...(parsed as AppState),
          demoCompany: parsed.demoCompany ?? "VoltGrid Industries",
          contract: {
            ...(parsed.contract as AppState["contract"]),
            deployerAddress: parsed.contract.deployerAddress ?? null,
          },
          config: {
            ...(parsed.config as AppState["config"]),
            members: (parsed.config.members ?? []).map((m) => ({
              ...m,
              address: m.address ?? "",
            })),
          },
        };
        return restored;
      }
    }
  } catch {
    // Corrupt or unavailable storage — fall through to the seed.
  }
  const seed = createSeedState();
  seed.role = initialRole();
  return seed;
}

function saveState(state: AppState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (e.g. private mode) — the demo just won't persist.
  }
}

function initialRole(): Role | null {
  const role = new URLSearchParams(window.location.search).get("role");
  if (role === "admin" || role === "member" || role === "company") return role;
  return null;
}

export function GovFundProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: Toast["kind"] = "success") => {
      const id = ++toastSeq;
      setToasts((t) => [...t, { id, kind, message }]);
      window.setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast]
  );

  const setRole = useCallback((role: Role | null) => {
    dispatch({ type: "ROLE_SET", role });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  return (
    <StoreContext.Provider
      value={{ state, dispatch, toasts, toast, dismissToast, setRole, reset }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useGovFund(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useGovFund must be used within GovFundProvider");
  return ctx;
}
