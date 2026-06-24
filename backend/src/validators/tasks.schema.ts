import { z } from 'zod';

export const completeTaskSchema = z.object({
  body: z.object({
    taskId: z.string().min(1),
    notes: z.string().optional(),
    proofPhoto: z.string().url().optional(),
    qrCode: z.string().optional(),
  }),
});

export const uploadProofSchema = z.object({
  body: z.object({
    taskId: z.string().min(1),
    fileName: z.string().min(1),
    contentType: z.string().min(1),
  }),
});
