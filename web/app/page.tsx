import Link from 'next/link';
import { LandingNavbar } from '../components/LandingNavbar';
import { StatCard } from '../components/StatCard';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <LandingNavbar />
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-brand-700 uppercase tracking-widest text-xs">EVS Operations</p>
            <h1 className="text-4xl md:text-5xl font-semibold mt-4">
              Real-time task verification for clean, compliant facilities.
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              TaskTracer keeps EVS associates on track, supervisors in control, and leadership informed.
            </p>
            <div className="mt-6 flex gap-3">
              <Link className="btn-primary" href="/register">Start free trial</Link>
              <Link className="btn-ghost" href="/login">Sign in</Link>
            </div>
          </div>
          <div className="card p-6">
            <div className="grid gap-4">
              <StatCard label="Completion rate" value="98%" />
              <StatCard label="Average audit time" value="-40%" />
              <StatCard label="Mobile check-ins" value="3,200/day" />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 grid md:grid-cols-3 gap-6">
        {[
          {
            title: 'Offline-first mobile',
            body: 'Associates keep working without signal. Syncs automatically once online.',
          },
          {
            title: 'Live supervisor board',
            body: 'Approve or reject tasks instantly with photo evidence and audit trail.',
          },
          {
            title: 'Multi-tenant SaaS',
            body: 'Secure tenant isolation with role-based access for every team.',
          },
        ].map((item) => (
          <div key={item.title} className="card p-6">
            <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
            <p className="text-slate-600">{item.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
