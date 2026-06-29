import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  base: {
    service: "regressor99-api",
    environment: env.NODE_ENV
  }
});

