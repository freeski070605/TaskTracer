'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { QrLabelCard } from '../../components/QrLabelCard';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface Duty {
  _id: string;
  name: string;
  description?: string;
  requiresPhoto?: boolean;
  requiresQr?: boolean;
  locationId?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

interface Location {
  _id: string;
  name: string;
  qrCode: string;
}

interface Schedule {
  _id: string;
  startsAt: string;
  endsAt: string;
  dutyId: Duty | string;
  associateId: User | string;
}

export default function AdminPage() {
  const { user: currentUser } = useAuthStore();
  const [duties, setDuties] = useState<Duty[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [reports, setReports] = useState({ totalTasks: 0, completed: 0, approved: 0, rejected: 0 });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [dutyName, setDutyName] = useState('');
  const [dutyDescription, setDutyDescription] = useState('');
  const [dutyPhoto, setDutyPhoto] = useState(false);
  const [dutyQr, setDutyQr] = useState(false);
  const [dutyLocation, setDutyLocation] = useState('');

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('associate');

  const [locationName, setLocationName] = useState('');
  const [locationQr, setLocationQr] = useState('');

  const [scheduleDutyId, setScheduleDutyId] = useState('');
  const [scheduleAssociateId, setScheduleAssociateId] = useState('');
  const [scheduleStart, setScheduleStart] = useState('');
  const [scheduleEnd, setScheduleEnd] = useState('');

  const loadData = useCallback(async () => {
    setError(null);
    const [dutyRes, userRes, locationRes, reportRes, scheduleRes] = await Promise.all([
      apiFetch<{ duties: Duty[] }>('/admin/duties'),
      apiFetch<{ users: User[] }>('/admin/users'),
      apiFetch<{ locations: Location[] }>('/admin/locations'),
      apiFetch<{ totalTasks: number; completed: number; approved: number; rejected: number }>('/admin/reports'),
      apiFetch<{ schedules: Schedule[] }>('/admin/schedule'),
    ]);
    setDuties(dutyRes.duties);
    setUsers(userRes.users);
    setLocations(locationRes.locations);
    setReports(reportRes);
    setSchedules(scheduleRes.schedules);
  }, []);

  useEffect(() => {
    loadData().catch((err) => {
      setError(err instanceof Error ? err.message : 'Unable to load admin workspace');
    });
  }, [loadData]);

  const activeUsers = users.filter((user) => user.isActive).length;
  const associates = users.filter((user) => user.role === 'associate');
  const approvalRate = reports.completed + reports.approved + reports.rejected
    ? Math.round((reports.approved / Math.max(reports.completed + reports.approved + reports.rejected, 1)) * 100)
    : 0;

  const upcomingSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).slice(0, 8);
  }, [schedules]);

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setError(null);
    setMessage(null);
    try {
      await action();
      setMessage(successMessage);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    }
  };

  const createDuty = async () => {
    if (!dutyName.trim()) return;
    await runAction(async () => {
      await apiFetch('/admin/duties', {
        method: 'POST',
        body: JSON.stringify({
          name: dutyName,
          description: dutyDescription || undefined,
          locationId: dutyLocation || undefined,
          requiresPhoto: dutyPhoto,
          requiresQr: dutyQr,
        }),
      });
      setDutyName('');
      setDutyDescription('');
      setDutyLocation('');
      setDutyPhoto(false);
      setDutyQr(false);
    }, 'Duty template created.');
  };

  const createUser = async () => {
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim()) return;
    await runAction(async () => {
      await apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify({ name: userName, email: userEmail, password: userPassword, role: userRole }),
      });
      setUserName('');
      setUserEmail('');
      setUserPassword('');
      setUserRole('associate');
    }, 'Team member added.');
  };

  const updateUser = async (user: User, changes: { isActive?: boolean; role?: string }) => {
    await runAction(async () => {
      await apiFetch(`/admin/users/${user._id}`, {
        method: 'PATCH',
        body: JSON.stringify(changes),
      });
    }, 'Team member updated.');
  };

  const createLocation = async () => {
    if (!locationName.trim()) return;
    await runAction(async () => {
      await apiFetch('/admin/locations', {
        method: 'POST',
        body: JSON.stringify({ name: locationName, qrCode: locationQr || undefined }),
      });
      setLocationName('');
      setLocationQr('');
    }, 'Location added.');
  };

  const createSchedule = async () => {
    if (!scheduleDutyId || !scheduleAssociateId || !scheduleStart || !scheduleEnd) return;
    await runAction(async () => {
      await apiFetch('/admin/schedule', {
        method: 'POST',
        body: JSON.stringify({
          dutyId: scheduleDutyId,
          associateId: scheduleAssociateId,
          startsAt: new Date(scheduleStart).toISOString(),
          endsAt: new Date(scheduleEnd).toISOString(),
        }),
      });
      setScheduleDutyId('');
      setScheduleAssociateId('');
      setScheduleStart('');
      setScheduleEnd('');
    }, 'Schedule assigned.');
  };

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="rounded-[28px] border border-blue-100 bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_40%,#dbeafe_150%)] px-6 py-8 text-white shadow-xl shadow-blue-200/50">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-blue-100">Admin operations</p>
              <h1 className="mt-3 text-3xl font-semibold">Workspace control center</h1>
              <p className="mt-3 max-w-2xl text-sm text-blue-50/90">
                Create duty templates, onboard staff, manage locations, and plan upcoming work from one organized command surface.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-blue-100">Active staff</div>
                <div className="mt-2 text-3xl font-semibold">{activeUsers}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-blue-100">Approval rate</div>
                <div className="mt-2 text-3xl font-semibold">{approvalRate}%</div>
              </div>
            </div>
          </div>
        </section>

        {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>}

        <section className="grid gap-4 md:grid-cols-4">
          <article className="card p-5">
            <div className="text-sm text-slate-500">Total tasks</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{reports.totalTasks}</div>
          </article>
          <article className="card p-5">
            <div className="text-sm text-slate-500">Duty templates</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{duties.length}</div>
          </article>
          <article className="card p-5">
            <div className="text-sm text-slate-500">Locations</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{locations.length}</div>
          </article>
          <article className="card p-5">
            <div className="text-sm text-slate-500">Associates</div>
            <div className="mt-2 text-3xl font-semibold text-slate-900">{associates.length}</div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-6">
            <article className="card p-6">
              <h2 className="text-xl font-semibold">Create duty template</h2>
              <div className="mt-4 grid gap-3">
                <input
                  className="rounded-2xl border px-4 py-3"
                  placeholder="Duty name"
                  value={dutyName}
                  onChange={(event) => setDutyName(event.target.value)}
                />
                <textarea
                  className="min-h-[100px] rounded-2xl border px-4 py-3"
                  placeholder="Describe the standard, safety expectations, or cleaning scope"
                  value={dutyDescription}
                  onChange={(event) => setDutyDescription(event.target.value)}
                />
                <select
                  className="rounded-2xl border px-4 py-3"
                  value={dutyLocation}
                  onChange={(event) => setDutyLocation(event.target.value)}
                >
                  <option value="">No location</option>
                  {locations.map((location) => (
                    <option key={location._id} value={location._id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                    <input type="checkbox" checked={dutyPhoto} onChange={(event) => setDutyPhoto(event.target.checked)} /> Requires photo proof
                  </label>
                  <label className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600">
                    <input type="checkbox" checked={dutyQr} onChange={(event) => setDutyQr(event.target.checked)} /> Requires QR verification
                  </label>
                </div>
                <button className="btn-primary" onClick={createDuty}>Create duty</button>
              </div>
            </article>

            <article className="card p-6">
              <h2 className="text-xl font-semibold">Assign work</h2>
              <div className="mt-4 grid gap-3">
                <select className="rounded-2xl border px-4 py-3" value={scheduleDutyId} onChange={(event) => setScheduleDutyId(event.target.value)}>
                  <option value="">Select duty</option>
                  {duties.map((duty) => (
                    <option key={duty._id} value={duty._id}>
                      {duty.name}
                    </option>
                  ))}
                </select>
                <select className="rounded-2xl border px-4 py-3" value={scheduleAssociateId} onChange={(event) => setScheduleAssociateId(event.target.value)}>
                  <option value="">Select associate</option>
                  {associates.map((associate) => (
                    <option key={associate._id} value={associate._id}>
                      {associate.name} ({associate.email})
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 md:grid-cols-2">
                  <input type="datetime-local" className="rounded-2xl border px-4 py-3" value={scheduleStart} onChange={(event) => setScheduleStart(event.target.value)} />
                  <input type="datetime-local" className="rounded-2xl border px-4 py-3" value={scheduleEnd} onChange={(event) => setScheduleEnd(event.target.value)} />
                </div>
                <button className="btn-primary" onClick={createSchedule}>Assign schedule</button>
              </div>
            </article>
          </div>

          <div className="grid gap-6">
            <article className="card p-6">
              <h2 className="text-xl font-semibold">Add team member</h2>
              <div className="mt-4 grid gap-3">
                <input className="rounded-2xl border px-4 py-3" placeholder="Name" value={userName} onChange={(event) => setUserName(event.target.value)} />
                <input className="rounded-2xl border px-4 py-3" placeholder="Email" value={userEmail} onChange={(event) => setUserEmail(event.target.value)} />
                <input className="rounded-2xl border px-4 py-3" placeholder="Password" type="password" value={userPassword} onChange={(event) => setUserPassword(event.target.value)} />
                <select className="rounded-2xl border px-4 py-3" value={userRole} onChange={(event) => setUserRole(event.target.value)}>
                  <option value="associate">Associate</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Admin</option>
                  {currentUser?.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                </select>
                <button className="btn-primary" onClick={createUser}>Add user</button>
              </div>
            </article>

            <article className="card p-6">
              <h2 className="text-xl font-semibold">Add location</h2>
              <div className="mt-4 grid gap-3">
                <input className="rounded-2xl border px-4 py-3" placeholder="Location name" value={locationName} onChange={(event) => setLocationName(event.target.value)} />
                <input className="rounded-2xl border px-4 py-3" placeholder="QR code (optional)" value={locationQr} onChange={(event) => setLocationQr(event.target.value)} />
                {!locationQr && (
                  <p className="text-sm text-slate-500">
                    Leave the QR field blank and TaskTracer will generate a unique code automatically when you save the location.
                  </p>
                )}
                {locationQr && (
                  <QrLabelCard
                    title={locationName || 'New location'}
                    code={locationQr}
                    subtitle="Preview of the QR label that will be saved for this location."
                    compact
                  />
                )}
                <button className="btn-primary" onClick={createLocation}>Add location</button>
              </div>
            </article>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <article className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Team management</h2>
              <span className="text-sm text-slate-500">{users.length} users</span>
            </div>
            <div className="mt-5 grid gap-4">
              {users.map((user) => (
                <div key={user._id} className="rounded-3xl border border-slate-100 bg-white/90 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-slate-900">{user.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{user.email}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <select
                        className="rounded-2xl border px-4 py-2 text-sm"
                        value={user.role}
                        onChange={(event) => updateUser(user, { role: event.target.value })}
                      >
                        <option value="associate">Associate</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="admin">Admin</option>
                        {currentUser?.role === 'superadmin' && <option value="superadmin">Superadmin</option>}
                      </select>
                      <button className="btn-ghost" onClick={() => updateUser(user, { isActive: !user.isActive })}>
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <div className="grid gap-6">
            <article className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Upcoming schedules</h2>
                <span className="text-sm text-slate-500">{schedules.length} total</span>
              </div>
              <div className="mt-5 grid gap-3">
                {upcomingSchedules.length === 0 && <p className="text-sm text-slate-500">No schedules created yet.</p>}
                {upcomingSchedules.map((schedule) => {
                  const duty = typeof schedule.dutyId === 'string' ? null : schedule.dutyId;
                  const associate = typeof schedule.associateId === 'string' ? null : schedule.associateId;
                  return (
                    <div key={schedule._id} className="rounded-2xl bg-slate-50 p-4">
                      <div className="font-medium text-slate-900">{duty?.name ?? 'Duty'}</div>
                      <div className="mt-1 text-sm text-slate-500">{associate?.name ?? 'Associate'} - {new Date(schedule.startsAt).toLocaleString()}</div>
                      {duty?.description && <p className="mt-2 text-sm text-slate-600">{duty.description}</p>}
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="card p-6">
              <h2 className="text-xl font-semibold">Locations</h2>
              <div className="mt-4 grid gap-4">
                {locations.map((location) => (
                  <QrLabelCard
                    key={location._id}
                    title={location.name}
                    code={location.qrCode}
                    subtitle="Download or print this label and place it at the work location."
                  />
                ))}
              </div>
            </article>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
