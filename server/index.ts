import * as dotenv from "dotenv";
dotenv.config();
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { connectDB } from "./db";
import { setupWebSocket } from "./socket";
import mongoose from "mongoose";

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

// MONITORING CONFIGURATION
const ENABLE_EXTENDED_MONITORING = process.env.ENABLE_MONITORING === "true" || process.env.NODE_ENV === "production";

// RESPONSE TIME TRACKING
let requestDurations: number[] = [];
let avgResponseTimeHistory: number[] = [];

app.use((req, res, next) => {
  const traceId = randomUUID();
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  let responseCount = 0;

  const isApiRequest = req.path.startsWith("/api");

  // Only intercept for monitoring if enabled
  if (ENABLE_EXTENDED_MONITORING) {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      if (res.headersSent) return res;
      responseCount++;
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    const originalSend = res.send;
    res.send = function (body, ...args) {
      if (res.headersSent) return res;
      if (!capturedJsonResponse) responseCount++;
      return originalSend.apply(res, [body, ...args]);
    };

    const originalEnd = res.end;
    res.end = function (chunk?: any, encoding?: any, cb?: any): any {
      if (isApiRequest && responseCount === 0) responseCount++;
      return originalEnd.apply(res, [chunk, encoding, cb]);
    };
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    
    if (ENABLE_EXTENDED_MONITORING) {
      requestDurations.push(duration);

      if (duration > 1000 && process.env.NODE_ENV === "production") {
        console.warn(`[Performance] Slow request: ${req.method} ${path} took ${duration}ms`);
      }

      if (path.startsWith("/api") && process.env.DEBUG_API === "true") {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        log(logLine);
      }
    }
  });

  next();
});

// MEMORY & EVENT LOOP MONITORING
let lastTick = performance.now();
const memoryHistory: number[] = [];
let baselineHeapUsed = 0;
let monitoringInterval: NodeJS.Timeout | undefined;

export function resetMonitoringBaseline() {
  baselineHeapUsed = process.memoryUsage().heapUsed;
  memoryHistory.length = 0;
  if (ENABLE_EXTENDED_MONITORING) {
    log(`Monitoring baseline initialized: ${(baselineHeapUsed / 1024 / 1024).toFixed(2)}MB`, "system");
  }
}

if (ENABLE_EXTENDED_MONITORING) {
  monitoringInterval = setInterval(() => {
    const mem = process.memoryUsage();
    const now = performance.now();
    const eventLoopDelay = now - lastTick - 5000;
    
    memoryHistory.push(mem.heapUsed);
    if (memoryHistory.length > 5) memoryHistory.shift();

    // Stability Analysis
    if (baselineHeapUsed > 0 && memoryHistory.length >= 3) {
      const isIncreasing = memoryHistory.slice(-3).every((val, i, arr) => i === 0 || (val - arr[i - 1]) > 1048576);
      if (isIncreasing && process.env.NODE_ENV === "production") {
        console.warn("[System] Potential memory leak detected: heapUsed increasing continuously.");
      }
    }

    const heapIncreasePercent = baselineHeapUsed > 0 ? ((mem.heapUsed - baselineHeapUsed) / baselineHeapUsed) * 100 : 0;
    if (baselineHeapUsed > 0 && heapIncreasePercent > 50 && process.env.NODE_ENV === "production") {
      console.warn(`[System] High memory usage: ${heapIncreasePercent.toFixed(2)}% above baseline.`);
    }

    if (baselineHeapUsed > 0 && eventLoopDelay > 150) {
      console.warn(`[System] Event loop pressure detected: ${eventLoopDelay.toFixed(2)}ms delay.`);
    }

    // Response Time Trend Analysis
    if (requestDurations.length > 0) {
      const avg = requestDurations.reduce((a, b) => a + b, 0) / requestDurations.length;
      avgResponseTimeHistory.push(avg);
      if (avgResponseTimeHistory.length > 5) avgResponseTimeHistory.shift();
      requestDurations = []; 
    }

    if (process.env.DEBUG_MONITORING === "true") {
      console.log("MONITORING:", {
        rss: (mem.rss / 1024 / 1024).toFixed(2) + "MB",
        heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(2) + "MB",
        increase: heapIncreasePercent.toFixed(2) + "%",
        eventLoopDelayMs: eventLoopDelay > 0 ? eventLoopDelay.toFixed(2) : 0,
        avgResponseTimeMs: avgResponseTimeHistory.length > 0 ? avgResponseTimeHistory[avgResponseTimeHistory.length - 1].toFixed(2) : 0
      });
    }
    lastTick = performance.now();
  }, 5000);
}

// ERROR HANDLING
process.on("unhandledRejection", (reason) => {
  console.error("[Fatal] Unhandled Rejection:", reason);
  if (process.env.NODE_ENV === "production") process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("[Fatal] Uncaught Exception:", err);
  if (process.env.NODE_ENV === "production") process.exit(1);
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

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) {
      console.error("Blocked double response in error handler:", err.message);
      return;
    }
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (status === 401) {
      log(`[AUTH TEST] Unauthorized request blocked (401) on ${req.path}`, "auth");
    } else {
      console.error(`${status === 500 ? 'Internal Server Error' : 'Error'}:`, err);
    }

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

  // GRACEFUL SHUTDOWN
  const shutdown = async (signal: string) => {
    log(`Received ${signal}. Shutting down gracefully...`, "system");
    
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      log("Monitoring interval cleared.", "system");
    }
    
    httpServer.close(async () => {
      log("HTTP server closed.", "system");
      
      try {
        await mongoose.connection.close();
        log("MongoDB connection closed.", "mongoose");
        process.exit(0);
      } catch (err) {
        console.error("Error during MongoDB shutdown:", err);
        process.exit(1);
      }
    });

    // Force shutdown if it takes too long
    setTimeout(() => {
      console.error("Could not close connections in time, forcefully shutting down");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
