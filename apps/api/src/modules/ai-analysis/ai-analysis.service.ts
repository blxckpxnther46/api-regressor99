import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { AppError } from "../../shared/errors/app-error.js";
import { ActivityAction, logActivity } from "../activity-logs/activity-logs.service.js";
import { requireMembership } from "../organizations/organizations.service.js";

const PROMPT_VERSION = "run-analysis-v1";
const AI_PROVIDER = "nvidia";
// ponytail: request-path AI; move to background jobs if analyses need longer retries.
const MAX_PROVIDER_ATTEMPTS = 2;
const PROVIDER_TIMEOUT_MS = 10_000;

const aiInsightSelect = {
  id: true,
  organizationId: true,
  projectId: true,
  runId: true,
  promptVersion: true,
  provider: true,
  model: true,
  inputFacts: true,
  output: true,
  rawText: true,
  failureCount: true,
  createdAt: true
} satisfies Prisma.AiInsightSelect;

type AiOutput = {
  summary: string;
  whatHappened: string[];
  likelyCauses: string[];
  recommendedFixes: string[];
  whatToKeep: string[];
  riskLevel: "low" | "medium" | "high" | "critical" | "unknown";
  nextSteps: string[];
  providerErrors?: string[];
};

type ProviderResult = {
  model: string;
  rawText: string;
  output: AiOutput;
  failureCount: number;
};

let modelCursor = 0;

export async function listRunAiAnalyses(userId: string, runId: string) {
  const run = await getRunForAuthorization(runId);
  await requireMembership(userId, run.organizationId);

  return prisma.aiInsight.findMany({
    where: { runId: run.id },
    select: aiInsightSelect,
    orderBy: { createdAt: "desc" },
    take: 20
  });
}

export async function generateRunAiAnalysis(userId: string, runId: string) {
  const run = await getRunFacts(runId);

  if (!run) {
    throw new AppError(404, "BENCHMARK_RUN_NOT_FOUND", "Benchmark run not found.");
  }

  await requireMembership(userId, run.organizationId);

  const cachedInsight = await prisma.aiInsight.findFirst({
    where: { runId: run.id, promptVersion: PROMPT_VERSION },
    select: aiInsightSelect,
    orderBy: { createdAt: "desc" }
  });

  if (cachedInsight) {
    return cachedInsight;
  }

  const inputFacts = buildInputFacts(run);
  const providerResult = await generateProviderAnalysis(inputFacts);

  const insight = await prisma.aiInsight.create({
    data: {
      organizationId: run.organizationId,
      projectId: run.projectId,
      runId: run.id,
      promptVersion: PROMPT_VERSION,
      provider: AI_PROVIDER,
      model: providerResult.model,
      inputFacts: inputFacts as Prisma.InputJsonObject,
      output: providerResult.output as Prisma.InputJsonObject,
      rawText: providerResult.rawText,
      failureCount: providerResult.failureCount
    },
    select: aiInsightSelect
  });

  await logActivity({
    organizationId: run.organizationId,
    actorUserId: userId,
    action: ActivityAction.AiInsightGenerated,
    entityType: "benchmark_run",
    entityId: run.id,
    metadata: {
      provider: AI_PROVIDER,
      model: providerResult.model,
      failureCount: providerResult.failureCount
    }
  });

  return insight;
}

export function getOrderedModels(models = parseConfiguredModels()) {
  if (models.length === 0) {
    return [];
  }

  const start = modelCursor % models.length;
  modelCursor += 1;
  return [...models.slice(start), ...models.slice(0, start)];
}

export function parseAiOutput(rawText: string): AiOutput {
  const stripped = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped) as Partial<AiOutput>;
    return normalizeAiOutput(parsed, rawText);
  } catch {
    return normalizeAiOutput({ summary: rawText }, rawText);
  }
}

async function generateProviderAnalysis(inputFacts: Prisma.InputJsonObject) {
  const models = getOrderedModels();

  if (!env.NVIDIA_API_KEY || models.length === 0) {
    return {
      model: "fallback",
      rawText: "NVIDIA provider is not configured.",
      output: buildFallbackOutput(inputFacts, ["NVIDIA provider is not configured."]),
      failureCount: 1
    };
  }

  const prompt = buildPrompt(inputFacts);
  const providerErrors: string[] = [];

  for (const model of models.slice(0, MAX_PROVIDER_ATTEMPTS)) {
    try {
      const rawText = await callNvidiaChatCompletions(model, prompt);
      return {
        model,
        rawText,
        output: parseAiOutput(rawText),
        failureCount: providerErrors.length
      };
    } catch (error) {
      providerErrors.push(`${model}: ${errorMessage(error)}`);
    }
  }

  return {
    model: "fallback",
    rawText: providerErrors.join("\n"),
    output: buildFallbackOutput(inputFacts, providerErrors),
    failureCount: providerErrors.length
  };
}

async function callNvidiaChatCompletions(model: string, prompt: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const response = await fetch(env.NVIDIA_BASE_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.NVIDIA_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content:
              "You are Regressor99's performance analysis assistant. The deterministic budget, regression, baseline, and decision engines are the source of truth. Explain their result and suggest practical engineering actions. Return strict JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`NVIDIA API returned ${response.status}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("NVIDIA API returned empty content.");
    }

    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function parseConfiguredModels() {
  return env.NVIDIA_AI_MODELS.split(",")
    .map((model) => model.trim())
    .filter(Boolean);
}

function buildPrompt(inputFacts: Prisma.InputJsonObject) {
  return [
    "Analyze this benchmark run using only the facts below.",
    "Return strict JSON with these keys:",
    "summary: string",
    "whatHappened: string[]",
    "likelyCauses: string[]",
    "recommendedFixes: string[]",
    "whatToKeep: string[]",
    "riskLevel: one of low, medium, high, critical, unknown",
    "nextSteps: string[]",
    "Explain why the issue may have happened, what can be improved, and what should be preserved.",
    JSON.stringify(inputFacts)
  ].join("\n");
}

function buildInputFacts(run: NonNullable<Awaited<ReturnType<typeof getRunFacts>>>) {
  return {
    run: {
      id: run.id,
      projectId: run.projectId,
      suiteId: run.suiteId,
      deploymentId: run.deploymentId,
      triggerSource: run.triggerSource,
      environment: run.environment,
      targetOrigin: safeOrigin(run.targetBaseUrl),
      executionStatus: run.executionStatus,
      decisionStatus: run.decisionStatus,
      failureReason: run.failureReason,
      startedAt: run.startedAt?.toISOString() ?? null,
      finishedAt: run.finishedAt?.toISOString() ?? null
    },
    metrics: run.metrics.map((metric) => ({
      endpointId: metric.endpointId,
      endpoint: metric.endpoint
        ? { method: metric.endpoint.method, path: metric.endpoint.path }
        : null,
      requestCount: metric.requestCount,
      successCount: metric.successCount,
      errorCount: metric.errorCount,
      averageLatencyMs: metric.averageLatencyMs,
      p50LatencyMs: metric.p50LatencyMs,
      p95LatencyMs: metric.p95LatencyMs,
      p99LatencyMs: metric.p99LatencyMs,
      throughputRps: metric.throughputRps,
      errorRate: metric.errorRate
    })),
    budgetEvaluations: run.budgetEvaluations.map((evaluation) => ({
      metric: evaluation.metric,
      actualValue: evaluation.actualValue,
      warnThreshold: evaluation.warnThreshold,
      failThreshold: evaluation.failThreshold,
      result: evaluation.result,
      budget: {
        name: evaluation.budget.name,
        isHard: evaluation.budget.isHard,
        unit: evaluation.budget.unit
      }
    })),
    regressions: dedupeRegressionFacts(
      run.regressions.map((regression) => ({
        type: regression.type,
        metric: regression.metric,
        endpointId: regression.endpointId,
        baselineValue: regression.baselineValue,
        currentValue: regression.currentValue,
        changePercent: regression.changePercent,
        severity: regression.severity,
        status: regression.status
      }))
    ),
    activeDecisionExceptions: run.decisionExceptions.map((exception) => ({
      reason: exception.reason,
      expiresAt: exception.expiresAt.toISOString(),
      createdAt: exception.createdAt.toISOString()
    }))
  };
}

function buildFallbackOutput(
  inputFacts: Prisma.InputJsonObject,
  providerErrors: string[]
): AiOutput {
  const facts = inputFacts as {
    run?: { executionStatus?: string; decisionStatus?: string; failureReason?: string | null };
    metrics?: Array<{ p95LatencyMs?: number; errorRate?: number; throughputRps?: number }>;
    regressions?: Array<{ metric?: string; severity?: string; changePercent?: number }>;
    budgetEvaluations?: Array<{ metric?: string; result?: string }>;
  };
  const regressions = dedupeRegressionFacts(facts.regressions ?? []);
  const failedBudgets = (facts.budgetEvaluations ?? []).filter(
    (evaluation) => evaluation.result === "FAIL"
  );
  const warnedBudgets = (facts.budgetEvaluations ?? []).filter(
    (evaluation) => evaluation.result === "WARN"
  );

  return {
    summary:
      "AI provider analysis was unavailable, so Regressor99 returned a deterministic run explanation from stored metrics, budgets, regressions, and decision data.",
    whatHappened: [
      `Run execution status is ${facts.run?.executionStatus ?? "unknown"}.`,
      `Run decision status is ${facts.run?.decisionStatus ?? "not decided"}.`,
      `${regressions.length} regression(s), ${failedBudgets.length} failed budget(s), and ${warnedBudgets.length} warning budget(s) were found.`
    ],
    likelyCauses:
      regressions.length > 0
        ? regressions.map(
            (regression) =>
              `${regression.metric ?? "A metric"} changed by ${
                regression.changePercent ?? "an unknown"
              } percent with ${regression.severity ?? "unknown"} severity.`
          )
        : ["No stored regression candidate explains a failure by itself."],
    recommendedFixes: [
      "Inspect the highest-latency and highest-error endpoints first.",
      "Compare this run against the active baseline and any recent deployment changes.",
      "If the performance change is intentional, promote a new baseline or approve a time-boxed exception."
    ],
    whatToKeep: [
      "Keep deterministic budget and regression evaluation as the source of truth.",
      "Keep the benchmark suite stable while investigating so comparisons remain meaningful."
    ],
    riskLevel: failedBudgets.length > 0 || regressions.length > 0 ? "high" : "unknown",
    nextSteps: [
      "Retry AI analysis after provider availability is restored.",
      "Review run metrics, failed budgets, regressions, and decision exceptions in that order."
    ],
    providerErrors
  };
}

function normalizeAiOutput(input: Partial<AiOutput>, rawText: string): AiOutput {
  return {
    summary:
      typeof input.summary === "string" && input.summary.trim().length > 0
        ? input.summary
        : rawText.slice(0, 1000),
    whatHappened: stringArray(input.whatHappened),
    likelyCauses: stringArray(input.likelyCauses),
    recommendedFixes: stringArray(input.recommendedFixes),
    whatToKeep: stringArray(input.whatToKeep),
    riskLevel: riskLevel(input.riskLevel),
    nextSteps: stringArray(input.nextSteps),
    providerErrors: input.providerErrors
      ? stringArray(input.providerErrors)
      : undefined
  };
}

export function dedupeRegressionFacts<
  TRegression extends {
    type?: string;
    metric?: string;
    baselineValue?: number;
    currentValue?: number;
    changePercent?: number;
    severity?: string;
    status?: string;
  }
>(regressions: TRegression[]) {
  const seen = new Set<string>();

  return regressions.filter((regression) => {
    const key = [
      regression.type,
      regression.metric,
      regression.baselineValue,
      regression.currentValue,
      regression.changePercent,
      regression.severity,
      regression.status
    ].join(":");

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function riskLevel(value: unknown): AiOutput["riskLevel"] {
  if (
    value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "critical" ||
    value === "unknown"
  ) {
    return value;
  }

  return "unknown";
}

function safeOrigin(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return "invalid-url";
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown provider error.";
}

function getRunForAuthorization(runId: string) {
  return prisma.benchmarkRun.findUnique({
    where: { id: runId },
    select: { id: true, organizationId: true }
  }).then((run) => {
    if (!run) {
      throw new AppError(404, "BENCHMARK_RUN_NOT_FOUND", "Benchmark run not found.");
    }

    return run;
  });
}

function getRunFacts(runId: string) {
  return prisma.benchmarkRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      organizationId: true,
      projectId: true,
      suiteId: true,
      deploymentId: true,
      triggerSource: true,
      environment: true,
      targetBaseUrl: true,
      executionStatus: true,
      decisionStatus: true,
      failureReason: true,
      startedAt: true,
      finishedAt: true,
      metrics: {
        select: {
          endpointId: true,
          endpoint: { select: { method: true, path: true } },
          requestCount: true,
          successCount: true,
          errorCount: true,
          averageLatencyMs: true,
          p50LatencyMs: true,
          p95LatencyMs: true,
          p99LatencyMs: true,
          throughputRps: true,
          errorRate: true
        },
        orderBy: { createdAt: "asc" }
      },
      budgetEvaluations: {
        select: {
          metric: true,
          actualValue: true,
          warnThreshold: true,
          failThreshold: true,
          result: true,
          budget: {
            select: {
              name: true,
              isHard: true,
              unit: true
            }
          }
        },
        orderBy: { createdAt: "asc" }
      },
      regressions: {
        select: {
          type: true,
          metric: true,
          endpointId: true,
          baselineValue: true,
          currentValue: true,
          changePercent: true,
          severity: true,
          status: true
        },
        orderBy: { createdAt: "desc" }
      },
      decisionExceptions: {
        where: { expiresAt: { gt: new Date() } },
        select: {
          reason: true,
          expiresAt: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}
