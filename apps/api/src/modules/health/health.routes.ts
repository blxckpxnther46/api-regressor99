import { Router } from "express";
import { ok } from "../../shared/http/api-response.js";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json(
    ok({
      status: "ok",
      timestamp: new Date().toISOString()
    })
  );
});
