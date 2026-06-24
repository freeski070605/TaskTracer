import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis';
import { env } from '../config/env';

const baseConfig = {
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
};

export const apiRateLimiter = env.NODE_ENV === 'test'
  ? rateLimit(baseConfig)
  : rateLimit({
      ...baseConfig,
      store: new RedisStore({
        sendCommand: (...args: string[]) => redis.call(args[0], ...args.slice(1)) as Promise<any>,
      }),
    });
