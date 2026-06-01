import { Router } from "express";
import { demoRouter } from "./modules/demo/demo.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(demoRouter);
