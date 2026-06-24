import Link from 'next/link';

export const LandingNavbar = () => (
  <nav className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
    <div className="font-semibold text-lg">TaskTracer</div>
    <div className="flex gap-4 text-sm">
      <Link href="/login" className="text-slate-600 hover:text-slate-900">
        Login
      </Link>
      <Link href="/register" className="btn-primary">
        Get started
      </Link>
    </div>
  </nav>
);
