import { STATUS_COLORS, STATUS_LABELS, StatusProntidao } from "@/lib/types";
import clsx from "clsx";

export function StatusBadge({ status }: { status: StatusProntidao }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.02em]",
        STATUS_COLORS[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}
