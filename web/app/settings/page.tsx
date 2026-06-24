'use client';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../../components/AppShell';
import { apiFetch } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

interface SettingsResponse {
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantKey: string;
    organizationName: string;
    organizationSlug: string;
    isActive?: boolean;
  };
  workspace: {
    tenantKey: string;
    organizationSlug: string;
    organizationName: string;
    contactEmail: string;
    plan: string;
    squareCustomerId: string | null;
    isActive: boolean;
  } | null;
}

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [workspace, setWorkspace] = useState({
    organizationName: '',
    organizationSlug: '',
    contactEmail: '',
    plan: '',
    isActive: true,
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });

  const isWorkspaceAdmin = user?.role === 'admin';

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<SettingsResponse>('/settings');
      setProfile({ name: response.profile.name, email: response.profile.email });
      if (response.workspace) {
        setWorkspace({
          organizationName: response.workspace.organizationName,
          organizationSlug: response.workspace.organizationSlug,
          contactEmail: response.workspace.contactEmail,
          plan: response.workspace.plan,
          isActive: response.workspace.isActive,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveProfile = async () => {
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch<{ user: SettingsResponse['profile'] }>('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify(profile),
      });
      if (user) {
        setUser({
          ...user,
          name: response.user.name,
          email: response.user.email,
        });
      }
      setMessage('Profile updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile');
    }
  };

  const saveWorkspace = async () => {
    setMessage(null);
    setError(null);
    try {
      const response = await apiFetch<{ workspace: SettingsResponse['workspace'] }>('/settings/workspace', {
        method: 'PATCH',
        body: JSON.stringify({
          organizationName: workspace.organizationName,
          contactEmail: workspace.contactEmail,
        }),
      });
      const nextWorkspace = response.workspace;
      if (nextWorkspace) {
        setWorkspace((current) => ({
          ...current,
          organizationName: nextWorkspace.organizationName,
          organizationSlug: nextWorkspace.organizationSlug,
          contactEmail: nextWorkspace.contactEmail,
          plan: nextWorkspace.plan,
          isActive: nextWorkspace.isActive,
        }));
      }
      setMessage('Workspace updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save workspace');
    }
  };

  const changePassword = async () => {
    setMessage(null);
    setError(null);
    try {
      await apiFetch('/settings/password', {
        method: 'POST',
        body: JSON.stringify(passwordForm),
      });
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setMessage('Password changed.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password');
    }
  };

  return (
    <AppShell>
      <div className="grid gap-6">
        <section className="card p-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage your profile, workspace details, and account security.
          </p>
          {loading && <p className="mt-4 text-sm text-slate-500">Loading settings...</p>}
          {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Profile</h2>
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-lg border px-3 py-2"
                value={profile.name}
                onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                placeholder="Full name"
              />
              <input
                className="rounded-lg border px-3 py-2"
                value={profile.email}
                onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email"
              />
              <button className="btn-primary" onClick={saveProfile} disabled={loading}>
                Save profile
              </button>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold">Security</h2>
            <div className="mt-4 grid gap-3">
              <input
                type="password"
                className="rounded-lg border px-3 py-2"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                placeholder="Current password"
              />
              <input
                type="password"
                className="rounded-lg border px-3 py-2"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                placeholder="New password"
              />
              <button className="btn-primary" onClick={changePassword} disabled={loading}>
                Change password
              </button>
            </div>
          </div>
        </section>

        {user?.role === 'superadmin' && !workspace.organizationName ? (
          <section className="card p-6">
            <h2 className="text-lg font-semibold">Platform account</h2>
            <p className="mt-2 text-sm text-slate-600">
              Platform superadmins are not bound to a single organization. Manage tenant workspaces from the Portfolio area.
            </p>
          </section>
        ) : (
          <section className="card p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Workspace</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Organization: {user?.organizationName} | Plan: {workspace.plan || 'N/A'}
                </p>
              </div>
              {!isWorkspaceAdmin && (
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  Admin access required for workspace changes
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <input
                className="rounded-lg border px-3 py-2"
                value={workspace.organizationName}
                onChange={(event) => setWorkspace((current) => ({ ...current, organizationName: event.target.value }))}
                placeholder="Organization name"
                disabled={!isWorkspaceAdmin}
              />
              <input
                className="rounded-lg border px-3 py-2"
                value={workspace.contactEmail}
                onChange={(event) => setWorkspace((current) => ({ ...current, contactEmail: event.target.value }))}
                placeholder="Billing contact email"
                disabled={!isWorkspaceAdmin}
              />
            </div>
            <div className="mt-3 text-sm text-slate-500">
              Organization slug: {workspace.organizationSlug || 'Created automatically'}
              {workspace.isActive ? ' | Active workspace' : ' | Workspace inactive'}
            </div>
            <button className="btn-primary mt-4 disabled:cursor-not-allowed disabled:opacity-50" onClick={saveWorkspace} disabled={!isWorkspaceAdmin || loading}>
              Save workspace
            </button>
          </section>
        )}
      </div>
    </AppShell>
  );
}
