'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

export default function LoginPage() {
  const { login, loading, error, user, hydrate } = useAuthStore();
  const router = useRouter();
  const [organization, setOrganization] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [router, user]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form
        className="card p-8 w-full max-w-md"
        onSubmit={async (e) => {
          e.preventDefault();
          await login(organization, email, password);
          router.push('/dashboard');
        }}
      >
        <h1 className="text-2xl font-semibold">Welcome back</h1>
        <p className="text-slate-600 text-sm mt-1">Sign in with your organization and account</p>
        <div className="mt-6 grid gap-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Organization name or slug"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button className="btn-primary mt-6 w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
        <p className="mt-3 text-xs text-slate-500">
          Leave organization blank only for platform superadmin accounts.
        </p>
        <p className="text-sm text-slate-600 mt-4">
          Need an account? <Link href="/register" className="text-brand-600">Register</Link>
        </p>
      </form>
    </main>
  );
}
