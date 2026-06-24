import crypto from 'crypto';
import { Request, Response } from 'express';
import Company from '../models/company.model';
import Subscription from '../models/subscription.model';
import { asyncHandler } from '../utils/asyncHandler';
import {
  cancelExistingSubscription,
  createCustomer,
  createSubscription,
} from '../services/square.service';
import { createFinancialRecord } from '../services/financialRecord.service';
import { env } from '../config/env';
import { AppError } from '../utils/errors';
import { BILLING_PLANS, type BillingPlanKey } from '../utils/billingPlans';
import { serializeCompany, syncCompanyIdentity } from '../utils/organization';

const getWebhookUrl = () => env.SQUARE_WEBHOOK_URL ?? `${env.BASE_URL}/api/billing/webhook`;

const verifySquareSignature = (signature: string, body: Buffer, url: string) => {
  const payload = `${url}${body.toString('utf8')}`;
  const hmac = crypto.createHmac('sha256', env.SQUARE_WEBHOOK_SIGNATURE_KEY);
  const digest = hmac.update(payload).digest('base64');
  const expected = Buffer.from(digest, 'base64');
  const received = Buffer.from(signature, 'base64');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
};

export const getBillingSummary = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const company = await Company.findOne({ tenantId });
  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }
  const syncedCompany = await syncCompanyIdentity(company);

  const subscription = await Subscription.findOne({ tenantId }).sort({ updatedAt: -1, createdAt: -1 });
  const plans = Object.values(BILLING_PLANS).map((plan) => ({
    ...plan,
    configured: Boolean(plan.planVariationId),
  }));

  res.json({
    workspace: serializeCompany(syncedCompany),
    subscription,
    plans,
  });
});

export const subscribe = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const { planKey } = req.body as { planKey: BillingPlanKey };
  const company = await Company.findOne({ tenantId });
  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }
  const syncedCompany = await syncCompanyIdentity(company);

  const plan = BILLING_PLANS[planKey];
  if (!plan) {
    throw new AppError('Unknown billing plan', 400, 'INVALID_PLAN');
  }
  if (!plan.planVariationId) {
    throw new AppError('This billing plan is not configured yet', 400, 'PLAN_NOT_CONFIGURED');
  }

  let squareCustomerId = syncedCompany.squareCustomerId ?? undefined;
  if (!squareCustomerId) {
    const customer = await createCustomer({
      email: syncedCompany.contactEmail,
      companyName: syncedCompany.name,
      referenceId: syncedCompany.slug,
    });

    squareCustomerId = customer?.id;
    if (!squareCustomerId) {
      throw new AppError('Unable to create Square customer', 502, 'SQUARE_CUSTOMER_FAILED');
    }

    syncedCompany.squareCustomerId = squareCustomerId;
    await syncedCompany.save();
  }

  const existing = await Subscription.findOne({ tenantId }).sort({ updatedAt: -1, createdAt: -1 });
  if (existing && existing.squareSubscriptionId !== 'pending' && !['CANCELED', 'CANCELLED'].includes(existing.status)) {
    await cancelExistingSubscription(existing.squareSubscriptionId);
    existing.status = 'CANCELED';
    await existing.save();
  }

  const squareSubscription = await createSubscription({
    customerId: squareCustomerId,
    locationId: env.SQUARE_LOCATION_ID,
    planVariationId: plan.planVariationId,
  });

  const subscription = await Subscription.findOneAndUpdate(
    { tenantId },
    {
      tenantId,
      squareCustomerId,
      squareSubscriptionId: squareSubscription?.id ?? 'pending',
      status: squareSubscription?.status ?? 'PENDING',
      plan: planKey,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  syncedCompany.plan = planKey;
  await syncedCompany.save();

  await createFinancialRecord({
    tenantId,
    type: 'subscription',
    amount: plan.monthlyPrice,
    status: subscription?.status ?? 'PENDING',
    description: `Workspace subscribed to ${plan.name}`,
    referenceId: subscription?.id ?? null,
    externalReferenceId: subscription?.squareSubscriptionId ?? null,
    createdBy: req.user?.id ?? null,
    metadata: {
      planKey,
      source: 'workspace_billing',
    },
  });

  res.status(201).json({ subscription, workspacePlan: syncedCompany.plan });
});

export const cancelSubscription = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const company = await Company.findOne({ tenantId });
  const subscription = await Subscription.findOne({ tenantId }).sort({ updatedAt: -1, createdAt: -1 });

  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }
  const syncedCompany = await syncCompanyIdentity(company);
  if (!subscription) {
    throw new AppError('Subscription not found', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  if (subscription.squareSubscriptionId !== 'pending' && !['CANCELED', 'CANCELLED'].includes(subscription.status)) {
    await cancelExistingSubscription(subscription.squareSubscriptionId);
  }

  subscription.status = 'CANCELED';
  await subscription.save();

  syncedCompany.plan = 'starter';
  await syncedCompany.save();

  await createFinancialRecord({
    tenantId,
    type: 'subscription',
    amount: 0,
    status: 'CANCELED',
    description: `Workspace canceled subscription ${subscription.plan}`,
    referenceId: subscription.id,
    externalReferenceId: subscription.squareSubscriptionId,
    createdBy: req.user?.id ?? null,
    metadata: {
      planKey: subscription.plan,
      source: 'workspace_billing',
    },
  });

  res.json({ subscription, workspacePlan: syncedCompany.plan });
});

export const webhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-square-hmacsha256-signature'];
  const rawBody = req.rawBody;

  if (!signature || typeof signature !== 'string') {
    throw new AppError('Missing webhook signature', 401, 'SIGNATURE_REQUIRED');
  }
  if (!rawBody) {
    throw new AppError('Missing raw webhook payload', 400, 'RAW_BODY_REQUIRED');
  }

  const isValid = verifySquareSignature(signature, rawBody, getWebhookUrl());
  if (!isValid) {
    throw new AppError('Invalid webhook signature', 401, 'INVALID_SIGNATURE');
  }

  const event = req.body;
  const data = event?.data?.object?.subscription;
  if (data?.id) {
    const subscription = await Subscription.findOneAndUpdate(
      { squareSubscriptionId: data.id },
      { status: data.status },
      { new: true },
    );

    if (subscription?.tenantId) {
      await Company.findOneAndUpdate(
        { tenantId: subscription.tenantId },
        { plan: data.status === 'ACTIVE' ? subscription.plan : 'starter' },
      );

      await createFinancialRecord({
        tenantId: subscription.tenantId,
        type: 'subscription',
        amount: data.status === 'ACTIVE' ? BILLING_PLANS[subscription.plan as BillingPlanKey]?.monthlyPrice ?? 0 : 0,
        status: data.status,
        description: `Square webhook updated subscription to ${data.status}`,
        referenceId: subscription.id,
        externalReferenceId: subscription.squareSubscriptionId,
        metadata: {
          source: 'square_webhook',
          eventType: event?.type ?? null,
          planKey: subscription.plan,
        },
      });
    }
  }
  res.json({ received: true });
});
