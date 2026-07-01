import { Request, Response } from 'express';
import AuditLog from '../models/auditLog.model';
import Duty from '../models/duty.model';
import Company, { CompanyDocument } from '../models/company.model';
import FinancialRecord from '../models/financialRecord.model';
import Location from '../models/location.model';
import Notification from '../models/notification.model';
import Schedule from '../models/schedule.model';
import Subscription, { SubscriptionDocument } from '../models/subscription.model';
import Task from '../models/task.model';
import TaskLog from '../models/taskLog.model';
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
  slugifyOrganization,
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

const serializeFinancialRecord = (
  record: {
    _id?: unknown;
    id?: string;
    tenantId: string;
    type: string;
    amount: number;
    currency: string;
    status: string;
    description: string;
    referenceId?: string | null;
    externalReferenceId?: string | null;
    occurredAt: Date;
    createdAt?: Date;
    metadata?: Record<string, unknown>;
  },
  company?: { name?: string; slug?: string } | null,
) => ({
  id: record.id ?? String(record._id ?? ''),
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
  createdAt: record.createdAt ?? null,
  metadata: record.metadata ?? {},
});

const enrichCompany = async (company: CompanyWithTimestamps) => {
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
    subscription: serializeSubscription({ company: syncedCompany, subscription: subscription as SubscriptionLike | null }),
  };
};
export const listCompanies = asyncHandler(async (_req: Request, res: Response) => {
  const companies = await Company.find().sort({ createdAt: -1 });
  const enrichedCompanies = await Promise.all(companies.map((company) => enrichCompany(company as CompanyWithTimestamps)));

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

export const createCompany = asyncHandler(async (req: Request, res: Response) => {
  const {
    organizationName,
    organizationSlug,
    tenantId,
    contactEmail,
    plan,
    isActive,
  } = req.body as {
    organizationName: string;
    organizationSlug?: string;
    tenantId?: string;
    contactEmail: string;
    plan?: BillingPlanKey;
    isActive?: boolean;
  };

  const uniqueSlug = await ensureUniqueOrganizationSlug(organizationSlug ?? organizationName);
  const resolvedTenantId = slugifyOrganization(tenantId?.trim() || uniqueSlug);
  const existingTenant = await Company.findOne({ tenantId: resolvedTenantId }).select('_id');
  if (existingTenant) {
    throw new AppError('Tenant key already exists', 409, 'TENANT_EXISTS');
  }

  const company = await Company.create({
    tenantId: resolvedTenantId,
    slug: uniqueSlug,
    name: organizationName,
    normalizedName: normalizeOrganizationName(organizationName),
    contactEmail,
    plan: plan ?? 'starter',
    isActive: isActive ?? true,
  });

  res.status(201).json({ company: await enrichCompany(company as CompanyWithTimestamps) });
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

  res.json({ company: await enrichCompany(syncedCompany as CompanyWithTimestamps) });
});

export const deleteCompany = asyncHandler(async (req: Request, res: Response) => {
  const { companyId } = req.params;
  const company = await Company.findById(companyId);
  if (!company) {
    throw new AppError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
  }

  const relatedCounts = await Promise.all([
    User.countDocuments({ tenantId: company.tenantId }),
    Task.countDocuments({ tenantId: company.tenantId }),
    TaskLog.countDocuments({ tenantId: company.tenantId }),
    Duty.countDocuments({ tenantId: company.tenantId }),
    Location.countDocuments({ tenantId: company.tenantId }),
    Schedule.countDocuments({ tenantId: company.tenantId }),
    Subscription.countDocuments({ tenantId: company.tenantId }),
    FinancialRecord.countDocuments({ tenantId: company.tenantId }),
    Notification.countDocuments({ tenantId: company.tenantId }),
    AuditLog.countDocuments({ tenantId: company.tenantId }),
  ]);

  if (relatedCounts.some((count) => count > 0)) {
    throw new AppError(
      'Workspace has related data. Suspend it instead, or remove related users/tasks/billing records first.',
      409,
      'WORKSPACE_HAS_RELATED_DATA',
    );
  }

  await company.deleteOne();
  res.status(204).send();
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

  res.json({ records: records.map((record) => serializeFinancialRecord(record, companyMap.get(record.tenantId))) });
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

  res.status(201).json({ record: serializeFinancialRecord(record, company) });
});

export const updateFinancialRecord = asyncHandler(async (req: Request, res: Response) => {
  const { recordId } = req.params;
  const {
    type,
    amount,
    currency,
    status,
    description,
    referenceId,
    externalReferenceId,
    occurredAt,
  } = req.body as {
    type?: 'subscription' | 'payment' | 'refund' | 'adjustment' | 'note';
    amount?: number;
    currency?: string;
    status?: string;
    description?: string;
    referenceId?: string | null;
    externalReferenceId?: string | null;
    occurredAt?: string;
  };

  const record = await FinancialRecord.findById(recordId);
  if (!record) {
    throw new AppError('Financial record not found', 404, 'FINANCIAL_RECORD_NOT_FOUND');
  }

  if (type) record.type = type;
  if (typeof amount === 'number') record.amount = amount;
  if (currency) record.currency = currency.toUpperCase();
  if (status) record.status = status;
  if (description) record.description = description;
  if (referenceId !== undefined) record.referenceId = referenceId || null;
  if (externalReferenceId !== undefined) record.externalReferenceId = externalReferenceId || null;
  if (occurredAt) record.occurredAt = new Date(occurredAt);
  record.metadata = {
    ...(record.metadata ?? {}),
    lastEditedBy: req.user?.id ?? null,
    lastEditedAt: new Date().toISOString(),
  };

  await record.save();
  const company = await Company.findOne({ tenantId: record.tenantId });
  res.json({ record: serializeFinancialRecord(record, company) });
});

export const deleteFinancialRecord = asyncHandler(async (req: Request, res: Response) => {
  const { recordId } = req.params;
  const record = await FinancialRecord.findById(recordId);
  if (!record) {
    throw new AppError('Financial record not found', 404, 'FINANCIAL_RECORD_NOT_FOUND');
  }

  await record.deleteOne();
  res.status(204).send();
});

