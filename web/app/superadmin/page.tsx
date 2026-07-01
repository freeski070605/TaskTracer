'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiFetch } from '../../lib/api';

interface MetricSummary {
  companies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  users: number;
  tasks: number;
  completedTasks: number;
  approvedTasks: number;
  rejectedTasks: number;
  proofPhotos: number;
  activeSubscriptions: number;
  monthlyRecurringRevenue: number;
  annualRunRate: number;
  averageUsersPerCompany: number;
  averageTasksPerCompany: number;
  approvalRate: number;
  proofPhotoCoverage: number;
  financialRecordsCount: number;
  planMix: Record<string, number>;
  subscriptionStatusCounts: Record<string, number>;
}

interface SubscriptionSummary {
  id: string;
  tenantKey: string;
  organizationName: string;
  organizationSlug: string;
  plan: string;
  status: string;
  squareCustomerId?: string | null;
  squareSubscriptionId?: string | null;
  monthlyRecurringRevenue: number;
  updatedAt?: string;
  createdAt?: string;
}

interface CompanySummary {
  id: string;
  tenantKey: string;
  organizationSlug: string;
  organizationName: string;
  contactEmail: string;
  plan: string;
  isActive: boolean;
  squareCustomerId?: string | null;
  userCount: number;
  activeUserCount: number;
  taskCount: number;
  completedTaskCount: number;
  approvedTaskCount: number;
  lastActivityAt?: string | null;
  subscription: SubscriptionSummary;
}

interface CompanyDraft {
  organizationName: string;
  organizationSlug: string;
  contactEmail: string;
  plan: string;
  isActive: boolean;
}

interface FinancialRecordDraft {
  type: string;
  amount: string;
  currency: string;
  status: string;
  description: string;
  referenceId: string;
  externalReferenceId: string;
  occurredAt: string;
}
interface FinancialRecord {
  id: string;
  tenantKey: string;
  organizationName: string;
  organizationSlug: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  referenceId?: string | null;
  externalReferenceId?: string | null;
  occurredAt: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
}

const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string | null) => {
  if (!value) return 'No recent activity';
  return new Date(value).toLocaleString();
};

const toDateTimeInputValue = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
};

export default function SuperadminPage() {
  const [metrics, setMetrics] = useState<MetricSummary | null>(null);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummary[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionDrafts, setSubscriptionDrafts] = useState<Record<string, { plan: string; status: string; notes: string }>>({});
  const [companyDrafts, setCompanyDrafts] = useState<Record<string, CompanyDraft>>({});
  const [companyForm, setCompanyForm] = useState<CompanyDraft & { tenantId: string }>({
    organizationName: '',
    organizationSlug: '',
    tenantId: '',
    contactEmail: '',
    plan: 'starter',
    isActive: true,
  });
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [financialRecordDraft, setFinancialRecordDraft] = useState<FinancialRecordDraft | null>(null);
  const [financialForm, setFinancialForm] = useState({
    companyId: '',
    type: 'note',
    amount: '0',
    currency: 'USD',
    status: 'recorded',
    description: '',
    referenceId: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metricResponse, companyResponse, subscriptionResponse, recordsResponse] = await Promise.all([
        apiFetch<MetricSummary>('/superadmin/metrics'),
        apiFetch<{ companies: CompanySummary[] }>('/superadmin/companies'),
        apiFetch<{ subscriptions: SubscriptionSummary[] }>('/superadmin/subscriptions'),
        apiFetch<{ records: FinancialRecord[] }>('/superadmin/financial-records'),
      ]);

      setMetrics(metricResponse);
      setCompanies(companyResponse.companies);
      setSubscriptions(subscriptionResponse.subscriptions);
      setFinancialRecords(recordsResponse.records);
      setCompanyDrafts(
        Object.fromEntries(
          companyResponse.companies.map((company) => [
            company.id,
            {
              organizationName: company.organizationName,
              organizationSlug: company.organizationSlug,
              contactEmail: company.contactEmail,
              plan: company.plan,
              isActive: company.isActive,
            },
          ]),
        ),
      );
      setSubscriptionDrafts(
        Object.fromEntries(
          subscriptionResponse.subscriptions.map((subscription) => [
            subscription.tenantKey,
            {
              plan: subscription.plan,
              status: subscription.status,
              notes: '',
            },
          ]),
        ),
      );

      if (!financialForm.companyId && companyResponse.companies.length > 0) {
        setFinancialForm((current) => ({ ...current, companyId: companyResponse.companies[0].id }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load portfolio data');
    } finally {
      setLoading(false);
    }
  }, [financialForm.companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleWorkspaceStatus = async (company: CompanySummary) => {
    setBusyKey(`company:${company.id}`);
    setError(null);
    try {
      await apiFetch(`/superadmin/companies/${company.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !company.isActive }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update workspace');
    } finally {
      setBusyKey(null);
    }
  };

  const createCompany = async () => {
    setBusyKey('company:create');
    setError(null);
    try {
      await apiFetch('/superadmin/companies', {
        method: 'POST',
        body: JSON.stringify({
          organizationName: companyForm.organizationName,
          organizationSlug: companyForm.organizationSlug || undefined,
          tenantId: companyForm.tenantId || undefined,
          contactEmail: companyForm.contactEmail,
          plan: companyForm.plan,
          isActive: companyForm.isActive,
        }),
      });
      setCompanyForm({
        organizationName: '',
        organizationSlug: '',
        tenantId: '',
        contactEmail: '',
        plan: 'starter',
        isActive: true,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create workspace');
    } finally {
      setBusyKey(null);
    }
  };

  const saveCompany = async (company: CompanySummary) => {
    const draft = companyDrafts[company.id];
    if (!draft) return;

    setBusyKey(`company:save:${company.id}`);
    setError(null);
    try {
      await apiFetch(`/superadmin/companies/${company.id}`, {
        method: 'PATCH',
        body: JSON.stringify(draft),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save workspace');
    } finally {
      setBusyKey(null);
    }
  };

  const deleteCompany = async (company: CompanySummary) => {
    setBusyKey(`company:delete:${company.id}`);
    setError(null);
    try {
      await apiFetch(`/superadmin/companies/${company.id}`, { method: 'DELETE' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete workspace');
    } finally {
      setBusyKey(null);
    }
  };
  const saveSubscription = async (company: CompanySummary) => {
    const draft = subscriptionDrafts[company.tenantKey];
    if (!draft) return;

    setBusyKey(`subscription:${company.id}`);
    setError(null);
    try {
      await apiFetch(`/superadmin/companies/${company.id}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({
          plan: draft.plan,
          status: draft.status,
          notes: draft.notes || undefined,
          cancelAtProvider: draft.status.toUpperCase() === 'CANCELED',
        }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update subscription');
    } finally {
      setBusyKey(null);
    }
  };

  const createFinancialRecord = async () => {
    setBusyKey('financial:create');
    setError(null);
    try {
      await apiFetch('/superadmin/financial-records', {
        method: 'POST',
        body: JSON.stringify({
          companyId: financialForm.companyId,
          type: financialForm.type,
          amount: Number(financialForm.amount || '0'),
          currency: financialForm.currency,
          status: financialForm.status,
          description: financialForm.description,
          referenceId: financialForm.referenceId || undefined,
        }),
      });

      setFinancialForm((current) => ({
        ...current,
        amount: '0',
        status: 'recorded',
        description: '',
        referenceId: '',
      }));
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create financial record');
    } finally {
      setBusyKey(null);
    }
  };

  const startEditingFinancialRecord = (record: FinancialRecord) => {
    setEditingRecordId(record.id);
    setFinancialRecordDraft({
      type: record.type,
      amount: String(record.amount),
      currency: record.currency,
      status: record.status,
      description: record.description,
      referenceId: record.referenceId ?? '',
      externalReferenceId: record.externalReferenceId ?? '',
      occurredAt: toDateTimeInputValue(record.occurredAt),
    });
  };

  const updateFinancialRecord = async () => {
    if (!editingRecordId || !financialRecordDraft) return;

    setBusyKey(`financial:update:${editingRecordId}`);
    setError(null);
    try {
      await apiFetch(`/superadmin/financial-records/${editingRecordId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          type: financialRecordDraft.type,
          amount: Number(financialRecordDraft.amount || '0'),
          currency: financialRecordDraft.currency,
          status: financialRecordDraft.status,
          description: financialRecordDraft.description,
          referenceId: financialRecordDraft.referenceId || null,
          externalReferenceId: financialRecordDraft.externalReferenceId || null,
          occurredAt: financialRecordDraft.occurredAt ? new Date(financialRecordDraft.occurredAt).toISOString() : undefined,
        }),
      });
      setEditingRecordId(null);
      setFinancialRecordDraft(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update financial record');
    } finally {
      setBusyKey(null);
    }
  };

  const deleteFinancialRecord = async (record: FinancialRecord) => {
    setBusyKey(`financial:delete:${record.id}`);
    setError(null);
    try {
      await apiFetch(`/superadmin/financial-records/${record.id}`, { method: 'DELETE' });
      if (editingRecordId === record.id) {
        setEditingRecordId(null);
        setFinancialRecordDraft(null);
      }
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete financial record');
    } finally {
      setBusyKey(null);
    }
  };
  const topUsageCompanies = useMemo(
    () => [...companies].sort((left, right) => right.taskCount - left.taskCount).slice(0, 5),
    [companies],
  );

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="card p-6">
          <h1 className="text-2xl font-semibold">Superadmin back office</h1>
          <p className="mt-2 text-sm text-slate-600">
            Centralize portfolio intelligence, subscription control, and financial recordkeeping in one operating view.
          </p>
          {loading && <p className="mt-4 text-sm text-slate-500">Loading back-office data...</p>}
          {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </section>

        {metrics && (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Monthly recurring revenue', value: formatCurrency(metrics.monthlyRecurringRevenue) },
                { label: 'Annual run rate', value: formatCurrency(metrics.annualRunRate) },
                { label: 'Active subscriptions', value: metrics.activeSubscriptions },
                { label: 'Financial records', value: metrics.financialRecordsCount },
                { label: 'Organizations', value: metrics.companies },
                { label: 'Platform users', value: metrics.users },
                { label: 'Tasks processed', value: metrics.tasks },
                { label: 'Proof coverage', value: `${metrics.proofPhotoCoverage}%` },
              ].map((item) => (
                <div key={item.label} className="card p-5">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                  <div className="mt-2 text-3xl font-semibold text-brand-700">{item.value}</div>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr_0.9fr]">
              <article className="card p-6">
                <h2 className="text-lg font-semibold">Back-office signals</h2>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Approval rate</span>
                    <span className="font-semibold">{metrics.approvalRate}%</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Average users per company</span>
                    <span className="font-semibold">{metrics.averageUsersPerCompany}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Average tasks per company</span>
                    <span className="font-semibold">{metrics.averageTasksPerCompany}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Completed tasks</span>
                    <span className="font-semibold">{metrics.completedTasks}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Approved tasks</span>
                    <span className="font-semibold">{metrics.approvedTasks}</span>
                  </div>
                </div>
              </article>

              <article className="card p-6">
                <h2 className="text-lg font-semibold">Plan mix</h2>
                <div className="mt-4 grid gap-3 text-sm">
                  {Object.entries(metrics.planMix).map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="capitalize text-slate-500">{plan}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </article>

              <article className="card p-6">
                <h2 className="text-lg font-semibold">Subscription status mix</h2>
                <div className="mt-4 grid gap-3 text-sm">
                  {Object.entries(metrics.subscriptionStatusCounts).length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-slate-500">
                      No subscription records yet.
                    </div>
                  )}
                  {Object.entries(metrics.subscriptionStatusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <span className="text-slate-500">{status}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </article>
            </section>
          </>
        )}

        <section className="card p-6">
          <h2 className="text-lg font-semibold">Workspace CRUD</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create tenant workspaces and keep organization identity, contact, plan, and availability current.
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr_0.9fr_0.9fr_0.7fr_auto]">
            <input
              className="rounded-lg border px-3 py-2"
              value={companyForm.organizationName}
              onChange={(event) => setCompanyForm((current) => ({ ...current, organizationName: event.target.value }))}
              placeholder="Organization name"
            />
            <input
              className="rounded-lg border px-3 py-2"
              value={companyForm.organizationSlug}
              onChange={(event) => setCompanyForm((current) => ({ ...current, organizationSlug: event.target.value }))}
              placeholder="Slug"
            />
            <input
              className="rounded-lg border px-3 py-2"
              value={companyForm.tenantId}
              onChange={(event) => setCompanyForm((current) => ({ ...current, tenantId: event.target.value }))}
              placeholder="Tenant key"
            />
            <input
              className="rounded-lg border px-3 py-2"
              type="email"
              value={companyForm.contactEmail}
              onChange={(event) => setCompanyForm((current) => ({ ...current, contactEmail: event.target.value }))}
              placeholder="Contact email"
            />
            <select
              className="rounded-lg border px-3 py-2"
              value={companyForm.plan}
              onChange={(event) => setCompanyForm((current) => ({ ...current, plan: event.target.value }))}
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <button
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                busyKey === 'company:create' ||
                !companyForm.organizationName.trim() ||
                !companyForm.contactEmail.trim()
              }
              onClick={createCompany}
            >
              {busyKey === 'company:create' ? 'Creating...' : 'Create'}
            </button>
          </div>
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={companyForm.isActive}
              onChange={(event) => setCompanyForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Active on creation
          </label>
        </section>
        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <article className="card p-6">
            <h2 className="text-lg font-semibold">Organization roster</h2>
            <p className="mt-1 text-sm text-slate-600">
              Suspend tenant access, watch usage health, and see which organizations are driving the most value.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="pb-3 pr-4 font-medium">Organization</th>
                    <th className="pb-3 pr-4 font-medium">Users</th>
                    <th className="pb-3 pr-4 font-medium">Tasks</th>
                    <th className="pb-3 pr-4 font-medium">Revenue</th>
                    <th className="pb-3 pr-4 font-medium">Last activity</th>
                    <th className="pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => {
                    const draft = companyDrafts[company.id] ?? {
                      organizationName: company.organizationName,
                      organizationSlug: company.organizationSlug,
                      contactEmail: company.contactEmail,
                      plan: company.plan,
                      isActive: company.isActive,
                    };

                    return (
                      <tr key={company.id} className="border-t border-slate-100 align-top">
                        <td className="py-3 pr-4">
                          <div className="grid min-w-[260px] gap-2">
                            <input
                              className="rounded-lg border px-3 py-2"
                              value={draft.organizationName}
                              onChange={(event) =>
                                setCompanyDrafts((current) => ({
                                  ...current,
                                  [company.id]: { ...draft, organizationName: event.target.value },
                                }))
                              }
                            />
                            <div className="grid gap-2 md:grid-cols-2">
                              <input
                                className="rounded-lg border px-3 py-2"
                                value={draft.organizationSlug}
                                onChange={(event) =>
                                  setCompanyDrafts((current) => ({
                                    ...current,
                                    [company.id]: { ...draft, organizationSlug: event.target.value },
                                  }))
                                }
                              />
                              <input
                                className="rounded-lg border px-3 py-2"
                                type="email"
                                value={draft.contactEmail}
                                onChange={(event) =>
                                  setCompanyDrafts((current) => ({
                                    ...current,
                                    [company.id]: { ...draft, contactEmail: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                              <select
                                className="rounded-lg border px-3 py-2"
                                value={draft.plan}
                                onChange={(event) =>
                                  setCompanyDrafts((current) => ({
                                    ...current,
                                    [company.id]: { ...draft, plan: event.target.value },
                                  }))
                                }
                              >
                                <option value="starter">Starter</option>
                                <option value="pro">Pro</option>
                                <option value="enterprise">Enterprise</option>
                              </select>
                              <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={draft.isActive}
                                  onChange={(event) =>
                                    setCompanyDrafts((current) => ({
                                      ...current,
                                      [company.id]: { ...draft, isActive: event.target.checked },
                                    }))
                                  }
                                />
                                Active
                              </label>
                            </div>
                            <div className="text-xs text-slate-500">Tenant key: {company.tenantKey}</div>
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          {company.activeUserCount}/{company.userCount}
                        </td>
                        <td className="py-3 pr-4">
                          <div>{company.taskCount} total</div>
                          <div className="text-xs text-slate-500">{company.approvedTaskCount} approved</div>
                        </td>
                        <td className="py-3 pr-4">{formatCurrency(company.subscription.monthlyRecurringRevenue)}</td>
                        <td className="py-3 pr-4 text-xs text-slate-500">{formatDate(company.lastActivityAt)}</td>
                        <td className="py-3">
                          <div className="flex min-w-[190px] flex-col gap-2">
                            <button
                              className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={busyKey === `company:save:${company.id}`}
                              onClick={() => saveCompany(company)}
                            >
                              {busyKey === `company:save:${company.id}` ? 'Saving...' : 'Save edits'}
                            </button>
                            <button
                              className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={busyKey === `company:${company.id}`}
                              onClick={() => toggleWorkspaceStatus(company)}
                            >
                              {busyKey === `company:${company.id}`
                                ? 'Saving...'
                                : company.isActive
                                  ? 'Suspend workspace'
                                  : 'Reactivate workspace'}
                            </button>
                            <button
                              className="rounded-lg border border-red-200 px-4 py-2 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={busyKey === `company:delete:${company.id}`}
                              onClick={() => deleteCompany(company)}
                            >
                              {busyKey === `company:delete:${company.id}` ? 'Deleting...' : 'Delete empty workspace'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </article>

          <article className="card p-6">
            <h2 className="text-lg font-semibold">Top usage accounts</h2>
            <div className="mt-4 grid gap-3">
              {topUsageCompanies.map((company) => (
                <div key={company.id} className="rounded-2xl bg-slate-50 px-4 py-3">
                  <div className="font-medium text-slate-900">{company.organizationName}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {company.taskCount} tasks • {company.userCount} users • {formatCurrency(company.subscription.monthlyRecurringRevenue)} MRR
                  </div>
                </div>
              ))}
              {topUsageCompanies.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No organizations found yet.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">Subscription control center</h2>
          <p className="mt-1 text-sm text-slate-600">
            Override plan/status records centrally and keep the provider cancellation in sync when needed.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Organization</th>
                  <th className="pb-3 pr-4 font-medium">Plan</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">MRR</th>
                  <th className="pb-3 pr-4 font-medium">Notes</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => {
                  const draft = subscriptionDrafts[company.tenantKey] ?? {
                    plan: company.subscription.plan,
                    status: company.subscription.status,
                    notes: '',
                  };

                  return (
                    <tr key={company.id} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-4">
                        <div className="font-medium">{company.organizationName}</div>
                        <div className="text-xs text-slate-500">
                          {company.subscription.squareSubscriptionId ?? 'No provider subscription ID'}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          className="rounded-lg border px-3 py-2"
                          value={draft.plan}
                          onChange={(event) =>
                            setSubscriptionDrafts((current) => ({
                              ...current,
                              [company.tenantKey]: { ...draft, plan: event.target.value },
                            }))
                          }
                        >
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          className="rounded-lg border px-3 py-2"
                          value={draft.status}
                          onChange={(event) =>
                            setSubscriptionDrafts((current) => ({
                              ...current,
                              [company.tenantKey]: { ...draft, status: event.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="py-3 pr-4">{formatCurrency(company.subscription.monthlyRecurringRevenue)}</td>
                      <td className="py-3 pr-4">
                        <textarea
                          className="min-h-[72px] w-full rounded-lg border px-3 py-2"
                          placeholder="Why was this changed?"
                          value={draft.notes}
                          onChange={(event) =>
                            setSubscriptionDrafts((current) => ({
                              ...current,
                              [company.tenantKey]: { ...draft, notes: event.target.value },
                            }))
                          }
                        />
                      </td>
                      <td className="py-3">
                        <button
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={busyKey === `subscription:${company.id}`}
                          onClick={() => saveSubscription(company)}
                        >
                          {busyKey === `subscription:${company.id}` ? 'Saving...' : 'Update subscription'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="card p-6">
            <h2 className="text-lg font-semibold">Add financial record</h2>
            <p className="mt-1 text-sm text-slate-600">
              Capture manual payments, adjustments, notes, or refunds to keep the back-office ledger complete.
            </p>
            <div className="mt-4 grid gap-3">
              <select
                className="rounded-lg border px-3 py-2"
                value={financialForm.companyId}
                onChange={(event) => setFinancialForm((current) => ({ ...current, companyId: event.target.value }))}
              >
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.organizationName}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border px-3 py-2"
                value={financialForm.type}
                onChange={(event) => setFinancialForm((current) => ({ ...current, type: event.target.value }))}
              >
                <option value="note">Note</option>
                <option value="payment">Payment</option>
                <option value="refund">Refund</option>
                <option value="adjustment">Adjustment</option>
                <option value="subscription">Subscription</option>
              </select>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="rounded-lg border px-3 py-2"
                  type="number"
                  min="0"
                  step="0.01"
                  value={financialForm.amount}
                  onChange={(event) => setFinancialForm((current) => ({ ...current, amount: event.target.value }))}
                  placeholder="Amount"
                />
                <input
                  className="rounded-lg border px-3 py-2"
                  value={financialForm.currency}
                  onChange={(event) => setFinancialForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
                  placeholder="Currency"
                />
              </div>
              <input
                className="rounded-lg border px-3 py-2"
                value={financialForm.status}
                onChange={(event) => setFinancialForm((current) => ({ ...current, status: event.target.value }))}
                placeholder="Status"
              />
              <input
                className="rounded-lg border px-3 py-2"
                value={financialForm.referenceId}
                onChange={(event) => setFinancialForm((current) => ({ ...current, referenceId: event.target.value }))}
                placeholder="Reference ID"
              />
              <textarea
                className="min-h-[120px] rounded-lg border px-3 py-2"
                value={financialForm.description}
                onChange={(event) => setFinancialForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Describe the payment, adjustment, issue, or business note"
              />
              <button
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busyKey === 'financial:create' || !financialForm.companyId || !financialForm.description.trim()}
                onClick={createFinancialRecord}
              >
                {busyKey === 'financial:create' ? 'Saving...' : 'Create record'}
              </button>
            </div>
          </article>

          <article className="card p-6">
            <h2 className="text-lg font-semibold">Financial ledger</h2>
            <div className="mt-4 grid gap-3">
              {financialRecords.map((record) => {
                const isEditing = editingRecordId === record.id && financialRecordDraft;

                return (
                  <div key={record.id} className="rounded-2xl border border-slate-100 bg-white/80 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900">{record.organizationName}</div>
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {record.type} / {record.status}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-brand-700">{formatCurrency(record.amount, record.currency)}</div>
                        <div className="text-xs text-slate-500">{formatDate(record.occurredAt)}</div>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="mt-4 grid gap-3">
                        <div className="grid gap-3 md:grid-cols-3">
                          <select
                            className="rounded-lg border px-3 py-2"
                            value={financialRecordDraft.type}
                            onChange={(event) =>
                              setFinancialRecordDraft((current) => current && { ...current, type: event.target.value })
                            }
                          >
                            <option value="note">Note</option>
                            <option value="payment">Payment</option>
                            <option value="refund">Refund</option>
                            <option value="adjustment">Adjustment</option>
                            <option value="subscription">Subscription</option>
                          </select>
                          <input
                            className="rounded-lg border px-3 py-2"
                            type="number"
                            min="0"
                            step="0.01"
                            value={financialRecordDraft.amount}
                            onChange={(event) =>
                              setFinancialRecordDraft((current) => current && { ...current, amount: event.target.value })
                            }
                          />
                          <input
                            className="rounded-lg border px-3 py-2"
                            value={financialRecordDraft.currency}
                            onChange={(event) =>
                              setFinancialRecordDraft((current) => current && { ...current, currency: event.target.value.toUpperCase() })
                            }
                          />
                        </div>
                        <div className="grid gap-3 md:grid-cols-3">
                          <input
                            className="rounded-lg border px-3 py-2"
                            value={financialRecordDraft.status}
                            onChange={(event) =>
                              setFinancialRecordDraft((current) => current && { ...current, status: event.target.value })
                            }
                          />
                          <input
                            className="rounded-lg border px-3 py-2"
                            value={financialRecordDraft.referenceId}
                            onChange={(event) =>
                              setFinancialRecordDraft((current) => current && { ...current, referenceId: event.target.value })
                            }
                            placeholder="Reference ID"
                          />
                          <input
                            className="rounded-lg border px-3 py-2"
                            value={financialRecordDraft.externalReferenceId}
                            onChange={(event) =>
                              setFinancialRecordDraft((current) => current && { ...current, externalReferenceId: event.target.value })
                            }
                            placeholder="External ID"
                          />
                        </div>
                        <input
                          className="rounded-lg border px-3 py-2"
                          type="datetime-local"
                          value={financialRecordDraft.occurredAt}
                          onChange={(event) =>
                            setFinancialRecordDraft((current) => current && { ...current, occurredAt: event.target.value })
                          }
                        />
                        <textarea
                          className="min-h-[96px] rounded-lg border px-3 py-2"
                          value={financialRecordDraft.description}
                          onChange={(event) =>
                            setFinancialRecordDraft((current) => current && { ...current, description: event.target.value })
                          }
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={busyKey === `financial:update:${record.id}` || !financialRecordDraft.description.trim()}
                            onClick={updateFinancialRecord}
                          >
                            {busyKey === `financial:update:${record.id}` ? 'Saving...' : 'Save record'}
                          </button>
                          <button
                            className="btn-ghost"
                            onClick={() => {
                              setEditingRecordId(null);
                              setFinancialRecordDraft(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="mt-3 text-sm text-slate-600">{record.description}</p>
                        <div className="mt-3 text-xs text-slate-500">
                          Ref: {record.referenceId ?? 'n/a'} / External: {record.externalReferenceId ?? 'n/a'}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button className="btn-ghost" onClick={() => startEditingFinancialRecord(record)}>
                            Edit
                          </button>
                          <button
                            className="rounded-lg border border-red-200 px-4 py-2 text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={busyKey === `financial:delete:${record.id}`}
                            onClick={() => deleteFinancialRecord(record)}
                          >
                            {busyKey === `financial:delete:${record.id}` ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
              {financialRecords.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No financial records have been captured yet.
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}

