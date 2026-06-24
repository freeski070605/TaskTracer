'use client';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiFetch } from '../../lib/api';

interface BillingPlan {
  key: 'starter' | 'pro' | 'enterprise';
  name: string;
  monthlyPrice: number;
  description: string;
  features: string[];
  configured: boolean;
}

interface BillingSummary {
  workspace: {
    tenantKey: string;
    organizationSlug: string;
    organizationName: string;
    contactEmail: string;
    plan: string;
    isActive: boolean;
    squareCustomerId: string | null;
  };
  subscription: {
    status: string;
    plan: string;
    updatedAt?: string;
  } | null;
  plans: BillingPlan[];
}

export default function BillingPage() {
  const [data, setData] = useState<BillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<BillingSummary>('/billing/summary');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load billing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const subscribe = async (planKey: BillingPlan['key']) => {
    setBusyPlan(planKey);
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify({ planKey }),
      });
      setMessage(`Billing plan updated to ${planKey}.`);
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update plan');
    } finally {
      setBusyPlan(null);
    }
  };

  const cancel = async () => {
    setBusyPlan('cancel');
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/billing/cancel', { method: 'POST' });
      setMessage('Subscription canceled. Workspace has been moved back to Starter.');
      await loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel subscription');
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="card p-6">
          <h1 className="text-2xl font-semibold">Billing</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage your Square subscription and keep your workspace plan aligned with your facility operations.
          </p>
          {loading && <p className="mt-4 text-sm text-slate-500">Loading billing summary...</p>}
          {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
          {data && (
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Current plan</div>
                <div className="mt-2 text-2xl font-semibold text-brand-700">{data.workspace.plan}</div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Subscription status</div>
                <div className="mt-2 text-2xl font-semibold">{data.subscription?.status ?? 'Not subscribed'}</div>
              </div>
              <div className="rounded-2xl border border-blue-100 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Square customer</div>
                <div className="mt-2 break-all text-sm text-slate-600">{data.workspace.squareCustomerId ?? 'Created on first subscription'}</div>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {data?.plans.map((plan) => {
            const isCurrent = data.workspace.plan === plan.key;
            return (
              <article key={plan.key} className="card flex h-full flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                    <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-semibold text-brand-700">${plan.monthlyPrice}</div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">per month</div>
                  </div>
                </div>
                <ul className="mt-6 grid gap-2 text-sm text-slate-600">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <div className="mt-6 flex items-center justify-between">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${plan.configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {plan.configured ? 'Configured' : 'Needs plan variation ID'}
                  </span>
                  <button
                    className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!plan.configured || isCurrent || busyPlan !== null}
                    onClick={() => subscribe(plan.key)}
                  >
                    {busyPlan === plan.key ? 'Updating...' : isCurrent ? 'Current plan' : 'Choose plan'}
                  </button>
                </div>
              </article>
            );
          })}
        </section>

        {data?.subscription && (
          <section className="card p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Subscription actions</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Cancel the current Square subscription if you need to step the workspace back down.
                </p>
              </div>
              <button
                className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busyPlan !== null}
                onClick={cancel}
              >
                {busyPlan === 'cancel' ? 'Canceling...' : 'Cancel subscription'}
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
