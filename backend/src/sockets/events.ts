import { Server } from 'socket.io';
import Redis from 'ioredis';
import { env } from '../config/env';

export const setupRedisSubscriber = (io: Server) => {
  const sub = new Redis(env.REDIS_URL);
  sub.subscribe('tasks.completed');

  sub.on('message', (_channel, message) => {
    try {
      const payload = JSON.parse(message);
      if (payload?.tenantId) {
        io.to(`tenant:${payload.tenantId}`).emit('task:completed', payload);
      }
    } catch (err) {
      console.error('Redis message parse error', err);
    }
  });
};
