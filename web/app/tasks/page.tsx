'use client';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { QrScannerModal } from '../../components/QrScannerModal';
import { useTaskStore, type Task, type TaskStatus } from '../../store/taskStore';
import { useAuthStore } from '../../store/authStore';
import { apiFetch } from '../../lib/api';

interface UploadResponse {
  uploadUrl: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
  tags: string[];
}

const STATUS_FILTERS: Array<{ key: 'all' | TaskStatus; label: string }> = [
  { key: 'all', label: 'All tasks' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'completed', label: 'Awaiting review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Needs rework' },
];

const statusTone: Record<TaskStatus, string> = {
  assigned: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-sky-50 text-sky-700 border-sky-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function TasksPage() {
  const { tasks, loadTasks, completeTask, connectSocket } = useTaskStore();
  const { user, hydrate } = useAuthStore();
  const [proofFiles, setProofFiles] = useState<Record<string, File | null>>({});
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [search, setSearch] = useState('');
  const [scannerTaskId, setScannerTaskId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  useEffect(() => {
    hydrate();
    loadTasks();
  }, [hydrate, loadTasks]);

  useEffect(() => {
    if (user) connectSocket(user.tenantKey);
  }, [user, connectSocket]);

  const uploadProof = async (taskId: string, file: File) => {
    const data = await apiFetch<UploadResponse>('/tasks/upload-proof', {
      method: 'POST',
      body: JSON.stringify({ taskId, fileName: file.name, contentType: file.type }),
    });

    const formData = new FormData();
    formData.set('file', file);
    formData.set('api_key', data.apiKey);
    formData.set('timestamp', String(data.timestamp));
    formData.set('signature', data.signature);
    formData.set('public_id', data.publicId);
    formData.set('tags', data.tags.join(','));

    const response = await fetch(data.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Cloudinary upload failed');
    }

    const payload = (await response.json()) as { secure_url?: string };
    if (!payload.secure_url) {
      throw new Error('Cloudinary upload response did not include secure_url');
    }

    return payload.secure_url;
  };

  const handleComplete = async (task: Task) => {
    const duty = typeof task.dutyId === 'string' ? null : task.dutyId;
    const proofRequired = duty?.requiresPhoto;
    const qrRequired = duty?.requiresQr;

    const proofFile = proofFiles[task._id];
    const qrCode = qrCodes[task._id]?.trim();
    const note = notes[task._id]?.trim();

    if (proofRequired && !proofFile && !task.proofPhoto) {
      setErrors((prev) => ({ ...prev, [task._id]: 'Photo proof is required before you can complete this task.' }));
      return;
    }

    if (qrRequired && !qrCode) {
      setErrors((prev) => ({ ...prev, [task._id]: 'A matching QR scan or code entry is required.' }));
      return;
    }

    setErrors((prev) => ({ ...prev, [task._id]: '' }));
    setBusy((prev) => ({ ...prev, [task._id]: true }));

    try {
      let proofPhoto: string | undefined;
      if (proofFile) {
        proofPhoto = await uploadProof(task._id, proofFile);
      }

      await completeTask({
        taskId: task._id,
        notes: note || undefined,
        proofPhoto,
        qrCode: qrCode || undefined,
      });

      setProofFiles((prev) => ({ ...prev, [task._id]: null }));
      setQrCodes((prev) => ({ ...prev, [task._id]: '' }));
      setNotes((prev) => ({ ...prev, [task._id]: '' }));
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [task._id]: error instanceof Error ? error.message : 'Unable to complete this task.',
      }));
    } finally {
      setBusy((prev) => ({ ...prev, [task._id]: false }));
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;

      const duty = typeof task.dutyId === 'string' ? null : task.dutyId;
      const associate = typeof task.associateId === 'string' ? null : task.associateId;
      const haystack = [
        duty?.name,
        duty?.description,
        associate?.name,
        associate?.email,
        task.notes,
        task.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (deferredSearch && !haystack.includes(deferredSearch)) return false;
      return true;
    });
  }, [deferredSearch, statusFilter, tasks]);

  const summary = useMemo(() => ({
    assigned: tasks.filter((task) => task.status === 'assigned').length,
    completed: tasks.filter((task) => task.status === 'completed').length,
    approved: tasks.filter((task) => task.status === 'approved').length,
    rejected: tasks.filter((task) => task.status === 'rejected').length,
  }), [tasks]);

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#dbeafe_100%)] p-6 shadow-xl shadow-blue-100/50">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-brand-700">Execution workspace</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Task manager</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Track assigned work, capture proof, add completion notes, and quickly recover rejected tasks without losing context.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Ready now</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900">{summary.assigned}</div>
              </div>
              <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Needs attention</div>
                <div className="mt-2 text-3xl font-semibold text-rose-600">{summary.rejected}</div>
              </div>
            </div>
          </div>
        </section>

        <section className="card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  className={`rounded-full px-4 py-2 text-sm transition ${statusFilter === filter.key ? 'bg-brand-600 text-white shadow-lg shadow-brand-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  onClick={() => setStatusFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-300 lg:max-w-sm"
              placeholder="Search by duty, teammate, notes, or status"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {Object.entries(summary).map(([label, value]) => (
            <article key={label} className="card p-5">
              <div className="text-sm capitalize text-slate-500">{label}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
            </article>
          ))}
        </section>

        <section className="grid gap-4">
          {filteredTasks.length === 0 && (
            <div className="card p-8 text-center text-sm text-slate-500">
              No tasks match this view. Try a different status filter or search term.
            </div>
          )}

          {filteredTasks.map((task) => {
            const duty = typeof task.dutyId === 'string' ? null : task.dutyId;
            const associate = typeof task.associateId === 'string' ? null : task.associateId;
            const proofRequired = duty?.requiresPhoto;
            const qrRequired = duty?.requiresQr;
            const canSubmit = task.status === 'assigned' || task.status === 'rejected';

            return (
              <article key={task._id} className="card overflow-hidden p-0">
                <div className="flex flex-col gap-4 border-b border-slate-100 bg-white/80 px-5 py-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-900">{duty?.name ?? `Task ${task._id}`}</h2>
                      <span className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${statusTone[task.status]}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm text-slate-500">
                      {associate?.name ? `${associate.name} - ${associate.email}` : 'Assigned to your queue'}
                    </div>
                    {duty?.description && <p className="mt-3 text-sm leading-6 text-slate-600">{duty.description}</p>}
                    {task.notes && (
                      <div className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span className="font-medium text-slate-900">Latest note:</span> {task.notes}
                      </div>
                    )}
                    {task.status === 'rejected' && (
                      <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        Supervisor sent this back for rework. Review the note, upload new proof if needed, and resubmit.
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <span className={`rounded-full px-3 py-1 text-xs ${proofRequired ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                      {proofRequired ? 'Photo required' : 'Photo optional'}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs ${qrRequired ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-600'}`}>
                      {qrRequired ? 'QR required' : 'QR optional'}
                    </span>
                    {task.proofPhoto && (
                      <a className="rounded-full bg-slate-900 px-3 py-1 text-xs text-white" href={task.proofPhoto} target="_blank" rel="noreferrer">
                        Open proof
                      </a>
                    )}
                  </div>
                </div>

                {canSubmit ? (
                  <div className="grid gap-4 px-5 py-5 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-start">
                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                        Photo proof
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm"
                        onChange={(event) => {
                          const file = event.target.files?.[0] ?? null;
                          setProofFiles((prev) => ({ ...prev, [task._id]: file }));
                        }}
                      />
                      {proofFiles[task._id] && (
                        <p className="mt-2 text-xs text-slate-500">Selected: {proofFiles[task._id]?.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                        QR code
                      </label>
                      <div className="flex gap-2">
                        <input
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                          placeholder="Scan or enter QR code"
                          value={qrCodes[task._id] ?? ''}
                          onChange={(event) => setQrCodes((prev) => ({ ...prev, [task._id]: event.target.value }))}
                        />
                        <button type="button" className="btn-ghost whitespace-nowrap" onClick={() => setScannerTaskId(task._id)}>
                          Scan QR
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Use your camera to scan the printed label, or enter the code manually.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-slate-500">
                        Completion note
                      </label>
                      <textarea
                        className="min-h-[108px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-300"
                        placeholder="Add context for supervisors: what was done, issues found, supplies needed..."
                        value={notes[task._id] ?? ''}
                        onChange={(event) => setNotes((prev) => ({ ...prev, [task._id]: event.target.value }))}
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <button
                        className="btn-primary min-w-[160px] disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleComplete(task)}
                        disabled={busy[task._id]}
                      >
                        {busy[task._id] ? 'Submitting...' : task.status === 'rejected' ? 'Resubmit task' : 'Complete task'}
                      </button>
                      <div className="text-xs text-slate-500">
                        Completed tasks move directly into the supervisor review queue.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-4 text-sm text-slate-500">
                    {task.status === 'completed'
                      ? 'This task is waiting for supervisor review.'
                      : task.status === 'approved'
                        ? 'This task has been approved.'
                        : 'This task is archived in your recent history.'}
                  </div>
                )}

                {errors[task._id] && (
                  <p className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">{errors[task._id]}</p>
                )}
              </article>
            );
          })}
        </section>
        <QrScannerModal
          open={scannerTaskId !== null}
          onClose={() => setScannerTaskId(null)}
          onDetected={(value) => {
            if (!scannerTaskId) return;
            setQrCodes((prev) => ({ ...prev, [scannerTaskId]: value }));
            setErrors((prev) => ({ ...prev, [scannerTaskId]: '' }));
          }}
        />
      </div>
    </AppShell>
  );
}
