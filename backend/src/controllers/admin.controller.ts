import { Request, Response } from 'express';
import crypto from 'crypto';
import Duty from '../models/duty.model';
import Schedule from '../models/schedule.model';
import Task from '../models/task.model';
import User from '../models/user.model';
import Location from '../models/location.model';
import { asyncHandler } from '../utils/asyncHandler';
import { hashPassword } from '../services/password.service';
import { AppError } from '../utils/errors';

export const listDuties = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const duties = await Duty.find({ tenantId }).sort({ createdAt: -1 });
  res.json({ duties });
});

export const createDuty = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  if (req.body.locationId) {
    const location = await Location.findOne({ _id: req.body.locationId, tenantId });
    if (!location) throw new AppError('Location not found', 404, 'LOCATION_NOT_FOUND');
  }
  const duty = await Duty.create({ tenantId, ...req.body });
  res.status(201).json({ duty });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const users = await User.find({ tenantId }).sort({ createdAt: -1 });
  res.json({ users });
});

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const { name, email, password, role } = req.body;
  const actor = req.user!;

  const existing = await User.findOne({ tenantId, email });
  if (existing) throw new AppError('User already exists', 409, 'USER_EXISTS');
  if (role === 'superadmin' && actor.role !== 'superadmin') {
    throw new AppError('Only superadmins can assign the superadmin role', 403, 'FORBIDDEN');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ tenantId, name, email, passwordHash, role: role ?? 'associate' });
  res.status(201).json({ user });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const actor = req.user!;
  const { userId } = req.params;
  const { isActive, role } = req.body as { isActive?: boolean; role?: string };

  const user = await User.findOne({ _id: userId, tenantId });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  if (role === 'superadmin' && actor.role !== 'superadmin') {
    throw new AppError('Only superadmins can assign the superadmin role', 403, 'FORBIDDEN');
  }
  if (user.role === 'superadmin' && actor.role !== 'superadmin') {
    throw new AppError('Only superadmins can manage superadmin accounts', 403, 'FORBIDDEN');
  }

  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (role) user.role = role as any;
  await user.save();

  res.json({ user });
});

export const listLocations = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const locations = await Location.find({ tenantId }).sort({ createdAt: -1 });
  res.json({ locations });
});

export const createLocation = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const { name, qrCode } = req.body as { name: string; qrCode?: string };

  const code = qrCode ?? `loc_${crypto.randomUUID()}`;
  const existing = await Location.findOne({ tenantId, qrCode: code });
  if (existing) throw new AppError('QR code already in use', 409, 'QR_EXISTS');

  const location = await Location.create({ tenantId, name, qrCode: code });
  res.status(201).json({ location });
});

export const createSchedule = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const { dutyId, associateId, startsAt, endsAt } = req.body;

  const duty = await Duty.findOne({ _id: dutyId, tenantId });
  if (!duty) throw new AppError('Duty not found', 404, 'DUTY_NOT_FOUND');

  const associate = await User.findOne({ _id: associateId, tenantId, role: 'associate' });
  if (!associate) throw new AppError('Associate not found', 404, 'ASSOCIATE_NOT_FOUND');

  const schedule = await Schedule.create({ tenantId, dutyId, associateId, startsAt, endsAt });
  const task = await Task.create({
    tenantId,
    dutyId: schedule.dutyId,
    associateId: schedule.associateId,
    status: 'assigned',
    locationId: duty.locationId,
  });
  res.status(201).json({ schedule, task });
});

export const listSchedules = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const schedules = await Schedule.find({ tenantId })
    .sort({ startsAt: 1, createdAt: -1 })
    .limit(limit)
    .populate('dutyId', 'name description requiresPhoto requiresQr')
    .populate('associateId', 'name email');

  res.json({ schedules });
});

export const reports = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const totalTasks = await Task.countDocuments({ tenantId });
  const completed = await Task.countDocuments({ tenantId, status: 'completed' });
  const approved = await Task.countDocuments({ tenantId, status: 'approved' });
  const rejected = await Task.countDocuments({ tenantId, status: 'rejected' });
  res.json({ totalTasks, completed, approved, rejected });
});

