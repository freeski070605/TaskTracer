import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { redis } from './config/redis';
import { logger } from './config/logger';
import { cleanupJob } from './jobs/cleanup.job';
import { setupSocket } from './sockets';

let server: http.Server | null = null;

const shutdown = async (signal: string) => {
  logger.info(`Shutting down (${signal})`);
  if (server) {
    await new Promise<void>((resolve) => server?.close(() => resolve()));
  }
  await mongoose.connection.close();
  await redis.quit();
  process.exit(0);
};

const start = async () => {
  await connectDB();

  const app = createApp();
  server = http.createServer(app);
  setupSocket(server);

  server.listen(env.PORT, () => {
    logger.info(`API listening on :${env.PORT}`);
  });

  cleanupJob().catch((err) => logger.error('Cleanup job failed', err));
  setInterval(() => {
    cleanupJob().catch((err) => logger.error('Cleanup job failed', err));
  }, 24 * 60 * 60 * 1000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start();
