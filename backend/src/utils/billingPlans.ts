import { env } from '../config/env';

export const BILLING_PLAN_KEYS = ['starter', 'pro', 'enterprise'] as const;
export type BillingPlanKey = (typeof BILLING_PLAN_KEYS)[number];

export interface BillingPlanDefinition {
  key: BillingPlanKey;
  name: string;
  monthlyPrice: number;
  description: string;
  features: string[];
  planVariationId?: string;
}

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlanDefinition> = {
  starter: {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 49,
    description: 'Small EVS teams getting started with task verification.',
    features: [
      'Up to 25 active associates',
      'Task assignment and proof photo uploads',
      'Supervisor review queue',
      'Email support',
    ],
    planVariationId: env.SQUARE_PLAN_STARTER_VARIATION_ID,
  },
  pro: {
    key: 'pro',
    name: 'Pro',
    monthlyPrice: 149,
    description: 'Operational visibility for growing facilities and multi-shift teams.',
    features: [
      'Up to 100 active associates',
      'Live supervisor dashboard',
      'Advanced reporting and audits',
      'Priority onboarding support',
    ],
    planVariationId: env.SQUARE_PLAN_PRO_VARIATION_ID,
  },
  enterprise: {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 399,
    description: 'For large healthcare organizations needing full oversight.',
    features: [
      'Unlimited associates',
      'Multi-site tenant operations',
      'Superadmin portfolio visibility',
      'Dedicated success support',
    ],
    planVariationId: env.SQUARE_PLAN_ENTERPRISE_VARIATION_ID,
  },
};
