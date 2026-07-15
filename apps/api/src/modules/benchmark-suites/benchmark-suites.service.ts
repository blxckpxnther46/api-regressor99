import { createHash } from "node:crypto";
import { HttpMethod, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { runInTransaction } from "../../db/transaction.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ActivityAction } from "../activity-logs/activity-logs.service.js";
import { requireMembership } from "../organizations/organizations.service.js";
import { getProject } from "../projects/projects.service.js";

const endpointSelect = {
  id: true,
  organizationId: true,
  suiteVersionId: true,
  name: true,
  method: true,
  path: true,
  headers: true,
  queryParams: true,
  body: true,
  expectedStatus: true,
  assertions: true,
  timeoutMs: true,
  createdAt: true
} satisfies Prisma.BenchmarkEndpointSelect;

const versionSelect = {
  id: true,
  organizationId: true,
  suiteId: true,
  versionNumber: true,
  loadProfile: true,
  configHash: true,
  createdByUserId: true,
  endpoints: {
    select: endpointSelect,
    orderBy: { createdAt: "asc" }
  },
  createdAt: true
} satisfies Prisma.BenchmarkSuiteVersionSelect;

const suiteSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  name: true,
  description: true,
  targetBaseUrl: true,
  isActive: true,
  versions: {
    select: versionSelect,
    orderBy: { versionNumber: "desc" },
    take: 1
  },
  createdAt: true,
  updatedAt: true
} satisfies Prisma.BenchmarkSuiteSelect;

type EndpointInput = {
  name: string;
  method: HttpMethod;
  path: string;
  headers?: Record<string, unknown>;
  queryParams?: Record<string, unknown>;
  body?: unknown;
  expectedStatus: number;
  assertions?: Record<string, unknown>;
  timeoutMs: number;
};

type VersionInput = {
  loadProfile: Record<string, unknown>;
  endpoints: EndpointInput[];
};

type CreateSuiteInput = VersionInput & {
  name: string;
  description?: string;
  targetBaseUrl: string;
};

export async function createBenchmarkSuite(
  userId: string,
  projectId: string,
  input: CreateSuiteInput
) {
  const project = await getWritableProject(userId, projectId);

  return runInTransaction(async (tx) => {
    const suite = await tx.benchmarkSuite.create({
      data: {
        organizationId: project.organizationId,
        projectId: project.id,
        name: input.name,
        description: input.description,
        targetBaseUrl: input.targetBaseUrl
      },
      select: { id: true }
    });

    await createVersion(tx, {
      organizationId: project.organizationId,
      suiteId: suite.id,
      versionNumber: 1.1,
      createdByUserId: userId,
      loadProfile: input.loadProfile,
      endpoints: input.endpoints
    });

    await tx.activityLog.create({
      data: {
        organizationId: project.organizationId,
        actorUserId: userId,
        action: ActivityAction.SuiteCreated,
        entityType: "benchmark_suite",
        entityId: suite.id,
        metadata: { versionNumber: 1.1 }
      }
    });

    return tx.benchmarkSuite.findUniqueOrThrow({
      where: { id: suite.id },
      select: suiteSelect
    });
  });
}

export async function listBenchmarkSuites(userId: string, projectId: string) {
  const project = await getProject(userId, projectId);

  return prisma.benchmarkSuite.findMany({
    where: { projectId: project.id, isActive: true },
    select: suiteSelect,
    orderBy: { createdAt: "desc" }
  });
}

export async function getBenchmarkSuite(userId: string, suiteId: string) {
  const suite = await prisma.benchmarkSuite.findUnique({
    where: { id: suiteId },
    select: suiteSelect
  });

  if (!suite || !suite.isActive) {
    throw new AppError(404, "BENCHMARK_SUITE_NOT_FOUND", "Benchmark suite not found.");
  }

  await requireMembership(userId, suite.organizationId);

  return suite;
}

export async function createBenchmarkSuiteVersion(
  userId: string,
  suiteId: string,
  input: VersionInput
) {
  const suite = await getWritableSuite(userId, suiteId);

  return runInTransaction(async (tx) => {
    const latest = await tx.benchmarkSuiteVersion.findFirst({
      where: { suiteId },
      select: { versionNumber: true },
      orderBy: { versionNumber: "desc" }
    });

    const versionNumber = nextSuiteVersionNumber(latest?.versionNumber);

    await createVersion(tx, {
      organizationId: suite.organizationId,
      suiteId,
      versionNumber,
      createdByUserId: userId,
      loadProfile: input.loadProfile,
      endpoints: input.endpoints
    });

    await tx.activityLog.create({
      data: {
        organizationId: suite.organizationId,
        actorUserId: userId,
        action: ActivityAction.SuiteVersionCreated,
        entityType: "benchmark_suite",
        entityId: suiteId,
        metadata: { versionNumber }
      }
    });

    return tx.benchmarkSuite.findUniqueOrThrow({
      where: { id: suiteId },
      select: suiteSelect
    });
  });
}

export async function archiveBenchmarkSuite(userId: string, suiteId: string) {
  await getWritableSuite(userId, suiteId);

  return prisma.benchmarkSuite.update({
    where: { id: suiteId },
    data: { isActive: false },
    select: suiteSelect
  });
}

export function nextSuiteVersionNumber(currentLatest?: number) {
  if (currentLatest === undefined) {
    return 1.1;
  }
  return Number((currentLatest + 0.1).toFixed(1));
}

async function getWritableProject(userId: string, projectId: string) {
  const project = await getProject(userId, projectId);
  const membership = await requireMembership(userId, project.organizationId);

  if (!["OWNER", "ADMIN", "DEVELOPER"].includes(membership.role)) {
    throw new AppError(
      403,
      "BENCHMARK_SUITE_FORBIDDEN",
      "You cannot modify benchmark suites for this project."
    );
  }

  return project;
}

async function getWritableSuite(userId: string, suiteId: string) {
  const suite = await prisma.benchmarkSuite.findUnique({
    where: { id: suiteId },
    select: {
      id: true,
      organizationId: true,
      isActive: true
    }
  });

  if (!suite || !suite.isActive) {
    throw new AppError(404, "BENCHMARK_SUITE_NOT_FOUND", "Benchmark suite not found.");
  }

  const membership = await requireMembership(userId, suite.organizationId);

  if (!["OWNER", "ADMIN", "DEVELOPER"].includes(membership.role)) {
    throw new AppError(
      403,
      "BENCHMARK_SUITE_FORBIDDEN",
      "You cannot modify benchmark suites for this project."
    );
  }

  return suite;
}

async function createVersion(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    suiteId: string;
    versionNumber: number;
    createdByUserId: string;
    loadProfile: Record<string, unknown>;
    endpoints: EndpointInput[];
  }
) {
  const version = await tx.benchmarkSuiteVersion.create({
    data: {
      organizationId: input.organizationId,
      suiteId: input.suiteId,
      versionNumber: input.versionNumber,
      loadProfile: input.loadProfile as Prisma.InputJsonObject,
      configHash: hashConfig({
        loadProfile: input.loadProfile,
        endpoints: input.endpoints
      }),
      createdByUserId: input.createdByUserId
    },
    select: { id: true }
  });

  await tx.benchmarkEndpoint.createMany({
    data: input.endpoints.map((endpoint) => ({
      organizationId: input.organizationId,
      suiteVersionId: version.id,
      name: endpoint.name,
      method: endpoint.method,
      path: endpoint.path,
      headers: endpoint.headers as Prisma.InputJsonObject | undefined,
      queryParams: endpoint.queryParams as Prisma.InputJsonObject | undefined,
      body: endpoint.body as Prisma.InputJsonValue | undefined,
      expectedStatus: endpoint.expectedStatus,
      assertions: endpoint.assertions as Prisma.InputJsonObject | undefined,
      timeoutMs: endpoint.timeoutMs
    }))
  });
}

function hashConfig(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
