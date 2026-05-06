import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import quizRoutes from "./routes/quizRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Enable CORS for the Vite dev server and production frontend
  const allowedOrigins = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  if (process.env.CLIENT_ORIGIN) {
    // Support comma-separated origins
    const origins = process.env.CLIENT_ORIGIN.split(",").map(o => o.trim());
    allowedOrigins.push(...origins);
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.some(allowed => {
          if (allowed.includes("*")) {
            const regex = new RegExp("^" + allowed.replace(/\*/g, ".*") + "$");
            return regex.test(origin);
          }
          return allowed === origin;
        });

        if (isAllowed || process.env.NODE_ENV === "development") {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Mount API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/quizzes", quizRoutes);

  // Fallback for unhandled API routes
  app.use("/api", (req, res) => {
    return res.status(404).json({ message: "API route not found" });
  });

  return httpServer;
}
