import { z } from 'zod';

export const approveSchema = z.object({
  body: z.object({
    taskId: z.string().min(1),
  }),
});

export const rejectSchema = z.object({
  body: z.object({
    taskId: z.string().min(1),
    reason: z.string().min(2),
  }),
});
