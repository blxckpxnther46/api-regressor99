import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.js";
import { apiRouter } from "./routes.js";

export function createApp() {
  const app = express();
  const configuredOrigin = new URL(env.API_CORS_ORIGIN);

  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || origin === "null") {
          callback(null, true);
          return;
        }

        try {
          const requestOrigin = new URL(origin);
          const isConfiguredOrigin = origin === env.API_CORS_ORIGIN;
          const isLocalDevOrigin =
            configuredOrigin.hostname === requestOrigin.hostname &&
            (requestOrigin.hostname === "localhost" ||
              requestOrigin.hostname === "127.0.0.1" ||
              requestOrigin.hostname === "::1");

          callback(null, isConfiguredOrigin || isLocalDevOrigin);
        } catch {
          callback(null, false);
        }
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
