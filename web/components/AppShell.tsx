'use client';
import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, type User } from '../store/authStore';

type Role = User['role'];

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', roles: ['associate', 'supervisor', 'admin', 'superadmin'] as Role[] },
  { href: '/tasks', label: 'Task manager', roles: ['associate', 'supervisor', 'admin'] as Role[] },
  { href: '/supervisor', label: 'Supervisor', roles: ['supervisor', 'admin'] as Role[] },
  { href: '/admin', label: 'Admin', roles: ['admin'] as Role[] },
  { href: '/billing', label: 'Billing', roles: ['admin'] as Role[] },
  { href: '/settings', label: 'Settings', roles: ['associate', 'supervisor', 'admin', 'superadmin'] as Role[] },
  { href: '/superadmin', label: 'Portfolio', roles: ['superadmin'] as Role[] },
];

const canAccessPath = (user: User, pathname: string) => {
  const item = NAV_ITEMS.find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));
  if (!item) return true;
  return item.roles.includes(user.role);
};

export const AppShell = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, hydrated, hydrate, logout } = useAuthStore();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/login');
      return;
    }

    if (hydrated && user && !canAccessPath(user, pathname)) {
      router.replace('/dashboard');
    }
  }, [hydrated, pathname, router, user]);

  if (!hydrated) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50" />;
  }

  if (!user || !canAccessPath(user, pathname)) {
    return null;
  }

  const visibleLinks = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <header className="border-b border-blue-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="font-semibold">TaskTracer</div>
            <div className="text-sm text-slate-500">
              {user.name} - {user.role} - {user.organizationName}
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {visibleLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={active ? 'text-brand-700 font-medium' : 'text-slate-600 hover:text-brand-700'}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              className="btn-ghost"
              onClick={() => {
                logout();
                router.replace('/login');
              }}
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
};
