import { Router } from "express";
import { z } from "zod";
import { ok } from "../../shared/http/api-response.js";
import { resetDemoStore } from "./demo.store.js";
import {
  getDemoDashboard,
  getDemoRun,
  promoteDemoBaseline,
  triggerDemoRun
} from "./demo.service.js";

export const demoRouter = Router();

const triggerRunSchema = z.object({
  scenarioId: z.string().min(1)
});

const promoteBaselineSchema = z.object({
  runId: z.string().min(1),
  reason: z.string().min(8)
});

demoRouter.get("/demo/dashboard", (_request, response) => {
  response.json(ok(getDemoDashboard()));
});

demoRouter.get("/demo/runs/:runId", (request, response) => {
  response.json(ok(getDemoRun(request.params.runId)));
});

demoRouter.post("/demo/runs", async (request, response, next) => {
  try {
    const body = triggerRunSchema.parse(request.body);
    const run = await triggerDemoRun(body.scenarioId);

    response.status(201).json(ok(run));
  } catch (error) {
    next(error);
  }
});

demoRouter.post("/demo/baselines/promote", (request, response, next) => {
  try {
    const body = promoteBaselineSchema.parse(request.body);
    const baseline = promoteDemoBaseline(body.runId, body.reason);

    response.status(201).json(ok(baseline));
  } catch (error) {
    next(error);
  }
});

demoRouter.post("/demo/reset", (_request, response) => {
  resetDemoStore();
  response.json(ok(getDemoDashboard()));
});

