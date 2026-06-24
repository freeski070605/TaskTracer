import { apiFetch } from '../api/client';
import * as FileSystem from 'expo-file-system';
import { dequeueAll, requeue, QueueItem } from './queue';

interface UploadResponse {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  tags: string[];
}

const uploadProof = async (token: string | null, item: QueueItem) => {
  if (!item.proofPhotoUri || !item.proofPhotoName || !item.proofPhotoType) return undefined;

  const data = await apiFetch<UploadResponse>(
    '/tasks/upload-proof',
    {
      method: 'POST',
      body: JSON.stringify({
        taskId: item.taskId,
        fileName: item.proofPhotoName,
        contentType: item.proofPhotoType,
      }),
    },
    token,
  );

  const uploadResult = await FileSystem.uploadAsync(data.uploadUrl, item.proofPhotoUri, {
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
    mimeType: item.proofPhotoType,
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

export const syncQueue = async (token: string | null) => {
  const items = await dequeueAll();
  if (items.length === 0) return { synced: 0, failed: 0 };

  const failed: typeof items = [];
  for (const item of items) {
    try {
      const proofPhoto = await uploadProof(token, item);
      await apiFetch(
        '/tasks/complete',
        {
          method: 'POST',
          body: JSON.stringify({
            taskId: item.taskId,
            notes: item.notes ?? 'Offline sync',
            qrCode: item.qrCode,
            proofPhoto,
          }),
        },
        token,
      );
    } catch {
      failed.push(item);
    }
  }

  if (failed.length > 0) {
    await requeue(failed);
  }

  return { synced: items.length - failed.length, failed: failed.length };
};

