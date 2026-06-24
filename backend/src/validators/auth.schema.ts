import { z } from 'zod';

const organizationFields = z.object({
  tenantId: z.string().min(2).optional(),
  organization: z.string().min(2).optional(),
  organizationName: z.string().min(2).optional(),
  organizationSlug: z.string().min(2).optional(),
});

export const registerSchema = z.object({
  body: organizationFields
    .extend({
      name: z.string().min(2),
      email: z.string().email(),
      password: z.string().min(8),
      role: z.enum(['associate', 'supervisor', 'admin', 'superadmin']).optional(),
    })
    .superRefine((data, ctx) => {
      const hasOrganization = Boolean(data.tenantId || data.organizationName || data.organizationSlug);
      if (data.role !== 'superadmin' && !hasOrganization) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organizationName'],
          message: 'Organization is required',
        });
      }
    }),
});

export const loginSchema = z.object({
  body: organizationFields.extend({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(10),
  }),
});
