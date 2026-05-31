type StatusPillProps = {
  status: string;
};

const statusClasses: Record<string, string> = {
  PASSED: "bg-emerald-50 text-signal-green ring-emerald-200",
  WARNED: "bg-amber-50 text-signal-amber ring-amber-200",
  FAILED: "bg-red-50 text-signal-red ring-red-200",
  NEEDS_REVIEW: "bg-blue-50 text-signal-blue ring-blue-200"
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span
      className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
        statusClasses[status] ?? "bg-slate-50 text-slate-600 ring-slate-200"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

