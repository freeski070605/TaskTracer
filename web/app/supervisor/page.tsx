'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiFetch } from '../../lib/api';
import { Task, TaskStatus } from '../../store/taskStore';

const REVIEW_FILTERS: Array<{ key: Extract<TaskStatus, 'completed' | 'approved' | 'rejected'>; label: string }> = [
  { key: 'completed', label: 'Awaiting review' },
  { key: 'approved', label: 'Approved history' },
  { key: 'rejected', label: 'Rejected history' },
];

const statusTone: Record<string, string> = {
  completed: 'bg-sky-50 text-sky-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};

const ageLabel = (value?: string | null) => {
  if (!value) return 'No completion time';
  const minutes = Math.max(Math.round((Date.now() - new Date(value).getTime()) / (1000 * 60)), 0);
  if (minutes < 60) return `${minutes}m in queue`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h in queue`;
  return `${Math.round(minutes / 1440)}d in queue`;
};

export default function SupervisorPage() {
  const [metrics, setMetrics] = useState({ assigned: 0, completed: 0, approved: 0, rejected: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [activeFilter, setActiveFilter] = useState<Extract<TaskStatus, 'completed' | 'approved' | 'rejected'>>('completed');
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const data = await apiFetch<{ metrics: { assigned: number; completed: number; approved: number; rejected: number } }>(
      '/supervisor/dashboard',
    );
    setMetrics(data.metrics);
  }, []);

  const loadReviewQueue = useCallback(async (status: Extract<TaskStatus, 'completed' | 'approved' | 'rejected'>) => {
    const data = await apiFetch<{ tasks: Task[] }>(`/supervisor/review?status=${status}`);
    setTasks(data.tasks);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadReviewQueue(activeFilter);
  }, [activeFilter, loadReviewQueue]);

  const approve = async (taskId: string) => {
    setBusy((prev) => ({ ...prev, [taskId]: true }));
    setError(null);
    try {
      await apiFetch('/supervisor/approve', {
        method: 'POST',
        body: JSON.stringify({ taskId }),
      });
      await Promise.all([loadDashboard(), loadReviewQueue(activeFilter)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to approve task');
    } finally {
      setBusy((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const reject = async (taskId: string) => {
    const reason = reasons[taskId]?.trim();
    if (!reason) return;

    setBusy((prev) => ({ ...prev, [taskId]: true }));
    setError(null);
    try {
      await apiFetch('/supervisor/reject', {
        method: 'POST',
        body: JSON.stringify({ taskId, reason }),
      });
      setReasons((prev) => ({ ...prev, [taskId]: '' }));
      await Promise.all([loadDashboard(), loadReviewQueue(activeFilter)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reject task');
    } finally {
      setBusy((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const oldestTask = useMemo(() => {
    return [...tasks].sort(
      (a, b) => new Date(a.completedAt ?? a.createdAt ?? 0).getTime() - new Date(b.completedAt ?? b.createdAt ?? 0).getTime(),
    )[0];
  }, [tasks]);

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#082f49_0%,#0f766e_45%,#e0f2fe_160%)] px-6 py-8 text-white shadow-xl shadow-cyan-100/40">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-100">Review control</p>
              <h1 className="mt-3 text-3xl font-semibold">Supervisor board</h1>
              <p className="mt-3 max-w-2xl text-sm text-cyan-50/90">
                Clear the review queue quickly, verify proof, and keep service quality high without losing detail.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Awaiting review</div>
                <div className="mt-2 text-3xl font-semibold">{metrics.completed}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Rejected today</div>
                <div className="mt-2 text-3xl font-semibold">{metrics.rejected}</div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <section className="grid gap-4 md:grid-cols-4">
          {Object.entries(metrics).map(([label, value]) => (
            <article key={label} className="card p-5">
              <div className="text-sm capitalize text-slate-500">{label}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
            </article>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_1.4fr]">
          <article className="card p-6">
            <h2 className="text-xl font-semibold">Queue spotlight</h2>
            {oldestTask ? (
              <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Oldest item</div>
                    <div className="mt-2 text-2xl font-semibold text-slate-900">
                      {typeof oldestTask.dutyId === 'string' ? `Task ${oldestTask._id}` : oldestTask.dutyId.name}
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    {ageLabel(oldestTask.completedAt)}
                  </span>
                </div>
                <div className="mt-4 text-sm text-slate-600">
                  {!oldestTask.associateId || typeof oldestTask.associateId === 'string'
                    ? 'Associate details unavailable'
                    : `${oldestTask.associateId.name} • ${oldestTask.associateId.email}`}
                </div>
                {oldestTask.notes && (
                  <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                    <span className="font-medium text-slate-900">Submitted note:</span> {oldestTask.notes}
                  </div>
                )}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Proof</div>
                    <div className="mt-2 text-lg font-semibold">{oldestTask.proofPhoto ? 'Attached' : 'Missing'}</div>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Decision state</div>
                    <div className="mt-2 text-lg font-semibold">Pending</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No tasks currently need review.</p>
            )}
          </article>

          <article className="card p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Review queue</h2>
                <p className="mt-1 text-sm text-slate-500">Filter the queue by status and act inline.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {REVIEW_FILTERS.map((filter) => (
                  <button
                    key={filter.key}
                    className={`rounded-full px-4 py-2 text-sm transition ${activeFilter === filter.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    onClick={() => setActiveFilter(filter.key)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks in this queue right now.</p>}
              {tasks.map((task) => {
                const duty = typeof task.dutyId === 'string' ? null : task.dutyId;
                const associate = typeof task.associateId === 'string' ? null : task.associateId;
                const isReviewable = activeFilter === 'completed';

                return (
                  <div key={task._id} className="rounded-3xl border border-slate-100 bg-white/90 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-lg font-semibold text-slate-900">{duty?.name ?? `Task ${task._id}`}</div>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone[task.status]}`}>
                            {task.status}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {associate?.name ? `${associate.name} • ${associate.email}` : 'Unassigned'} • {ageLabel(task.completedAt)}
                        </div>
                        {task.completedAt && (
                          <div className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                            Completed {new Date(task.completedAt).toLocaleString()}
                          </div>
                        )}
                        {task.notes && (
                          <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                            {task.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        {task.proofPhoto ? (
                          <a className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white" href={task.proofPhoto} target="_blank" rel="noreferrer">
                            View proof photo
                          </a>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">No photo attached</span>
                        )}
                      </div>
                    </div>

                    {isReviewable && (
                      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                        <input
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                          placeholder="Add a clear rejection reason if this needs rework"
                          value={reasons[task._id] ?? ''}
                          onChange={(event) => setReasons((prev) => ({ ...prev, [task._id]: event.target.value }))}
                        />
                        <button
                          className="btn-ghost disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => reject(task._id)}
                          disabled={busy[task._id] || !(reasons[task._id]?.trim())}
                        >
                          {busy[task._id] ? 'Working...' : 'Reject'}
                        </button>
                        <button
                          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() => approve(task._id)}
                          disabled={busy[task._id]}
                        >
                          {busy[task._id] ? 'Working...' : 'Approve'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </AppShell>
  );
}
