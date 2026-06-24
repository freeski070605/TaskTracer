'use client';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { useTaskStore } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';

interface AdminSnapshot {
  users: number;
  duties: number;
  locations: number;
  reports: {
    totalTasks: number;
    completed: number;
    approved: number;
    rejected: number;
  };
}

interface SupervisorSnapshot {
  assigned: number;
  completed: number;
  approved: number;
  rejected: number;
}

interface SuperadminSnapshot {
  companies: number;
  activeCompanies: number;
  inactiveCompanies: number;
  users: number;
  tasks: number;
  activeSubscriptions: number;
}

const formatRelativeTime = (value?: string | null) => {
  if (!value) return 'Pending completion';
  const diff = Date.now() - new Date(value).getTime();
  const hours = Math.max(Math.round(diff / (1000 * 60 * 60)), 0);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const statusTone: Record<string, string> = {
  assigned: 'bg-amber-50 text-amber-700',
  completed: 'bg-sky-50 text-sky-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

export default function DashboardPage() {
  const { tasks, loadTasks, connectSocket } = useTaskStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminSnapshot, setAdminSnapshot] = useState<AdminSnapshot | null>(null);
  const [supervisorSnapshot, setSupervisorSnapshot] = useState<SupervisorSnapshot | null>(null);
  const [superadminSnapshot, setSuperadminSnapshot] = useState<SuperadminSnapshot | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const requests: Promise<unknown>[] = [];

        if (user.role !== 'superadmin') {
          requests.push(loadTasks());
        }

        if (['supervisor', 'admin'].includes(user.role)) {
          requests.push(apiFetch<{ metrics: SupervisorSnapshot }>('/supervisor/dashboard'));
        }

        if (user.role === 'admin') {
          requests.push(
            Promise.all([
              apiFetch<{ users: unknown[] }>('/admin/users'),
              apiFetch<{ duties: unknown[] }>('/admin/duties'),
              apiFetch<{ locations: unknown[] }>('/admin/locations'),
              apiFetch<AdminSnapshot['reports']>('/admin/reports'),
            ]),
          );
        }

        if (user.role === 'superadmin') {
          requests.push(apiFetch<SuperadminSnapshot>('/superadmin/metrics'));
        }

        const results = await Promise.all(requests);
        if (cancelled) return;

        let index = user.role === 'superadmin' ? 0 : 1;
        if (['supervisor', 'admin'].includes(user.role)) {
          const supervisorResult = results[index] as { metrics: SupervisorSnapshot };
          setSupervisorSnapshot(supervisorResult.metrics);
          index += 1;
        } else {
          setSupervisorSnapshot(null);
        }

        if (user.role === 'admin') {
          const [usersResponse, dutiesResponse, locationsResponse, reportsResponse] = results[index] as [
            { users: unknown[] },
            { duties: unknown[] },
            { locations: unknown[] },
            AdminSnapshot['reports'],
          ];
          setAdminSnapshot({
            users: usersResponse.users.length,
            duties: dutiesResponse.duties.length,
            locations: locationsResponse.locations.length,
            reports: reportsResponse,
          });
          index += 1;
        } else {
          setAdminSnapshot(null);
        }

        if (user.role === 'superadmin') {
          setSuperadminSnapshot(results[index] as SuperadminSnapshot);
        } else {
          setSuperadminSnapshot(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    if (user.role !== 'superadmin') {
      connectSocket(user.tenantKey);
    }

    return () => {
      cancelled = true;
    };
  }, [connectSocket, loadTasks, user]);

  const counts = useMemo(() => ({
    assigned: tasks.filter((task) => task.status === 'assigned').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    approved: tasks.filter((task) => task.status === 'approved').length,
    rejected: tasks.filter((task) => task.status === 'rejected').length,
  }), [tasks]);

  const completionRate = tasks.length ? Math.round(((counts.completed + counts.approved) / tasks.length) * 100) : 0;
  const proofCoverage = tasks.length
    ? Math.round((tasks.filter((task) => Boolean(task.proofPhoto)).length / tasks.length) * 100)
    : 0;

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
    .slice(0, 6);

  const summaryCards = user?.role === 'superadmin'
    ? [
        { label: 'Organizations', value: superadminSnapshot?.companies ?? 0, accent: 'from-amber-400 to-orange-500' },
        { label: 'Active tenants', value: superadminSnapshot?.activeCompanies ?? 0, accent: 'from-sky-400 to-blue-500' },
        { label: 'Platform users', value: superadminSnapshot?.users ?? 0, accent: 'from-emerald-400 to-teal-500' },
        { label: 'Subscriptions', value: superadminSnapshot?.activeSubscriptions ?? 0, accent: 'from-indigo-400 to-brand-600' },
      ]
    : [
        { label: 'Active queue', value: counts.assigned, accent: 'from-amber-400 to-orange-500' },
        { label: 'Awaiting review', value: counts.completed, accent: 'from-sky-400 to-blue-500' },
        { label: 'Approved', value: counts.approved, accent: 'from-emerald-400 to-teal-500' },
        { label: 'Completion rate', value: `${completionRate}%`, accent: 'from-indigo-400 to-brand-600' },
      ];

  const roleHeadline = {
    associate: 'Stay on top of your assigned work and close tasks cleanly.',
    supervisor: 'Keep review queues moving and resolve blockers before they spread.',
    admin: 'Manage staffing, locations, assignments, and operational quality from one place.',
    superadmin: 'Monitor tenant performance, portfolio growth, and plan adoption across the SaaS.',
  }[user?.role ?? 'associate'];

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="relative overflow-hidden rounded-[28px] border border-blue-100 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#60a5fa_100%)] px-6 py-8 text-white shadow-2xl shadow-blue-200/50">
          <div className="absolute inset-y-0 right-0 hidden w-1/3 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.18),_transparent_60%)] lg:block" />
          <div className="relative grid gap-6 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-blue-100">Operations command</p>
              <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight md:text-4xl">
                {user ? `Welcome back, ${user.name}.` : 'Welcome back.'}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-blue-50/90 md:text-base">
                {roleHeadline}
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  Organization: {user?.organizationName}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  Role: {user?.role}
                </div>
                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  Proof coverage: {proofCoverage}%
                </div>
              </div>
            </div>

            <div className="grid gap-3 rounded-3xl border border-white/15 bg-slate-950/20 p-5 backdrop-blur">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-blue-100">Live pulse</div>
                <div className="mt-2 text-4xl font-semibold">{user?.role === 'superadmin' ? superadminSnapshot?.companies ?? 0 : tasks.length}</div>
                <div className="text-sm text-blue-50/85">
                  {user?.role === 'superadmin' ? 'Organizations currently tracked across the platform' : 'Tasks visible in your queue today'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-blue-100">{user?.role === 'superadmin' ? 'Active' : 'Pending'}</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {user?.role === 'superadmin' ? superadminSnapshot?.activeCompanies ?? 0 : counts.assigned + counts.completed}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 p-3">
                  <div className="text-blue-100">{user?.role === 'superadmin' ? 'Inactive' : 'Resolved'}</div>
                  <div className="mt-1 text-2xl font-semibold">
                    {user?.role === 'superadmin' ? superadminSnapshot?.inactiveCompanies ?? 0 : counts.approved + counts.rejected}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <article key={card.label} className="card overflow-hidden p-0">
              <div className={`h-1.5 bg-gradient-to-r ${card.accent}`} />
              <div className="p-5">
                <div className="text-sm text-slate-500">{card.label}</div>
                <div className="mt-3 text-3xl font-semibold text-slate-900">{card.value}</div>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <article className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Recent task activity</h2>
                <p className="mt-1 text-sm text-slate-500">A live readout of the latest work moving through your operation.</p>
              </div>
              {loading && <span className="text-sm text-slate-400">Refreshing...</span>}
            </div>
            <div className="mt-6 grid gap-3">
              {recentTasks.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  No task activity yet. Start by creating duties and assigning work from the admin area.
                </div>
              )}
              {recentTasks.map((task) => {
                const duty = typeof task.dutyId === 'string' ? null : task.dutyId;
                const associate = typeof task.associateId === 'string' ? null : task.associateId;
                return (
                  <div key={task._id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium text-slate-900">{duty?.name ?? `Task ${task._id}`}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {associate?.name ? `${associate.name} • ${associate.email}` : 'Unassigned'} • {formatRelativeTime(task.updatedAt ?? task.completedAt ?? task.createdAt)}
                      </div>
                      {duty?.description && <p className="mt-2 text-sm text-slate-600">{duty.description}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {task.proofPhoto && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Photo attached</span>}
                      <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusTone[task.status]}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <div className="grid gap-6">
            <article className="card p-6">
              <h2 className="text-xl font-semibold">Status distribution</h2>
              <div className="mt-5 grid gap-4">
                {Object.entries(counts).map(([label, value]) => {
                  const width = tasks.length ? Math.max((value / tasks.length) * 100, value > 0 ? 6 : 0) : 0;
                  return (
                    <div key={label} className="grid gap-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="capitalize text-slate-600">{label}</span>
                        <span className="font-medium text-slate-900">{value}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className={`h-2 rounded-full ${label === 'approved' ? 'bg-emerald-500' : label === 'rejected' ? 'bg-rose-500' : label === 'completed' ? 'bg-sky-500' : 'bg-amber-500'}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            {supervisorSnapshot && (
              <article className="card p-6">
                <h2 className="text-xl font-semibold">Supervisor signal</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-slate-500">Awaiting review</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">{supervisorSnapshot.completed}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-slate-500">Rejected</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">{supervisorSnapshot.rejected}</div>
                  </div>
                </div>
              </article>
            )}

            {adminSnapshot && (
              <article className="card p-6">
                <h2 className="text-xl font-semibold">Admin operations</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-slate-500">Staff members</div>
                    <div className="mt-1 text-2xl font-semibold">{adminSnapshot.users}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-slate-500">Locations</div>
                    <div className="mt-1 text-2xl font-semibold">{adminSnapshot.locations}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-slate-500">Duty templates</div>
                    <div className="mt-1 text-2xl font-semibold">{adminSnapshot.duties}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-slate-500">Approved tasks</div>
                    <div className="mt-1 text-2xl font-semibold">{adminSnapshot.reports.approved}</div>
                  </div>
                </div>
              </article>
            )}

            {superadminSnapshot && (
              <article className="card p-6">
                <h2 className="text-xl font-semibold">Portfolio scale</h2>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Companies</span>
                    <span className="text-lg font-semibold">{superadminSnapshot.companies}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Platform users</span>
                    <span className="text-lg font-semibold">{superadminSnapshot.users}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                    <span className="text-slate-500">Active subscriptions</span>
                    <span className="text-lg font-semibold">{superadminSnapshot.activeSubscriptions}</span>
                  </div>
                </div>
              </article>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
