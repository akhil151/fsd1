import mongoose from "mongoose";
import { log } from "./index";

export async function connectDB(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri || mongoUri.includes("127.0.0.1") || mongoUri.includes("localhost")) {
    log("❌ MongoDB connection failed: MONGO_URI must point to an Atlas cluster, local fallback is forbidden.", "mongoose");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    log("MongoDB Cluster connected successfully for Akhilesh M P's Quiz Platform!", "mongoose");
  } catch (err) {
    log(`❌ MongoDB connection failed: ${(err as Error).message}`, "mongoose");
    process.exit(1);
  }

  mongoose.connection.on("disconnected", () => {
    log("⚠️  MongoDB disconnected", "mongoose");
  });

  mongoose.connection.on("error", (err) => {
    log(`MongoDB error: ${err.message}`, "mongoose");
  });
}
