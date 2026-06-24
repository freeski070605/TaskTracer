import { z } from 'zod';

const roleEnum = z.enum(['associate', 'supervisor', 'admin', 'superadmin']);

export const createDutySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    locationId: z.string().optional(),
    requiresPhoto: z.boolean().optional(),
    requiresQr: z.boolean().optional(),
  }),
});

export const createScheduleSchema = z.object({
  body: z.object({
    dutyId: z.string().min(1),
    associateId: z.string().min(1),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    role: roleEnum.optional(),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
  body: z
    .object({
      isActive: z.boolean().optional(),
      role: roleEnum.optional(),
    })
    .refine((data) => data.isActive !== undefined || data.role !== undefined, {
      message: 'No updates provided',
    }),
});

export const createLocationSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    qrCode: z.string().min(2).optional(),
  }),
});
