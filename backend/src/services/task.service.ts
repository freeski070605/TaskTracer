import Task from '../models/task.model';
import TaskLog from '../models/taskLog.model';
import Location from '../models/location.model';
import Duty from '../models/duty.model';
import { AppError } from '../utils/errors';

export const logTaskAction = async (
  tenantId: string,
  taskId: string,
  actorId: string,
  action: string,
  metadata?: Record<string, unknown>,
) => {
  await TaskLog.create({ tenantId, taskId, actorId, action, metadata });
};

export const completeTask = async (
  tenantId: string,
  taskId: string,
  actorId: string,
  payload: { notes?: string; proofPhoto?: string | null; qrCode?: string },
) => {
  const task = await Task.findOne({ _id: taskId, tenantId });
  if (!task) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  if (task.status !== 'assigned' && task.status !== 'rejected') {
    throw new AppError('Task is not in a completable state', 409, 'TASK_STATUS_INVALID');
  }

  const duty = await Duty.findOne({ _id: task.dutyId, tenantId });
  if (!duty) throw new AppError('Duty not found', 404, 'DUTY_NOT_FOUND');

  if (duty.requiresPhoto && !payload.proofPhoto) {
    throw new AppError('Photo proof required', 400, 'PHOTO_REQUIRED');
  }

  if (duty.requiresQr && !payload.qrCode) {
    throw new AppError('QR code required', 400, 'QR_REQUIRED');
  }
  if (payload.qrCode) {
    const location = await Location.findOne({ tenantId, qrCode: payload.qrCode });
    if (!location) throw new AppError('Invalid QR code', 400, 'INVALID_QR');
    if (task.locationId && task.locationId !== location.id) {
      throw new AppError('QR code does not match task location', 400, 'QR_MISMATCH');
    }
  }

  task.status = 'completed';
  task.completedAt = new Date();
  task.notes = payload.notes ?? task.notes;
  if (payload.proofPhoto) task.proofPhoto = payload.proofPhoto;
  task.supervisorApproval = null;
  await task.save();
  await logTaskAction(tenantId, taskId, actorId, 'completed', payload);
  return task;
};



