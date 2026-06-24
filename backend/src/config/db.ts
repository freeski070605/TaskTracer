import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI);
  logger.info('MongoDB connected');

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error', err);
  });
}
