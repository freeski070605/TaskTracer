import { Server } from 'socket.io';

let io: Server | null = null;

export const initSocket = (server: Server) => {
  io = server;
};

export const emitToTenant = (tenantId: string, event: string, payload: unknown) => {
  if (!io) return;
  io.to(`tenant:${tenantId}`).emit(event, payload);
};
