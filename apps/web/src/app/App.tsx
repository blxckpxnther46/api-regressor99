import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  GitBranch,
  PlayCircle,
  RotateCcw,
  ShieldCheck
} from "lucide-react";
import { useMemo, useState } from "react";
import { StatCard } from "../components/ui/StatCard";
import { StatusPill } from "../components/ui/StatusPill";
import {
  getDemoDashboard,
  promoteDemoBaseline,
  resetDemo,
  triggerDemoRun
} from "../features/demo/demoApi";
import { RunTable } from "../features/demo/RunTable";

const navItems = [
  { label: "Dashboard", icon: Activity },
  { label: "Scenarios", icon: Gauge },
  { label: "Runs", icon: PlayCircle },
  { label: "Budgets", icon: ShieldCheck }
];

export function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const queryClient = useQueryClient();
  const dashboardQuery = useQuery({
    queryKey: ["demo-dashboard"],
    queryFn: getDemoDashboard
  });

  const runMutation = useMutation({
    mutationFn: triggerDemoRun,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-dashboard"] })
  });

  const promoteMutation = useMutation({
    mutationFn: promoteDemoBaseline,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-dashboard"] })
  });

  const resetMutation = useMutation({
    mutationFn: resetDemo,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["demo-dashboard"] })
  });

  const dashboard = dashboardQuery.data;
  const latestRun = dashboard?.latestRun ?? null;
  const latestDecision = dashboard?.summary.latestDecision ?? "NO_RUNS";

  const headerSubtitle = useMemo(() => {
    if (!dashboard) {
      return "Loading demo workspace";
    }

    return `${dashboard.project.name} · ${dashboard.project.environment} · ${dashboard.suite.name}`;
  }, [dashboard]);

  return (
    <main className="min-h-screen bg-slate-50 text-ink-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-950 text-white">
            <Gauge size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold">Regressor99</div>
            <div className="text-xs text-slate-500">Demo workspace</div>
          </div>
        </div>

        <nav className="mt-8 space-y-1 text-sm">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-medium ${
                activePage === label
                  ? "bg-slate-100 text-ink-950"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
              onClick={() => setActivePage(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="lg:pl-64">
        <header className="border-b border-slate-200 bg-white px-5 py-4 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-normal">
                {activePage}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{headerSubtitle}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
              >
                <RotateCcw size={16} />
                Reset
              </button>
              <button
                className="inline-flex items-center justify-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                onClick={() => runMutation.mutate("expanded")}
                disabled={runMutation.isPending}
              >
                <PlayCircle size={16} />
                {runMutation.isPending ? "Running" : "Run Demo"}
              </button>
            </div>
          </div>
        </header>

        <div className="px-5 py-6 lg:px-8">
          {dashboardQuery.isLoading ? (
            <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Loading dashboard...
            </div>
          ) : dashboardQuery.isError || !dashboard ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-signal-red">
              Could not load demo API.
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Decision"
                  value={latestDecision.replace("_", " ")}
                  detail={
                    latestRun
                      ? latestRun.comparison.regressionReason
                      : "No runs yet"
                  }
                  icon={AlertTriangle}
                  tone={latestDecision === "FAILED" ? "red" : "amber"}
                />
                <StatCard
                  label="Active Baseline"
                  value={`${dashboard.baseline.p95LatencyMs}ms`}
                  detail={`v${dashboard.baseline.versionNumber} · p95 latency`}
                  icon={CheckCircle2}
                  tone="green"
                />
                <StatCard
                  label="Latest p95"
                  value={latestRun ? `${latestRun.metrics.p95LatencyMs}ms` : "-"}
                  detail={
                    latestRun
                      ? `${latestRun.comparison.p95ChangePercent}% vs baseline`
                      : "Run a scenario"
                  }
                  icon={Gauge}
                  tone="blue"
                />
                <StatCard
                  label="Open Regressions"
                  value={`${dashboard.summary.openRegressions}`}
                  detail={`${dashboard.summary.totalRuns} total demo runs`}
                  icon={GitBranch}
                  tone="red"
                />
              </div>

              {activePage === "Dashboard" && (
                <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold">Latest run</h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Baseline, budget, and decision in one result.
                        </p>
                      </div>
                      {latestRun && <StatusPill status={latestRun.decisionStatus} />}
                    </div>

                    {latestRun ? (
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Metric label="Scenario" value={latestRun.scenarioName} />
                        <Metric
                          label="Budget"
                          value={latestRun.budgetEvaluation.finalResult}
                        />
                        <Metric
                          label="p95"
                          value={`${latestRun.metrics.p95LatencyMs}ms`}
                        />
                        <Metric
                          label="Error rate"
                          value={`${latestRun.metrics.errorRate}%`}
                        />
                      </div>
                    ) : (
                      <div className="mt-4 text-sm text-slate-500">
                        Select a scenario to generate the first run.
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
                    <h2 className="text-sm font-semibold">Baseline control</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Promote the latest completed run when the new performance level is accepted.
                    </p>
                    <button
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      disabled={!latestRun || promoteMutation.isPending}
                      onClick={() => latestRun && promoteMutation.mutate(latestRun.id)}
                    >
                      <CheckCircle2 size={16} />
                      Promote Latest Run
                    </button>
                  </div>
                </section>
              )}

              {activePage === "Scenarios" && (
                <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {dashboard.scenarios.map((scenario) => (
                    <article
                      key={scenario.id}
                      className="rounded-md border border-slate-200 bg-white p-4 shadow-panel"
                    >
                      <h2 className="text-sm font-semibold">{scenario.name}</h2>
                      <p className="mt-2 min-h-16 text-sm text-slate-500">
                        {scenario.description}
                      </p>
                      <div className="mt-4 text-xs text-slate-500">
                        {scenario.requestCount} requests · {scenario.targetPath}
                      </div>
                      <button
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-medium text-white hover:bg-ink-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        onClick={() => runMutation.mutate(scenario.id)}
                        disabled={runMutation.isPending}
                      >
                        <PlayCircle size={16} />
                        Run
                      </button>
                    </article>
                  ))}
                </section>
              )}

              {activePage === "Runs" && (
                <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
                  <div className="border-b border-slate-200 px-4 py-3">
                    <h2 className="text-sm font-semibold">Benchmark runs</h2>
                  </div>
                  <RunTable runs={dashboard.runs} />
                </section>
              )}

              {activePage === "Budgets" && (
                <section className="mt-6 grid gap-4 md:grid-cols-2">
                  <BudgetCard
                    title="p95 latency"
                    warn={`${dashboard.budgets.p95LatencyMs.warnThreshold}ms`}
                    fail={`${dashboard.budgets.p95LatencyMs.failThreshold}ms`}
                  />
                  <BudgetCard
                    title="Error rate"
                    warn={`${dashboard.budgets.errorRate.warnThreshold}%`}
                    fail={`${dashboard.budgets.errorRate.failThreshold}%`}
                  />
                </section>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-medium uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink-950">{value}</div>
    </div>
  );
}

function BudgetCard({
  title,
  warn,
  fail
}: {
  title: string;
  warn: string;
  fail: string;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex items-center gap-2">
        <ShieldCheck size={18} />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Metric label="Warn at" value={warn} />
        <Metric label="Fail at" value={fail} />
      </div>
    </article>
  );
}

