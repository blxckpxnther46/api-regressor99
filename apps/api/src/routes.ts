import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";

export const apiRouter = Router();

apiRouter.use("/api/v1/health", healthRouter);
apiRouter.use("/api/v1/auth", authRouter);
apiRouter.use("/api/v1/projects", projectsRouter);

