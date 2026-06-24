'use client';
import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { apiFetch } from '../lib/api';

export interface DutyRef {
  _id: string;
  name: string;
  description?: string;
  requiresPhoto?: boolean;
  requiresQr?: boolean;
  locationId?: string;
}

export interface UserRef {
  _id: string;
  name: string;
  email: string;
}

export type TaskStatus = 'assigned' | 'completed' | 'approved' | 'rejected';

export interface Task {
  _id: string;
  dutyId: DutyRef | string;
  associateId?: UserRef | string;
  status: TaskStatus;
  notes?: string | null;
  proofPhoto?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  supervisorApproval?: boolean | null;
}

interface TaskState {
  tasks: Task[];
  socket: Socket | null;
  loadTasks: () => Promise<void>;
  completeTask: (input: { taskId: string; notes?: string; proofPhoto?: string; qrCode?: string }) => Promise<void>;
  connectSocket: (tenantKey: string) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  socket: null,
  loadTasks: async () => {
    const data = await apiFetch<{ tasks: Task[] }>('/tasks');
    set({ tasks: data.tasks });
  },
  completeTask: async (input) => {
    await apiFetch('/tasks/complete', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    await get().loadTasks();
  },
  connectSocket: (tenantKey) => {
    const existing = get().socket;
    if (existing) {
      existing.emit('join', { tenantId: tenantKey });
      return;
    }

    const url = process.env.NEXT_PUBLIC_SOCKET_URL as string;
    const socket = io(url, { transports: ['websocket'] });
    socket.emit('join', { tenantId: tenantKey });
    socket.on('task:completed', () => get().loadTasks());
    socket.on('task:approved', () => get().loadTasks());
    socket.on('task:rejected', () => get().loadTasks());
    set({ socket });
  },
}));
