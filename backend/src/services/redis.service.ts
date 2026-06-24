import { env } from '../config/env';
import { logger } from '../config/logger';
import { redis } from '../config/redis';

export const publishEvent = async (channel: string, message: Record<string, unknown>) => {
  if (env.NODE_ENV === 'test') {
    return;
  }

  try {
    if (redis.status !== 'ready') {
      return;
    }

    await redis.publish(channel, JSON.stringify(message));
  } catch (error) {
    logger.error('Redis publish failed', { channel, error });
  }
};
