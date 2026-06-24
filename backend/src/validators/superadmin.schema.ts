import { z } from 'zod';

export const updateCompanySchema = z.object({
  params: z.object({
    companyId: z.string().min(1),
  }),
  body: z
    .object({
      organizationName: z.string().min(2).optional(),
      organizationSlug: z.string().min(2).optional(),
      contactEmail: z.string().email().optional(),
      plan: z.string().min(2).optional(),
      isActive: z.boolean().optional(),
    })
    .refine(
      (value) =>
        value.organizationName !== undefined ||
        value.organizationSlug !== undefined ||
        value.contactEmail !== undefined ||
        value.plan !== undefined ||
        value.isActive !== undefined,
      {
        message: 'No updates provided',
      },
    ),
});

export const updateCompanySubscriptionSchema = z.object({
  params: z.object({
    companyId: z.string().min(1),
  }),
  body: z.object({
    plan: z.enum(['starter', 'pro', 'enterprise']),
    status: z.string().min(2),
    notes: z.string().min(2).optional(),
    cancelAtProvider: z.boolean().optional(),
  }),
});

export const createFinancialRecordSchema = z.object({
  body: z.object({
    companyId: z.string().min(1),
    type: z.enum(['subscription', 'payment', 'refund', 'adjustment', 'note']),
    amount: z.number().min(0).optional(),
    currency: z.string().min(3).max(3).optional(),
    status: z.string().min(2).optional(),
    description: z.string().min(2),
    referenceId: z.string().min(1).optional(),
  }),
});
