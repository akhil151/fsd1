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
  const allowedOrigins = [
    "http://localhost:5000",
    "http://127.0.0.1:5000",
    ...(process.env.CLIENT_ORIGIN ? [process.env.CLIENT_ORIGIN] : []),
  ];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    })
  );

  // Mount API routes
  app.use("/api/auth", authRoutes);
  app.use("/api/quizzes", quizRoutes);

  return httpServer;
}
