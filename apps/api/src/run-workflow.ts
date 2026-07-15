import { createServer } from "node:http";
import { prisma } from "./db/prisma.js";
import { register } from "./modules/auth/auth.service.js";
import { createProject } from "./modules/projects/projects.service.js";
import { createTargetVerification, verifyTarget } from "./modules/target-verification/target-verification.service.js";
import { createBenchmarkSuite } from "./modules/benchmark-suites/benchmark-suites.service.js";
import { createPerformanceBudget } from "./modules/performance-budgets/performance-budgets.service.js";
import { createBenchmarkRun, executeBenchmarkRun } from "./modules/benchmark-runs/benchmark-runs.service.js";
import { promoteRunToBaseline } from "./modules/baselines/baselines.service.js";
import { detectRegressionsForRun } from "./modules/regressions/regressions.service.js";
import { listActivityLogs } from "./modules/activity-logs/activity-logs.service.js";

async function main() {
  const mockPort = 9999;
  let verificationToken = "";
  let requestDelayMs = 0; // Configurable response delay to simulate latency regressions

  // 1. Start Mock Server to handle target verification and benchmark endpoints
  const server = createServer((req, res) => {
    if (req.url === "/.well-known/regressor99-verification.txt") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(verificationToken);
    } else if (req.url === "/v1/orders") {
      setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "success", orders: [] }));
      }, requestDelayMs);
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(mockPort, "127.0.0.1");
  console.log(`[Mock Server] Running on http://127.0.0.1:${mockPort}`);

  try {
    const email = `workflow-owner-${Date.now()}@regressor99.local`;
    console.log(`\n--- Step 1: User Registration ---`);
    const regResult = await register({
      name: "Workflow Owner",
      email,
      password: "password123!",
      organizationName: "Workflow Org"
    });
    const userId = regResult.user.id;
    const organizationId = regResult.organization.id;
    console.log(`Registered user ${userId} in org ${organizationId}`);

    console.log(`\n--- Step 2: Project Creation ---`);
    const project = await createProject(userId, {
      organizationId,
      name: "Workflow Project",
      slug: `workflow-proj-${Date.now()}`,
      defaultBaseUrl: `http://127.0.0.1:${mockPort}`
    });
    const projectId = project.id;
    console.log(`Created project: ${project.name} (ID: ${projectId})`);

    console.log(`\n--- Step 3: Target Verification Setup ---`);
    const verificationSetup = await createTargetVerification(userId, projectId, {
      targetBaseUrl: `http://127.0.0.1:${mockPort}`,
      method: "WELL_KNOWN"
    });
    verificationToken = verificationSetup.token;
    console.log(`Generated verification token: ${verificationToken}`);

    console.log(`\n--- Step 4: Verify Target ---`);
    const verificationResult = await verifyTarget(userId, projectId);
    console.log(`Target status: ${verificationResult.status}`);

    console.log(`\n--- Step 5: Benchmark Suite Creation ---`);
    const suite = await createBenchmarkSuite(userId, projectId, {
      name: "Core Workflow Suite",
      targetBaseUrl: `http://127.0.0.1:${mockPort}`,
      loadProfile: {
        concurrency: 2,
        warmupRequests: 1,
        requestCount: 4
      },
      endpoints: [
        {
          name: "List Orders",
          method: "GET",
          path: "/v1/orders",
          expectedStatus: 200,
          timeoutMs: 3000
        }
      ]
    });
    const suiteId = suite.id;
    console.log(`Created benchmark suite: ${suite.name} (ID: ${suiteId})`);

    console.log(`\n--- Step 6: Performance Budget Creation ---`);
    const budget = await createPerformanceBudget(userId, projectId, {
      suiteId,
      name: "List Orders p95 Limit",
      metric: "P95_LATENCY",
      operator: "LESS_THAN_OR_EQUAL",
      warnThreshold: 50,
      failThreshold: 100,
      unit: "ms",
      isHard: true
    });
    console.log(`Created performance budget for P95 latency (fail threshold: ${budget.failThreshold}ms)`);

    console.log(`\n--- Step 7: Trigger & Execute Run 1 (Baseline Run) ---`);
    requestDelayMs = 10; // 10ms response delay
    const run1 = await createBenchmarkRun(userId, suiteId, {
      environment: "staging"
    });
    console.log(`Created Run 1: ${run1.id}`);
    const completedRun1 = await executeBenchmarkRun(userId, run1.id);
    console.log(`Run 1 Execution Status: ${completedRun1.executionStatus}`);

    console.log(`\n--- Step 8: Promote Run 1 to Baseline ---`);
    const baseline = await promoteRunToBaseline(userId, run1.id, {
      reason: "Initial stable run baseline"
    });
    console.log(`Baseline promoted successfully (ID: ${baseline.id}, version: ${baseline.versionNumber})`);

    console.log(`\n--- Step 9: Trigger & Execute Run 2 (Simulate Latency Regression) ---`);
    requestDelayMs = 250; // Increased to 250ms, triggering budget warning/fail and regression
    const run2 = await createBenchmarkRun(userId, suiteId, {
      environment: "staging"
    });
    console.log(`Created Run 2: ${run2.id}`);
    const completedRun2 = await executeBenchmarkRun(userId, run2.id);
    console.log(`Run 2 Execution Status: ${completedRun2.executionStatus}`);

    console.log(`\n--- Step 10: Regression Detection ---`);
    const regressions = await detectRegressionsForRun(userId, run2.id);
    console.log(`Detected regressions count: ${regressions.length}`);
    for (const reg of regressions) {
      console.log(` - Regression type: ${reg.type}, baseline: ${reg.baselineValue}ms, current: ${reg.currentValue}ms (+${reg.changePercent.toFixed(1)}%)`);
    }

    console.log(`\n--- Step 11: List Generated Activity Logs ---`);
    const logs = await listActivityLogs(userId, organizationId, {});
    console.log(`Total activity logs generated for org: ${logs.length}`);
    for (const log of logs) {
      console.log(`[${log.createdAt.toISOString()}] Action: ${log.action} | Entity: ${log.entityType} (${log.entityId}) | Meta: ${JSON.stringify(log.metadata)}`);
    }

  } catch (error) {
    console.error("Workflow failed with error:", error);
  } finally {
    server.close();
    await prisma.$disconnect();
    console.log("\n[Mock Server] Closed. DB disconnected.");
  }
}

main();
