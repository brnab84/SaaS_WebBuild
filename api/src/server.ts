import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDB, disconnectDB } from "./db/connect.js";
import { logger } from "./utils/logger.js";

async function main(): Promise<void> {
  await connectDB();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`WebForge API listening on ${env.PUBLIC_URL} (port ${env.PORT})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Force-exit if connections linger.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  logger.error("Fatal startup error", err);
  process.exit(1);
});
