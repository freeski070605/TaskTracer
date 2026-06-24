import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: env.NODE_ENV === 'test' ? 0 : 3,
  lazyConnect: env.NODE_ENV === 'test',
});

redis.on('error', (err) => {
  logger.error('Redis error', err);
});
