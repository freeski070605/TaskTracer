import { z } from 'zod';

const billingPlanEnum = z.enum(['starter', 'pro', 'enterprise']);
const financialRecordTypeEnum = z.enum(['subscription', 'payment', 'refund', 'adjustment', 'note']);

export const createCompanySchema = z.object({
  body: z.object({
    organizationName: z.string().min(2),
    organizationSlug: z.string().min(2).optional(),
    tenantId: z.string().min(2).optional(),
    contactEmail: z.string().email(),
    plan: billingPlanEnum.optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({
    companyId: z.string().min(1),
  }),
  body: z
    .object({
      organizationName: z.string().min(2).optional(),
      organizationSlug: z.string().min(2).optional(),
      contactEmail: z.string().email().optional(),
      plan: billingPlanEnum.optional(),
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
    plan: billingPlanEnum,
    status: z.string().min(2),
    notes: z.string().min(2).optional(),
    cancelAtProvider: z.boolean().optional(),
  }),
});

export const createFinancialRecordSchema = z.object({
  body: z.object({
    companyId: z.string().min(1),
    type: financialRecordTypeEnum,
    amount: z.number().min(0).optional(),
    currency: z.string().min(3).max(3).optional(),
    status: z.string().min(2).optional(),
    description: z.string().min(2),
    referenceId: z.string().min(1).optional(),
  }),
});

export const deleteCompanySchema = z.object({
  params: z.object({
    companyId: z.string().min(1),
  }),
});

export const updateFinancialRecordSchema = z.object({
  params: z.object({
    recordId: z.string().min(1),
  }),
  body: z
    .object({
      type: financialRecordTypeEnum.optional(),
      amount: z.number().min(0).optional(),
      currency: z.string().min(3).max(3).optional(),
      status: z.string().min(2).optional(),
      description: z.string().min(2).optional(),
      referenceId: z.string().min(1).nullable().optional(),
      externalReferenceId: z.string().min(1).nullable().optional(),
      occurredAt: z.string().datetime().optional(),
    })
    .refine(
      (value) =>
        Object.values(value).some((field) => field !== undefined),
      { message: 'No updates provided' },
    ),
});

