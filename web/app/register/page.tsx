'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/authStore';

export default function RegisterPage() {
  const { register, loading, error, user, hydrate } = useAuthStore();
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState('');
  const [name, setName] = useState('');
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
          await register(organizationName, name, email, password);
          router.push('/login');
        }}
      >
        <h1 className="text-2xl font-semibold">Create your workspace</h1>
        <p className="text-slate-600 text-sm mt-1">Start tracking EVS tasks with an admin account for your organization</p>
        <div className="mt-6 grid gap-3">
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Organization name"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
          />
          <input
            className="border rounded-lg px-3 py-2"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
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
          {loading ? 'Creating...' : 'Create account'}
        </button>
        <p className="text-sm text-slate-600 mt-4">
          Already have an account? <Link href="/login" className="text-brand-600">Sign in</Link>
        </p>
      </form>
    </main>
  );
}
