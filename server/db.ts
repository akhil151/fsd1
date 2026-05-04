import mongoose from "mongoose";
import { log } from "./index";

export async function connectDB(): Promise<void> {
  let mongoUri = process.env.MONGO_URI;

  try {
    if (mongoUri) {
      await mongoose.connect(mongoUri);
      log("MongoDB connected successfully to Atlas!", "mongoose");
    } else {
      throw new Error("MONGO_URI not provided");
    }
  } catch (err) {
    log(`❌ MongoDB connection to Atlas failed: ${(err as Error).message}. Falling back to memory server...`, "mongoose");
    try {
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create();
      mongoUri = mongoServer.getUri();
      await mongoose.connect(mongoUri);
      log(`MongoDB connected successfully to memory server at ${mongoUri}!`, "mongoose");
    } catch (memErr) {
      log(`❌ MongoDB memory server connection failed: ${(memErr as Error).message}`, "mongoose");
      process.exit(1);
    }
  }

  mongoose.connection.on("disconnected", () => {
    log("⚠️  MongoDB disconnected", "mongoose");
  });

  mongoose.connection.on("error", (err) => {
    log(`MongoDB error: ${err.message}`, "mongoose");
  });
}
