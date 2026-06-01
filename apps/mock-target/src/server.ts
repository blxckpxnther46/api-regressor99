import cors from "cors";
import express from "express";

const app = express();
const port = Number(process.env.MOCK_TARGET_PORT ?? 4100);

app.use(cors());
app.use(express.json());

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function jitter(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function respondWithLatency(
  response: express.Response,
  options: {
    minMs: number;
    maxMs: number;
    statusCode?: number;
    body: Record<string, unknown>;
  }
) {
  const latencyMs = jitter(options.minMs, options.maxMs);
  await wait(latencyMs);

  response.status(options.statusCode ?? 200).json({
    ...options.body,
    simulatedLatencyMs: latencyMs
  });
}

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "mock-target-api"
  });
});

app.get("/api/checkout/baseline", async (_request, response) => {
  await respondWithLatency(response, {
    minMs: 145,
    maxMs: 190,
    body: {
      scenario: "baseline",
      message: "Stable checkout response"
    }
  });
});

app.get("/api/checkout/expanded", async (_request, response) => {
  await respondWithLatency(response, {
    minMs: 235,
    maxMs: 285,
    body: {
      scenario: "expanded",
      message: "Checkout now includes fraud scoring and more response data"
    }
  });
});

app.get("/api/checkout/slow-regression", async (_request, response) => {
  await respondWithLatency(response, {
    minMs: 365,
    maxMs: 460,
    body: {
      scenario: "slow-regression",
      message: "Unexpected slow database lookup"
    }
  });
});

app.get("/api/checkout/error-prone", async (_request, response) => {
  const shouldFail = Math.random() < 0.35;

  await respondWithLatency(response, {
    minMs: 170,
    maxMs: 240,
    statusCode: shouldFail ? 503 : 200,
    body: {
      scenario: "error-prone",
      message: shouldFail
        ? "Temporary upstream payment provider failure"
        : "Checkout succeeded"
    }
  });
});

app.listen(port, () => {
  console.log(`Mock target API listening on http://localhost:${port}`);
});

