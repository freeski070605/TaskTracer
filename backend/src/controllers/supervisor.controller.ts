import { Request, Response } from 'express';
import Task from '../models/task.model';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { emitToTenant } from '../services/socket.service';

export const dashboard = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const [assigned, completed, approved, rejected] = await Promise.all([
    Task.countDocuments({ tenantId, status: 'assigned' }),
    Task.countDocuments({ tenantId, status: 'completed' }),
    Task.countDocuments({ tenantId, status: 'approved' }),
    Task.countDocuments({ tenantId, status: 'rejected' }),
  ]);

  res.json({
    metrics: { assigned, completed, approved, rejected },
  });
});

export const reviewQueue = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const status = (req.query.status as string | undefined) ?? 'completed';
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const allowed = ['completed', 'approved', 'rejected'];

  if (!allowed.includes(status)) {
    throw new AppError('Invalid status filter', 400, 'INVALID_STATUS');
  }

  const tasks = await Task.find({ tenantId, status })
    .sort({ completedAt: -1, createdAt: -1 })
    .limit(limit)
    .populate('dutyId', 'name description requiresPhoto requiresQr locationId')
    .populate('associateId', 'name email');

  res.json({ tasks });
});

export const approveTask = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const { taskId } = req.body;
  const task = await Task.findOne({ _id: taskId, tenantId });
  if (!task) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  if (task.status !== 'completed') {
    throw new AppError('Task is not awaiting approval', 409, 'TASK_STATUS_INVALID');
  }
  task.status = 'approved';
  task.supervisorApproval = true;
  await task.save();

  emitToTenant(tenantId, 'task:approved', { taskId, status: task.status });
  res.json({ task });
});

export const rejectTask = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const { taskId, reason } = req.body;
  const task = await Task.findOne({ _id: taskId, tenantId });
  if (!task) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  if (task.status !== 'completed') {
    throw new AppError('Task is not awaiting approval', 409, 'TASK_STATUS_INVALID');
  }
  task.status = 'rejected';
  task.supervisorApproval = false;
  task.notes = reason;
  await task.save();

  emitToTenant(tenantId, 'task:rejected', { taskId, status: task.status });
  res.json({ task });
});
