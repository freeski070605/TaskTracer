import { Request, Response } from 'express';
import Task from '../models/task.model';
import { asyncHandler } from '../utils/asyncHandler';
import { completeTask } from '../services/task.service';
import { createUploadSignature } from '../services/cloudinary.service';
import { publishEvent } from '../services/redis.service';
import { emitToTenant } from '../services/socket.service';
import { AppError } from '../utils/errors';

const ALLOWED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

const sanitizePublicIdSegment = (value: string) =>
  value.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const user = req.user!;
  const status = req.query.status as string | undefined;

  const query: Record<string, unknown> = { tenantId };
  if (user.role === 'associate') query.associateId = user.id;
  if (status) query.status = status;

  const tasks = await Task.find(query)
    .sort({ createdAt: -1 })
    .populate('dutyId', 'name description requiresPhoto requiresQr locationId')
    .populate('associateId', 'name email');
  res.json({ tasks });
});

export const completeTaskHandler = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const user = req.user!;
  const { taskId, notes, proofPhoto, qrCode } = req.body;

  const task = await completeTask(tenantId, taskId, user.id, { notes, proofPhoto, qrCode });
  const payload = { taskId: task.id, status: task.status, tenantId };
  await publishEvent('tasks.completed', payload);
  emitToTenant(tenantId, 'task:completed', payload);

  res.json({ task });
});

export const requestUpload = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const user = req.user!;
  const { taskId, fileName, contentType } = req.body;

  const task = await Task.findOne({ _id: taskId, tenantId });
  if (!task) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  if (user.role === 'associate' && String(task.associateId) !== String(user.id)) {
    throw new AppError('Forbidden', 403, 'FORBIDDEN');
  }
  if (task.status !== 'assigned' && task.status !== 'rejected') {
    throw new AppError('Task is not in an uploadable state', 409, 'TASK_STATUS_INVALID');
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(contentType)) {
    throw new AppError('Unsupported content type', 400, 'UNSUPPORTED_CONTENT_TYPE');
  }

  const safeFileName = sanitizePublicIdSegment(fileName);
  if (!safeFileName) throw new AppError('Invalid file name', 400, 'INVALID_FILE_NAME');

  const publicId = `${tenantId}/tasks/${taskId}/${Date.now()}_${safeFileName}`;
  const upload = createUploadSignature({
    publicId,
    tags: [`tenant_${tenantId}`, `task_${taskId}`, 'tasktracer'],
  });

  res.json(upload);
});
