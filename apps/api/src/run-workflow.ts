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
import { createApiKey, revokeApiKey } from "./modules/api-keys/api-keys.service.js";
import { createCiCdBenchmarkRun } from "./modules/ci-cd/ci-cd.service.js";
import { generateRunAiAnalysis } from "./modules/ai-analysis/ai-analysis.service.js";

async function assertThrows(promise: Promise<any>, expectedCode: string) {
  try {
    await promise;
    throw new Error(`Expected error code ${expectedCode} but no error was thrown.`);
  } catch (error: any) {
    if (error.code === expectedCode) {
      console.log(` ✓ Successfully rejected: ${expectedCode}`);
    } else {
      throw new Error(`Expected error code ${expectedCode} but got ${error.code} (${error.message})`);
    }
  }
}

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

    console.log(`\n--- Step 10b: AI Analysis Generation & Caching ---`);
    const aiAnalysis1 = await generateRunAiAnalysis(userId, run2.id);
    console.log(`AI Insight 1 Generated (ID: ${aiAnalysis1.id}, Model: ${aiAnalysis1.model}, Provider: ${aiAnalysis1.provider})`);
    
    const aiAnalysis2 = await generateRunAiAnalysis(userId, run2.id);
    console.log(`AI Insight 2 Generated (ID: ${aiAnalysis2.id}, Model: ${aiAnalysis2.model}, Provider: ${aiAnalysis2.provider})`);

    if (aiAnalysis1.id === aiAnalysis2.id) {
      console.log(` ✓ Successfully cached: Insight IDs match!`);
    } else {
      throw new Error(`Caching failed: Insight IDs did not match! (${aiAnalysis1.id} !== ${aiAnalysis2.id})`);
    }

    const output = aiAnalysis1.output as any;
    console.log(`Summary: ${output.summary}`);
    console.log(`What Happened:\n${output.whatHappened.map((item: string) => `  - ${item}`).join("\n")}`);
    console.log(`Likely Causes:\n${output.likelyCauses.map((item: string) => `  - ${item}`).join("\n")}`);
    console.log(`Recommended Fixes:\n${output.recommendedFixes.map((item: string) => `  - ${item}`).join("\n")}`);
    console.log(`Risk Level: ${output.riskLevel}`);
    console.log(`Next Steps:\n${output.nextSteps.map((item: string) => `  - ${item}`).join("\n")}`);

    console.log(`\n--- Step 11: CI/CD & API Keys Engine Tests ---`);
    
    console.log(`Creating valid scoped API key...`);
    const validApiKey = await createApiKey(userId, organizationId, {
      name: "CI/CD Scoped Key",
      projectId,
      scopes: ["benchmark_runs:create", "deployments:create"]
    });
    console.log(`Created API Key (ID: ${validApiKey.id}, Prefix: ${validApiKey.keyPrefix})`);

    console.log(`Triggering CI/CD Run using valid API key...`);
    const ciRun = await createCiCdBenchmarkRun(validApiKey.key, {
      projectId,
      suiteId,
      environment: "production",
      deployment: {
        commitSha: "sha123_workflow",
        branch: "ci-branch"
      }
    });
    console.log(`Successfully triggered CI benchmark run: ${ciRun.id} (Deployment ID: ${ciRun.deploymentId})`);

    console.log(`Testing missing scope restriction...`);
    const readOnlyKey = await createApiKey(userId, organizationId, {
      name: "Read-Only Key",
      projectId,
      scopes: ["projects:read"]
    });
    await assertThrows(
      createCiCdBenchmarkRun(readOnlyKey.key, {
        projectId,
        suiteId,
        environment: "production"
      }),
      "API_KEY_SCOPE_REQUIRED"
    );

    console.log(`Testing project access boundary...`);
    const otherProject = await createProject(userId, {
      organizationId,
      name: "Other Project",
      slug: `other-proj-${Date.now()}`,
      defaultBaseUrl: `http://127.0.0.1:${mockPort}`
    });
    const keyForOtherProject = await createApiKey(userId, organizationId, {
      name: "Other Project Key",
      projectId: otherProject.id,
      scopes: ["benchmark_runs:create"]
    });
    await assertThrows(
      createCiCdBenchmarkRun(keyForOtherProject.key, {
        projectId,
        suiteId,
        environment: "production"
      }),
      "API_KEY_PROJECT_FORBIDDEN"
    );

    console.log(`Testing revoked key rejection...`);
    await revokeApiKey(userId, validApiKey.id);
    console.log(`Revoked the valid API Key.`);
    await assertThrows(
      createCiCdBenchmarkRun(validApiKey.key, {
        projectId,
        suiteId,
        environment: "production"
      }),
      "API_KEY_INVALID"
    );

    console.log(`Testing unverified target restriction...`);
    const unverifiedSuite = await createBenchmarkSuite(userId, otherProject.id, {
      name: "Unverified Suite",
      targetBaseUrl: `http://127.0.0.1:${mockPort}`,
      loadProfile: { requestCount: 1 },
      endpoints: [
        {
          name: "Verify Endpoint",
          method: "GET",
          path: "/v1/orders",
          expectedStatus: 200,
          timeoutMs: 3000
        }
      ]
    });
    const globalKey = await createApiKey(userId, organizationId, {
      name: "Global CI Key",
      scopes: ["benchmark_runs:create"]
    });
    await assertThrows(
      createCiCdBenchmarkRun(globalKey.key, {
        projectId: otherProject.id,
        suiteId: unverifiedSuite.id,
        environment: "production"
      }),
      "TARGET_NOT_VERIFIED"
    );

    console.log(`\n--- Step 12: List All Generated Activity Logs ---`);
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
