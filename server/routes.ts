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
      origin: true, // Reflects the request origin, allowing any domain to access
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
