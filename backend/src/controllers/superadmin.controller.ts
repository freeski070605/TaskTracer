import { Request, Response } from 'express';
import AuditLog from '../models/auditLog.model';
import Company, { CompanyDocument } from '../models/company.model';
import FinancialRecord from '../models/financialRecord.model';
import Subscription, { SubscriptionDocument } from '../models/subscription.model';
import Task from '../models/task.model';
import User from '../models/user.model';
import { cancelExistingSubscription } from '../services/square.service';
import { createFinancialRecord } from '../services/financialRecord.service';
import { asyncHandler } from '../utils/asyncHandler';
import { BILLING_PLANS, BILLING_PLAN_KEYS, type BillingPlanKey } from '../utils/billingPlans';
import { AppError } from '../utils/errors';
import {
  ensureUniqueOrganizationSlug,
  normalizeOrganizationName,
  serializeCompany,
  syncCompanyIdentity,
} from '../utils/organization';

const NON_BILLABLE_STATUSES = ['CANCELED', 'CANCELLED', 'EXPIRED'];

type CompanyWithTimestamps = CompanyDocument & {
  createdAt?: Date;
  updatedAt?: Date;
};

type SubscriptionLike = SubscriptionDocument & {
  createdAt?: Date;
  updatedAt?: Date;
};

const isBillableStatus = (status?: string | null) => {
  if (!status) return false;
  return !NON_BILLABLE_STATUSES.includes(status.toUpperCase());
};

const getPlanMonthlyValue = (plan?: string | null) => {
  if (!plan || !BILLING_PLAN_KEYS.includes(plan as BillingPlanKey)) {
    return 0;
  }

  return BILLING_PLANS[plan as BillingPlanKey].monthlyPrice;
};

const serializeSubscription = (params: {
  company: CompanyWithTimestamps;
  subscription: SubscriptionLike | null;
}) => {
  const { company, subscription } = params;
  const status = subscription?.status ?? (company.plan === 'starter' ? 'UNSUBSCRIBED' : 'INACTIVE');
  const plan = subscription?.plan ?? company.plan;
  const monthlyRecurringRevenue = isBillableStatus(status) ? getPlanMonthlyValue(plan) : 0;

  return {
    id: subscription?.id ?? `${company.id}:subscription`,
    tenantKey: company.tenantId,
    organizationName: company.name,
    organizationSlug: company.slug,
    plan,
    status,
    squareCustomerId: company.squareCustomerId ?? subscription?.squareCustomerId ?? null,
    squareSubscriptionId: subscription?.squareSubscriptionId ?? null,
    monthlyRecurringRevenue,
    updatedAt: subscription?.updatedAt ?? company.updatedAt ?? null,
    createdAt: subscription?.createdAt ?? company.createdAt ?? null,
  };
};

export const listCompanies = asyncHandler(async (_req: Request, res: Response) => {
  const companies = await Company.find().sort({ createdAt: -1 });
  const enrichedCompanies = await Promise.all(
    companies.map(async (company) => {
      const syncedCompany = await syncCompanyIdentity(company);
      const [userCount, activeUserCount, taskCount, completedTaskCount, approvedTaskCount, subscription, lastAudit] =
        await Promise.all([
          User.countDocuments({ tenantId: syncedCompany.tenantId }),
          User.countDocuments({ tenantId: syncedCompany.tenantId, isActive: true }),
          Task.countDocuments({ tenantId: syncedCompany.tenantId }),
          Task.countDocuments({ tenantId: syncedCompany.tenantId, status: 'completed' }),
          Task.countDocuments({ tenantId: syncedCompany.tenantId, status: 'approved' }),
          Subscription.findOne({ tenantId: syncedCompany.tenantId }).sort({ updatedAt: -1, createdAt: -1 }),
          AuditLog.findOne({ tenantId: syncedCompany.tenantId }).sort({ createdAt: -1 }),
        ]);

      return {
        ...serializeCompany(syncedCompany),
        userCount,
        activeUserCount,
        taskCount,
        completedTaskCount,
        approvedTaskCount,
        lastActivityAt: (lastAudit as { createdAt?: Date } | null)?.createdAt ?? null,
        subscription: serializeSubscription({ company: syncedCompany as CompanyWithTimestamps, subscription: subscription as SubscriptionLike | null }),
      };
    }),
  );

  res.json({ companies: enrichedCompanies });
});

export const saasMetrics = asyncHandler(async (_req: Request, res: Response) => {
  const [companies, activeCompanies, users, tasks, completedTasks, approvedTasks, rejectedTasks, proofPhotos, subscriptions, financialRecordsCount] =
    await Promise.all([
      Company.countDocuments(),
      Company.countDocuments({ isActive: true }),
      User.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: 'completed' }),
      Task.countDocuments({ status: 'approved' }),
      Task.countDocuments({ status: 'rejected' }),
      Task.countDocuments({ proofPhoto: { $ne: null } }),
      Subscription.find().sort({ updatedAt: -1 }),
      FinancialRecord.countDocuments(),
    ]);

  const planMix = Object.fromEntries(BILLING_PLAN_KEYS.map((plan) => [plan, 0])) as Record<BillingPlanKey, number>;
  const subscriptionStatusCounts: Record<string, number> = {};
  let monthlyRecurringRevenue = 0;

  subscriptions.forEach((subscription) => {
    const status = subscription.status.toUpperCase();
    subscriptionStatusCounts[status] = (subscriptionStatusCounts[status] ?? 0) + 1;

    if (BILLING_PLAN_KEYS.includes(subscription.plan as BillingPlanKey)) {
      planMix[subscription.plan as BillingPlanKey] += 1;
    }

    if (isBillableStatus(subscription.status)) {
      monthlyRecurringRevenue += getPlanMonthlyValue(subscription.plan);
    }
  });

  res.json({
    companies,
    activeCompanies,
    inactiveCompanies: companies - activeCompanies,
    users,
    tasks,
    completedTasks,
    approvedTasks,
    rejectedTasks,
    proofPhotos,
    activeSubscriptions: subscriptions.filter((subscription) => isBillableStatus(subscription.status)).length,
    monthlyRecurringRevenue,
    annualRunRate: monthlyRecurringRevenue * 12,
    averageUsersPerCompany: companies ? Number((users / companies).toFixed(1)) : 0,
    averageTasksPerCompany: companies ? Number((tasks / companies).toFixed(1)) : 0,
    approvalRate: completedTasks + approvedTasks + rejectedTasks
      ? Number((((approvedTasks + completedTasks) / (completedTasks + approvedTasks + rejectedTasks)) * 100).toFixed(1))
      : 0,
    proofPhotoCoverage: tasks ? Number(((proofPhotos / tasks) * 100).toFixed(1)) : 0,
    financialRecordsCount,
    planMix,
    subscriptionStatusCounts,
  });
});

export const listSubscriptions = asyncHandler(async (_req: Request, res: Response) => {
  const companies = await Company.find().sort({ createdAt: -1 });
  const subscriptions = await Promise.all(
    companies.map(async (company) => {
      const syncedCompany = await syncCompanyIdentity(company);
      const subscription = await Subscription.findOne({ tenantId: syncedCompany.tenantId }).sort({
        updatedAt: -1,
        createdAt: -1,
      });
      return serializeSubscription({ company: syncedCompany as CompanyWithTimestamps, subscription: subscription as SubscriptionLike | null });
    }),
  );

  res.json({
    subscriptions,
    summary: {
      monthlyRecurringRevenue: subscriptions.reduce((sum, subscription) => sum + subscription.monthlyRecurringRevenue, 0),
      activeSubscriptions: subscriptions.filter((subscription) => isBillableStatus(subscription.status)).length,
    },
  });
});

export const updateCompany = asyncHandler(async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const {
    organizationName,
    organizationSlug,
    contactEmail,
    plan,
    isActive,
  } = req.body as {
    organizationName?: string;
    organizationSlug?: string;
    contactEmail?: string;
    plan?: string;
    isActive?: boolean;
  };

  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }

  if (organizationName) {
    company.name = organizationName;
    company.normalizedName = normalizeOrganizationName(organizationName);
  }

  if (organizationSlug) {
    company.slug = await ensureUniqueOrganizationSlug(organizationSlug, company.id);
  }

  if (contactEmail) {
    company.contactEmail = contactEmail;
  }

  if (plan) {
    company.plan = plan;
  }

  if (typeof isActive === 'boolean') {
    company.isActive = isActive;
  }

  await company.save();
  const syncedCompany = await syncCompanyIdentity(company);

  const [userCount, activeUserCount, taskCount, completedTaskCount, approvedTaskCount, subscription] = await Promise.all([
    User.countDocuments({ tenantId: syncedCompany.tenantId }),
    User.countDocuments({ tenantId: syncedCompany.tenantId, isActive: true }),
    Task.countDocuments({ tenantId: syncedCompany.tenantId }),
    Task.countDocuments({ tenantId: syncedCompany.tenantId, status: 'completed' }),
    Task.countDocuments({ tenantId: syncedCompany.tenantId, status: 'approved' }),
    Subscription.findOne({ tenantId: syncedCompany.tenantId }).sort({ updatedAt: -1, createdAt: -1 }),
  ]);

  res.json({
    company: {
      ...serializeCompany(syncedCompany),
      userCount,
      activeUserCount,
      taskCount,
      completedTaskCount,
      approvedTaskCount,
      subscription: serializeSubscription({ company: syncedCompany as CompanyWithTimestamps, subscription: subscription as SubscriptionLike | null }),
    },
  });
});

export const updateCompanySubscription = asyncHandler(async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const {
    plan,
    status,
    notes,
    cancelAtProvider,
  } = req.body as {
    plan: BillingPlanKey;
    status: string;
    notes?: string;
    cancelAtProvider?: boolean;
  };

  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }

  const existing = await Subscription.findOne({ tenantId: company.tenantId }).sort({ updatedAt: -1, createdAt: -1 });
  if (cancelAtProvider && existing?.squareSubscriptionId && existing.squareSubscriptionId !== 'pending' && isBillableStatus(existing.status)) {
    await cancelExistingSubscription(existing.squareSubscriptionId);
  }

  const subscription = await Subscription.findOneAndUpdate(
    { tenantId: company.tenantId },
    {
      tenantId: company.tenantId,
      squareCustomerId: company.squareCustomerId ?? existing?.squareCustomerId ?? 'manual',
      squareSubscriptionId: existing?.squareSubscriptionId ?? 'manual',
      status,
      plan,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  company.plan = plan;
  await company.save();
  const syncedCompany = await syncCompanyIdentity(company);

  await createFinancialRecord({
    tenantId: company.tenantId,
    type: 'adjustment',
    amount: getPlanMonthlyValue(plan),
    status,
    description: notes?.trim() || `Superadmin updated subscription to ${plan} (${status})`,
    referenceId: subscription.id,
    externalReferenceId: subscription.squareSubscriptionId,
    createdBy: req.user?.id ?? null,
    metadata: {
      source: 'superadmin',
      plan,
      status,
      cancelAtProvider: Boolean(cancelAtProvider),
    },
  });

  res.json({
    subscription: serializeSubscription({ company: syncedCompany as CompanyWithTimestamps, subscription: subscription as SubscriptionLike | null }),
  });
});

export const listFinancialRecords = asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 100, 250);
  const records = await FinancialRecord.find()
    .sort({ occurredAt: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  const tenantIds = [...new Set(records.map((record) => record.tenantId))];
  const companies = await Company.find({ tenantId: { $in: tenantIds } }).lean();
  const companyMap = new Map(companies.map((company) => [company.tenantId, company]));

  res.json({
    records: records.map((record) => {
      const company = companyMap.get(record.tenantId);
      return {
        id: String(record._id),
        tenantKey: record.tenantId,
        organizationName: company?.name ?? record.tenantId,
        organizationSlug: company?.slug ?? record.tenantId,
        type: record.type,
        amount: record.amount,
        currency: record.currency,
        status: record.status,
        description: record.description,
        referenceId: record.referenceId ?? null,
        externalReferenceId: record.externalReferenceId ?? null,
        occurredAt: record.occurredAt,
        createdAt: (record as { createdAt?: Date }).createdAt ?? null,
        metadata: record.metadata ?? {},
      };
    }),
  });
});

export const createManualFinancialRecord = asyncHandler(async (req: Request, res: Response) => {
  const {
    companyId,
    type,
    amount,
    currency,
    status,
    description,
    referenceId,
  } = req.body as {
    companyId: string;
    type: 'subscription' | 'payment' | 'refund' | 'adjustment' | 'note';
    amount?: number;
    currency?: string;
    status?: string;
    description: string;
    referenceId?: string;
  };

  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }

  const record = await createFinancialRecord({
    tenantId: company.tenantId,
    type,
    amount,
    currency,
    status,
    description,
    referenceId,
    createdBy: req.user?.id ?? null,
    metadata: {
      source: 'superadmin_manual',
      companyId,
    },
  });

  res.status(201).json({
    record: {
      id: record.id,
      tenantKey: company.tenantId,
      organizationName: company.name,
      organizationSlug: company.slug,
      type: record.type,
      amount: record.amount,
      currency: record.currency,
      status: record.status,
      description: record.description,
      referenceId: record.referenceId ?? null,
      externalReferenceId: record.externalReferenceId ?? null,
      occurredAt: record.occurredAt,
      createdAt: (record as { createdAt?: Date }).createdAt ?? null,
      metadata: record.metadata ?? {},
    },
  });
});
