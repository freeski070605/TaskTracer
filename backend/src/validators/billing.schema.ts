import { z } from 'zod';

export const subscribeSchema = z.object({
  body: z.object({
    planKey: z.enum(['starter', 'pro', 'enterprise']),
  }),
});
