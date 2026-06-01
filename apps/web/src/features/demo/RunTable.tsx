import { StatusPill } from "../../components/ui/StatusPill";
import type { DemoRun } from "./demoTypes";

type RunTableProps = {
  runs: DemoRun[];
};

export function RunTable({ runs }: RunTableProps) {
  if (runs.length === 0) {
    return (
      <div className="border-t border-slate-200 px-4 py-8 text-sm text-slate-500">
        No benchmark runs yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Scenario</th>
            <th className="px-4 py-3 font-medium">Decision</th>
            <th className="px-4 py-3 font-medium">p95</th>
            <th className="px-4 py-3 font-medium">Baseline</th>
            <th className="px-4 py-3 font-medium">Change</th>
            <th className="px-4 py-3 font-medium">Error rate</th>
            <th className="px-4 py-3 font-medium">Budget</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-ink-900">
                {run.scenarioName}
              </td>
              <td className="px-4 py-3">
                <StatusPill status={run.decisionStatus} />
              </td>
              <td className="px-4 py-3 text-slate-700">
                {run.metrics.p95LatencyMs}ms
              </td>
              <td className="px-4 py-3 text-slate-700">
                {run.baseline.p95LatencyMs}ms
              </td>
              <td className="px-4 py-3 text-slate-700">
                {run.comparison.p95ChangePercent}%
              </td>
              <td className="px-4 py-3 text-slate-700">
                {run.metrics.errorRate}%
              </td>
              <td className="px-4 py-3">
                <StatusPill status={run.budgetEvaluation.finalResult} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

