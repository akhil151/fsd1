import type { Express } from "express";
import { createServer, type Server } from "http";
import cors from "cors";
import authRoutes from "./routes/authRoutes";
import quizRoutes from "./routes/quizRoutes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Enable CORS for the Vite dev server
  app.use(
    cors({
      origin: ["http://localhost:5000", "http://127.0.0.1:5000"],
      credentials: true,
    })
  );

  // Mount API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/quizzes", quizRoutes);

  return httpServer;
}
