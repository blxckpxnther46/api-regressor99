import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = "seed-password-hash";

  const user = await prisma.user.upsert({
    where: { email: "owner@regressor99.local" },
    update: { name: "Seed Owner", passwordHash },
    create: {
      email: "owner@regressor99.local",
      name: "Seed Owner",
      passwordHash
    }
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "acme" },
    update: { name: "Acme API Team" },
    create: {
      name: "Acme API Team",
      slug: "acme"
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id
      }
    },
    update: { role: "OWNER" },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "OWNER"
    }
  });

  const project = await prisma.project.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "acme-api"
      }
    },
    update: {
      name: "Acme API",
      defaultBaseUrl: "https://api.acme.test"
    },
    create: {
      organizationId: organization.id,
      name: "Acme API",
      slug: "acme-api",
      description: "Seed project for local backend work",
      defaultBaseUrl: "https://api.acme.test"
    }
  });

  const suite = await prisma.benchmarkSuite.upsert({
    where: { id: "seed-suite" },
    update: {
      name: "Core API Smoke Suite",
      targetBaseUrl: "https://api.acme.test"
    },
    create: {
      id: "seed-suite",
      organizationId: organization.id,
      projectId: project.id,
      name: "Core API Smoke Suite",
      description: "Seed suite for benchmark workflow",
      targetBaseUrl: "https://api.acme.test"
    }
  });

  const suiteVersion = await prisma.benchmarkSuiteVersion.upsert({
    where: {
      suiteId_versionNumber: {
        suiteId: suite.id,
        versionNumber: 1
      }
    },
    update: {
      loadProfile: {
        concurrency: 5,
        durationSeconds: 60,
        warmupRequests: 10
      },
      configHash: "seed-suite-version-v1"
    },
    create: {
      organizationId: organization.id,
      suiteId: suite.id,
      versionNumber: 1,
      loadProfile: {
        concurrency: 5,
        durationSeconds: 60,
        warmupRequests: 10
      },
      configHash: "seed-suite-version-v1",
      createdByUserId: user.id
    }
  });

  const endpoint = await prisma.benchmarkEndpoint.upsert({
    where: { id: "seed-endpoint" },
    update: {
      name: "List Orders",
      method: "GET",
      path: "/v1/orders",
      expectedStatus: 200
    },
    create: {
      id: "seed-endpoint",
      organizationId: organization.id,
      suiteVersionId: suiteVersion.id,
      name: "List Orders",
      method: "GET",
      path: "/v1/orders",
      expectedStatus: 200,
      timeoutMs: 3000
    }
  });

  const run = await prisma.benchmarkRun.upsert({
    where: { id: "seed-run" },
    update: {
      executionStatus: "COMPLETED",
      decisionStatus: "PASSED",
      targetBaseUrl: "https://api.acme.test"
    },
    create: {
      id: "seed-run",
      organizationId: organization.id,
      projectId: project.id,
      suiteId: suite.id,
      suiteVersionId: suiteVersion.id,
      triggeredByUserId: user.id,
      triggerSource: "MANUAL",
      environment: "staging",
      targetBaseUrl: "https://api.acme.test",
      executionStatus: "COMPLETED",
      decisionStatus: "PASSED",
      startedAt: new Date("2026-01-01T10:00:00.000Z"),
      finishedAt: new Date("2026-01-01T10:01:00.000Z"),
      metadata: {
        seed: true,
        runner: "internal-http"
      }
    }
  });

  await prisma.benchmarkRunMetric.upsert({
    where: { id: "seed-run-metric" },
    update: {
      requestCount: 600,
      successCount: 600,
      errorCount: 0,
      averageLatencyMs: 85,
      p50LatencyMs: 80,
      p95LatencyMs: 120,
      p99LatencyMs: 145,
      minLatencyMs: 52,
      maxLatencyMs: 180,
      throughputRps: 10,
      errorRate: 0
    },
    create: {
      id: "seed-run-metric",
      organizationId: organization.id,
      runId: run.id,
      endpointId: endpoint.id,
      requestCount: 600,
      successCount: 600,
      errorCount: 0,
      averageLatencyMs: 85,
      p50LatencyMs: 80,
      p95LatencyMs: 120,
      p99LatencyMs: 145,
      minLatencyMs: 52,
      maxLatencyMs: 180,
      throughputRps: 10,
      errorRate: 0
    }
  });

  const budget = await prisma.performanceBudget.upsert({
    where: { id: "seed-budget" },
    update: {
      warnThreshold: 140,
      failThreshold: 200
    },
    create: {
      id: "seed-budget",
      organizationId: organization.id,
      projectId: project.id,
      suiteId: suite.id,
      endpointId: endpoint.id,
      name: "List Orders p95",
      metric: "P95_LATENCY",
      operator: "LESS_THAN_OR_EQUAL",
      warnThreshold: 140,
      failThreshold: 200,
      unit: "ms",
      isHard: true,
      isEnabled: true
    }
  });

  const baseline = await prisma.baseline.upsert({
    where: { id: "seed-baseline" },
    update: {
      sourceRunId: run.id,
      activeTo: null,
      isActive: true
    },
    create: {
      id: "seed-baseline",
      organizationId: organization.id,
      projectId: project.id,
      suiteId: suite.id,
      suiteVersionId: suiteVersion.id,
      sourceRunId: run.id,
      environment: "staging",
      versionNumber: 1,
      isActive: true,
      reason: "Initial seed baseline",
      promotedByUserId: user.id,
      activeFrom: new Date("2026-01-01T10:05:00.000Z")
    }
  });

  await prisma.baselineMetric.upsert({
    where: { id: "seed-baseline-metric" },
    update: {
      requestCount: 600,
      averageLatencyMs: 85,
      p50LatencyMs: 80,
      p95LatencyMs: 120,
      p99LatencyMs: 145,
      throughputRps: 10,
      errorRate: 0
    },
    create: {
      id: "seed-baseline-metric",
      organizationId: organization.id,
      baselineId: baseline.id,
      endpointId: endpoint.id,
      requestCount: 600,
      averageLatencyMs: 85,
      p50LatencyMs: 80,
      p95LatencyMs: 120,
      p99LatencyMs: 145,
      throughputRps: 10,
      errorRate: 0
    }
  });

  await prisma.budgetEvaluation.deleteMany({
    where: {
      budgetId: budget.id,
      runId: run.id
    }
  });

  await prisma.budgetEvaluation.create({
    data: {
      organizationId: organization.id,
      runId: run.id,
      budgetId: budget.id,
      metric: "P95_LATENCY",
      actualValue: 120,
      warnThreshold: 140,
      failThreshold: 200,
      result: "PASS"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
