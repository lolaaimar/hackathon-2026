import { STATUS_META, type ProjectInfo } from "../types";

const ORDER: ProjectInfo["status"][] = [
  "Voting",
  "Selected",
  "InProgress",
  "Completed",
];

export function LifecycleTimeline({ status }: { status: ProjectInfo["status"] }) {
  const index = ORDER.indexOf(status);
  const isTerminal = status === "Cancelled" || status === "Terminated";

  return (
    <ol className="flex items-center gap-0" aria-label="Project lifecycle">
      {ORDER.map((step, i) => {
        const done = index > i;
        const current = index === i;
        const meta = STATUS_META[step];
        return (
          <li key={step} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  backgroundColor: done ? meta.color : current ? meta.color : "var(--color-panel-strong)",
                  color: done || current ? "#fff" : "var(--color-muted)",
                }}
                title={meta.description}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className="hidden whitespace-nowrap text-[12px] font-medium sm:block"
                style={{ color: current ? meta.color : "var(--color-muted)" }}
              >
                {meta.label}
              </span>
            </div>
            {i < ORDER.length - 1 ? (
              <span
                className="h-0.5 flex-1 rounded-full"
                style={{
                  backgroundColor: index > i ? meta.color : "var(--color-line)",
                }}
              />
            ) : null}
          </li>
        );
      })}
      {isTerminal ? (
        <li className="ml-3 flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold"
            style={{
              backgroundColor: STATUS_META[status].color,
              color: "#fff",
            }}
          >
            !
          </span>
          <span
            className="whitespace-nowrap text-[12px] font-medium"
            style={{ color: STATUS_META[status].color }}
          >
            {STATUS_META[status].label}
          </span>
        </li>
      ) : null}
    </ol>
  );
}
