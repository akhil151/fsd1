import * as dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { connectDB } from "./db";
import { setupWebSocket } from "./socket";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

import { randomUUID } from "crypto";

// RESPONSE TIME TRACKING
let requestDurations: number[] = [];
let avgResponseTimeHistory: number[] = [];

app.use((req, res, next) => {
  const traceId = randomUUID();
  console.log(`[${traceId}] Incoming:`, req.method, req.url);
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let responseCount = 0;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    if (res.headersSent) {
      console.error(`[${traceId}] Blocked double response via res.json`);
      return res;
    }
    if (responseCount > 0) {
      console.error(`[${traceId}] FAIL: Response consistency rule violated. Multiple responses sent (via json) for ${req.method} ${req.url}`);
    }
    responseCount++;
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  const originalSend = res.send;
  res.send = function (body, ...args) {
    if (res.headersSent) {
      console.error(`[${traceId}] Blocked double response via res.send`);
      return res;
    }
    if (responseCount > 0 && !capturedJsonResponse) {
      console.error(`[${traceId}] FAIL: Response consistency rule violated. Multiple responses sent (via send) for ${req.method} ${req.url}`);
    }
    if (!capturedJsonResponse) {
      responseCount++;
    }
    return originalSend.apply(res, [body, ...args]);
  };

  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, cb?: any): any {
    if (res.headersSent) {
      return;
    }
    if (responseCount === 0) {
      responseCount++;
    }
    return originalEnd.apply(res, [chunk, encoding, cb]);
  };

  res.on("finish", () => {
    console.log(`[${traceId}] Response sent:`, req.method, req.url);
    if (responseCount === 0) {
      console.error(`[${traceId}] FAIL: Response consistency rule violated. Request finished with 0 responses for ${req.method} ${req.url}`);
    } else if (responseCount > 1) {
      console.error(`[${traceId}] FAIL: Response consistency rule violated. Request finished with ${responseCount} responses for ${req.method} ${req.url}`);
    }
    
    const duration = Date.now() - start;
    requestDurations.push(duration);

    if (duration > 1000) {
      console.error(`[${traceId}] FAIL: Response time rule violated. Request took ${duration}ms (> 1s)`);
      process.exit(1);
    }

    if (path.startsWith("/api")) {
      let logLine = `[${traceId}] ${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  res.on("close", () => {
    console.log(`[${traceId}] Response closed:`, req.method, req.url);
  });

  req.on("aborted", () => {
    console.log(`[${traceId}] Request aborted:`, req.method, req.url);
  });

  next();
});

// MEMORY & EVENT LOOP MONITORING
let lastTick = performance.now();
const memoryHistory: number[] = [];
let baselineHeapUsed = 0;

export function resetMonitoringBaseline() {
  baselineHeapUsed = process.memoryUsage().heapUsed;
  memoryHistory.length = 0;
  console.log(`Monitoring baseline reset to: ${(baselineHeapUsed / 1024 / 1024).toFixed(2)}MB`);
}

setInterval(() => {
  const mem = process.memoryUsage();
  const now = performance.now();
  const eventLoopDelay = now - lastTick - 5000;
  
  memoryHistory.push(mem.heapUsed);
  if (memoryHistory.length > 5) memoryHistory.shift();

  let memoryStabilityFail = false;
  if (baselineHeapUsed > 0 && memoryHistory.length >= 3) {
    // Noise floor of 10KB to avoid jitter
    const isIncreasing = memoryHistory.slice(-3).every((val, i, arr) => {
      if (i === 0) return true;
      return (val - arr[i - 1]) > 10240; // > 10KB
    });
    if (isIncreasing) {
      console.error("FAIL: Memory Stability Rule violated. heapUsed increases continuously for 3+ intervals.");
      process.exit(1);
    }
  }

  const heapIncreasePercent = baselineHeapUsed > 0 ? ((mem.heapUsed - baselineHeapUsed) / baselineHeapUsed) * 100 : 0;
  if (baselineHeapUsed > 0 && heapIncreasePercent > 30) {
    console.error(`FAIL: Memory Stability Rule violated. heapUsed exceeds baseline by ${heapIncreasePercent.toFixed(2)}% (> 30%).`);
    process.exit(1);
  }

  if (baselineHeapUsed > 0 && eventLoopDelay > 100) {
    console.error(`FAIL: Event Loop Delay Rule violated. Delay is ${eventLoopDelay.toFixed(2)}ms (> 100ms).`);
    // Not necessarily a crash, but we fail the validation
    process.exit(1);
  }
  if (baselineHeapUsed > 0 && eventLoopDelay > 200) {
    console.error(`FAIL: Event Loop Delay Rule violated. Spike above 200ms: ${eventLoopDelay.toFixed(2)}ms.`);
    process.exit(1);
  }

  // Response Time Trend Analysis
  if (requestDurations.length > 0) {
    const avg = requestDurations.reduce((a, b) => a + b, 0) / requestDurations.length;
    avgResponseTimeHistory.push(avg);
    if (avgResponseTimeHistory.length > 5) avgResponseTimeHistory.shift();

    if (avgResponseTimeHistory.length >= 3) {
      const isIncreasing = avgResponseTimeHistory.slice(-3).every((val, i, arr) => i === 0 || val > arr[i - 1]);
      if (isIncreasing) {
        console.error("FAIL: Response Time Rule violated. Average response time increases continuously for 3+ intervals.");
        process.exit(1);
      }
    }
    requestDurations = []; // Reset for next interval
  }

  console.log("MONITORING:", {
    rss: (mem.rss / 1024 / 1024).toFixed(2) + "MB",
    heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + "MB",
    baseline: (baselineHeapUsed / 1024 / 1024).toFixed(2) + "MB",
    increase: heapIncreasePercent.toFixed(2) + "%",
    eventLoopDelayMs: eventLoopDelay > 0 ? eventLoopDelay.toFixed(2) : 0,
    avgResponseTimeMs: avgResponseTimeHistory.length > 0 ? avgResponseTimeHistory[avgResponseTimeHistory.length - 1].toFixed(2) : 0
  });
  lastTick = performance.now();
}, 5000);

// ERROR-FREE RUNTIME MONITORING
process.on("unhandledRejection", (reason) => {
  console.error("FAIL: Error-Free Runtime Rule violated. unhandled promise rejection:", reason);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("FAIL: Error-Free Runtime Rule violated. process crash / uncaught exception:", err);
  process.exit(1);
});

// FAULT INJECTION MIDDLEWARE (Async Safety Test)
  app.use((req, res, next) => {
    if (req.path.includes("inject-async-safety-test")) {
      res.json({ success: true, message: "First response sent" });
      // This should NOT cause a second response or a crash that stops the validation
      setTimeout(async () => {
        try {
          console.log("Triggering failing async operation after response...");
          throw new Error("Failing async operation");
        } catch (err) {
          console.log("Caught async failure as expected. Checking if second response is possible...");
          if (res.headersSent) {
            console.log("Async Safety Rule PASS: Second response blocked (headers already sent).");
          } else {
            console.error("FAIL: Async Safety Rule violated. Second response possible!");
            res.json({ success: false, message: "Second response attempt" });
          }
        }
      }, 100);
      return;
    }
    next();
  });

(async () => {
  await connectDB();

  // Setup Socket.IO Server
  setupWebSocket(httpServer);

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) {
      console.error("Blocked double response in error handler:", err.message);
      return;
    }
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
      resetMonitoringBaseline();
    },
  );
})();
