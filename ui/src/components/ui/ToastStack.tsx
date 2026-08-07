import { useGovFund } from "../../mock/store";
import { AlertIcon, CheckIcon, InfoIcon } from "./icons";

export function ToastStack() {
  const { toasts, dismissToast } = useGovFund();

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-toast flex w-80 flex-col gap-2"
      role="region"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const Icon =
          t.kind === "success" ? CheckIcon : t.kind === "error" ? AlertIcon : InfoIcon;
        const color =
          t.kind === "success"
            ? "text-success"
            : t.kind === "error"
              ? "text-danger"
              : "text-info";
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-white p-3 shadow-lg shadow-ink/5"
          >
            <span className={`mt-0.5 shrink-0 ${color}`}>
              <Icon size={16} />
            </span>
            <p className="flex-1 text-[13px] leading-5 text-body">{t.message}</p>
            <button
              onClick={() => dismissToast(t.id)}
              className="text-muted transition-colors hover:text-ink"
              aria-label="Dismiss notification"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
