import mongoose from "mongoose";
import { log } from "./index";

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    log("❌ MongoDB connection failed: MONGO_URI is not set in .env", "mongoose");
    // Fail fast so the process is clearly unhealthy instead of serving half-broken APIs
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    log("MongoDB connected successfully for Akhilesh M P's Quiz Platform!", "mongoose");
  } catch (err) {
    log(`❌ MongoDB connection failed: ${(err as Error).message}`, "mongoose");
    // Fail fast so deploy health checks catch it immediately
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    log("⚠️  MongoDB disconnected", "mongoose");
  });

  mongoose.connection.on("error", (err) => {
    log(`MongoDB error: ${err.message}`, "mongoose");
  });
}
