import http from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { initSocket } from '../services/socket.service';
import { setupRedisSubscriber } from './events';

export const setupSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
    },
  });

  initSocket(io);
  setupRedisSubscriber(io);

  io.on('connection', (socket) => {
    socket.on('join', ({ tenantId }: { tenantId: string }) => {
      socket.join(`tenant:${tenantId}`);
    });
  });
};
