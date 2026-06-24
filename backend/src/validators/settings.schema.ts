import { z } from 'zod';

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
  }).refine((value) => Boolean(value.name || value.email), {
    message: 'At least one profile field is required',
  }),
});

export const updateWorkspaceSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).optional(),
      organizationName: z.string().min(2).optional(),
      contactEmail: z.string().email().optional(),
    })
    .transform((value) => ({
      organizationName: value.organizationName ?? value.name,
      contactEmail: value.contactEmail,
    }))
    .refine((value) => Boolean(value.organizationName || value.contactEmail), {
      message: 'At least one workspace field is required',
    }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8),
  }),
});
