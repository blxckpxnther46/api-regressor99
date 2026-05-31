import { createServer } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

const app = createApp();
const server = createServer(app);

server.listen(env.API_PORT, () => {
  console.log(`Regressor99 API listening on http://localhost:${env.API_PORT}`);
});

function shutdown(signal: NodeJS.Signals) {
  console.log(`${signal} received. Shutting down API.`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

