import { useGovFund } from "../mock/store";
import { Button } from "./ui/Button";
import { ClockIcon } from "./ui/icons";
import { fmtDate } from "../lib/time";

export function DemoClock() {
  const { state, dispatch, toast } = useGovFund();
  const skip = (days: number) => {
    dispatch({ type: "TIME_SKIP", days });
    toast(`Demo clock advanced ${days} day${days > 1 ? "s" : ""}.`, "info");
  };
  return (
    <div className="fixed right-4 bottom-4 z-toast flex items-center gap-1 rounded-2xl border border-line bg-white/95 p-1.5 pr-2 shadow-lg shadow-ink/10 backdrop-blur">
      <ClockIcon size={15} className="ml-1.5 text-muted" />
      <span className="tabular text-[12px] font-semibold text-body">{fmtDate(state.now)}</span>
      <Button size="sm" variant="ghost" onClick={() => skip(1)} className="h-7 px-2">
        +1d
      </Button>
      <Button size="sm" variant="ghost" onClick={() => skip(7)} className="h-7 px-2">
        +7d
      </Button>
      <Button size="sm" variant="ghost" onClick={() => skip(-1)} className="h-7 px-2">
        -1d
      </Button>
    </div>
  );
}
