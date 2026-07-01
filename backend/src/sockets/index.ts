import http from 'http';
import { Server } from 'socket.io';
import { isOriginAllowed } from '../config/cors';
import { initSocket } from '../services/socket.service';
import { setupRedisSubscriber } from './events';

export const setupSocket = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        callback(null, isOriginAllowed(origin));
      },
      credentials: true,
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
