import { Router } from "express";
import { authRouter } from "./modules/auth/auth.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { organizationsRouter } from "./modules/organizations/organizations.routes.js";
import { projectsRouter } from "./modules/projects/projects.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/organizations", organizationsRouter);
apiRouter.use("/projects", projectsRouter);

