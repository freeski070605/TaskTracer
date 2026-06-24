import { create } from 'zustand';
import { apiFetch } from '../api/client';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from './authStore';
import { getLocalTasks, markLocalTaskCompleted, upsertTasks } from '../offline/db';
import { enqueue } from '../offline/queue';
import { syncQueue } from '../offline/sync';

export interface DutyRef {
  _id: string;
  name: string;
  requiresPhoto?: boolean;
  requiresQr?: boolean;
  locationId?: string;
}

export interface Task {
  _id: string;
  status: string;
  dutyId?: DutyRef | string;
  notes?: string;
  proofPhoto?: string;
}

interface CompleteOptions {
  notes?: string;
  qrCode?: string;
  proofPhotoUri?: string;
  proofPhotoName?: string;
  proofPhotoType?: string;
}

interface UploadResponse {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  tags: string[];
}

interface TaskState {
  tasks: Task[];
  offline: boolean;
  loadTasks: () => Promise<void>;
  completeTask: (taskId: string, options?: CompleteOptions) => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
}

const uploadProof = async (
  token: string | null,
  taskId: string,
  options: CompleteOptions,
) => {
  if (!options.proofPhotoUri || !options.proofPhotoName || !options.proofPhotoType) return undefined;

  const data = await apiFetch<UploadResponse>(
    '/tasks/upload-proof',
    {
      method: 'POST',
      body: JSON.stringify({
        taskId,
        fileName: options.proofPhotoName,
        contentType: options.proofPhotoType,
      }),
    },
    token,
  );

  const uploadResult = await FileSystem.uploadAsync(data.uploadUrl, options.proofPhotoUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    parameters: {
      api_key: data.apiKey,
      timestamp: String(data.timestamp),
      signature: data.signature,
      public_id: data.publicId,
      tags: data.tags.join(','),
    },
    mimeType: options.proofPhotoType,
  });

  if (uploadResult.status < 200 || uploadResult.status >= 300) {
    throw new Error(`Cloudinary upload failed with status ${uploadResult.status}`);
  }

  const payload = JSON.parse(uploadResult.body) as { secure_url?: string };
  if (!payload.secure_url) {
    throw new Error('Cloudinary upload response did not include secure_url');
  }

  return payload.secure_url;
};

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  offline: false,
  loadTasks: async () => {
    try {
      const token = await useAuthStore.getState().getToken();
      const data = await apiFetch<{ tasks: Task[] }>('/tasks', {}, token);
      set({ tasks: data.tasks, offline: false });
      upsertTasks(data.tasks);
    } catch {
      const local = await getLocalTasks();
      set({ tasks: local, offline: true });
    }
  },
  completeTask: async (taskId, options = {}) => {
    const token = await useAuthStore.getState().getToken();
    try {
      const proofPhoto = await uploadProof(token, taskId, options);
      await apiFetch(
        '/tasks/complete',
        {
          method: 'POST',
          body: JSON.stringify({
            taskId,
            notes: options.notes,
            proofPhoto,
            qrCode: options.qrCode,
          }),
        },
        token,
      );
      await get().loadTasks();
    } catch {
      await enqueue({
        taskId,
        notes: options.notes,
        qrCode: options.qrCode,
        proofPhotoUri: options.proofPhotoUri,
        proofPhotoName: options.proofPhotoName,
        proofPhotoType: options.proofPhotoType,
      });
      markLocalTaskCompleted(taskId);
      await get().loadTasks();
    }
  },
  syncOfflineQueue: async () => {
    const token = await useAuthStore.getState().getToken();
    await syncQueue(token);
    await get().loadTasks();
  },
}));

