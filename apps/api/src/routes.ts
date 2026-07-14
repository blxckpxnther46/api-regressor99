import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import {
  runBaselinePromotionRouter,
  suiteBaselinesRouter
} from "./modules/baselines/baselines.routes.js";
import {
  benchmarkRunsRouter,
  suiteBenchmarkRunsRouter
} from "./modules/benchmark-runs/benchmark-runs.routes.js";
import { benchmarkSuitesRouter } from "./modules/benchmark-suites/benchmark-suites.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { organizationsRouter } from "./modules/organizations/organizations.routes.js";
import { deploymentsRouter } from "./modules/deployments/deployments.routes.js";
import { decisionEngineRouter } from "./modules/decision-engine/decision-engine.routes.js";
import { performanceBudgetsRouter } from "./modules/performance-budgets/performance-budgets.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";
import { runRegressionsRouter } from "./modules/regressions/regressions.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/organizations", organizationsRouter);
apiRouter.use("/projects", projectsRouter);
apiRouter.use("/deployments", deploymentsRouter);
apiRouter.use("/benchmark-suites", suiteBaselinesRouter);
apiRouter.use("/benchmark-suites", suiteBenchmarkRunsRouter);
apiRouter.use("/benchmark-suites", benchmarkSuitesRouter);
apiRouter.use("/benchmark-runs", runBaselinePromotionRouter);
apiRouter.use("/benchmark-runs", runRegressionsRouter);
apiRouter.use("/benchmark-runs", decisionEngineRouter);
apiRouter.use("/benchmark-runs", benchmarkRunsRouter);
apiRouter.use("/performance-budgets", performanceBudgetsRouter);
