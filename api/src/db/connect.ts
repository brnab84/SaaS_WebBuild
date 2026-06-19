import mongoose from "mongoose";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

mongoose.set("strictQuery", true);

let connected = false;

export async function connectDB(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  if (connected) return mongoose;
  await mongoose.connect(uri, { dbName: env.MONGODB_DB_NAME });
  connected = true;
  logger.info(`MongoDB connected (${env.MONGODB_DB_NAME})`);
  // Build any missing indexes declared on schemas (safe to call repeatedly).
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  return mongoose;
}

export async function disconnectDB(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
