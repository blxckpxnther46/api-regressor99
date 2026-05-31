import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "green" | "amber" | "red" | "blue";
};

const toneClasses: Record<StatCardProps["tone"], string> = {
  green: "bg-emerald-50 text-signal-green",
  amber: "bg-amber-50 text-signal-amber",
  red: "bg-red-50 text-signal-red",
  blue: "bg-blue-50 text-signal-blue"
};

export function StatCard({ label, value, detail, icon: Icon, tone }: StatCardProps) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-ink-950">
            {value}
          </p>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClasses[tone]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-3 text-sm text-slate-500">{detail}</p>
    </article>
  );
}

