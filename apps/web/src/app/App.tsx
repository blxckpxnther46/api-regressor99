import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  GitBranch,
  PlayCircle,
  ShieldCheck
} from "lucide-react";
import { StatCard } from "../components/ui/StatCard";
import { StatusPill } from "../components/ui/StatusPill";

const runs = [
  {
    id: "run_001",
    suite: "Checkout Critical Path",
    deployment: "abc123",
    status: "FAILED",
    p95: "342ms",
    change: "+61%",
    time: "8 min ago"
  },
  {
    id: "run_002",
    suite: "Payment Auth",
    deployment: "def456",
    status: "WARNED",
    p95: "218ms",
    change: "+18%",
    time: "31 min ago"
  },
  {
    id: "run_003",
    suite: "User Session",
    deployment: "9fc201",
    status: "PASSED",
    p95: "94ms",
    change: "-4%",
    time: "1 hr ago"
  }
];

const navItems = [
  { label: "Dashboard", icon: Activity },
  { label: "Projects", icon: Gauge },
  { label: "Benchmark Runs", icon: PlayCircle },
  { label: "Regressions", icon: AlertTriangle },
  { label: "Budgets", icon: ShieldCheck }
];

export function App() {
  return (
    <main className="min-h-screen bg-slate-50 text-ink-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-ink-950 text-white">
            <Gauge size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold">Regressor99</div>
            <div className="text-xs text-slate-500">Performance control</div>
          </div>
        </div>

        <nav className="mt-8 space-y-1 text-sm">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left font-medium text-slate-700 hover:bg-slate-100"
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
                Deployment Performance
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Payment API · staging · latest deployment
              </p>
            </div>
            <button className="inline-flex items-center justify-center gap-2 rounded-md bg-ink-950 px-3 py-2 text-sm font-medium text-white hover:bg-ink-800">
              <PlayCircle size={16} />
              Trigger Run
            </button>
          </div>
        </header>

        <div className="px-5 py-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Decision"
              value="Needs Review"
              detail="Regression detected, budget passed"
              icon={AlertTriangle}
              tone="amber"
            />
            <StatCard
              label="Active Baseline"
              value="180ms"
              detail="Checkout p95 latency"
              icon={CheckCircle2}
              tone="green"
            />
            <StatCard
              label="Latest Run"
              value="260ms"
              detail="p95 latency, +44.4%"
              icon={Clock3}
              tone="blue"
            />
            <StatCard
              label="Open Regressions"
              value="3"
              detail="1 high severity"
              icon={GitBranch}
              tone="red"
            />
          </div>

          <section className="mt-6 overflow-hidden rounded-md border border-slate-200 bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Recent benchmark runs</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Run decisions are separated from technical execution status.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Suite</th>
                    <th className="px-4 py-3 font-medium">Deployment</th>
                    <th className="px-4 py-3 font-medium">Decision</th>
                    <th className="px-4 py-3 font-medium">p95</th>
                    <th className="px-4 py-3 font-medium">Change</th>
                    <th className="px-4 py-3 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-ink-900">
                        {run.suite}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {run.deployment}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={run.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-700">{run.p95}</td>
                      <td className="px-4 py-3 text-slate-700">{run.change}</td>
                      <td className="px-4 py-3 text-slate-500">{run.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
