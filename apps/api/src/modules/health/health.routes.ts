import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { ok } from "../../shared/http/api-response.js";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json(
    ok({
      status: "ok",
      timestamp: new Date().toISOString()
    })
  );
});

healthRouter.get("/ready", async (_request, response, next) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    response.json(
      ok({
        status: "ready",
        database: "ok",
        timestamp: new Date().toISOString()
      })
    );
  } catch (error) {
    next(error);
  }
});

