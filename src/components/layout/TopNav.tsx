'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  HomeIcon,
  WifiIcon,
  BellIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import { useProfileContext } from '@/contexts/ProfileContext';
import { createClient } from '@/lib/supabase/client';

interface NavLink {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
  matchPaths: string[];
}

const NAV_LINKS: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    Icon: HomeIcon,
    matchPaths: ['/dashboard'],
  },
  {
    href: '/devices',
    label: 'Devices',
    Icon: WifiIcon,
    matchPaths: ['/devices'],
  },
  {
    href: '/alerts',
    label: 'Alerts',
    Icon: BellIcon,
    matchPaths: ['/alerts'],
  },
  {
    href: '/settings',
    label: 'Settings',
    Icon: Cog6ToothIcon,
    matchPaths: ['/settings'],
  },
];

function isLinkActive(pathname: string, link: NavLink): boolean {
  if (link.href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return link.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { fullName, isAdmin } = useProfileContext();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <header
      className="sticky top-0 z-40 hidden md:flex h-16 w-full bg-white border-b border-slate-200 shadow-sm"
      aria-label="Site header"
    >
      <div className="mx-auto flex w-full max-w-7xl items-center gap-8 px-6">
        {/* Wordmark */}
        <Link
          href="/dashboard"
          className="shrink-0 text-lg font-bold tracking-tight text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy focus-visible:rounded"
        >
          PortLink
        </Link>

        {/* Nav links */}
        <nav
          className="flex flex-1 items-center gap-1"
          aria-label="Primary navigation"
        >
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(pathname, link);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={[
                  'relative flex items-center gap-1.5 px-3 py-2 rounded text-sm transition-colors duration-100',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy',
                  active
                    ? 'font-bold text-navy'
                    : 'font-medium text-slate-600 hover:text-navy hover:bg-slate-50',
                ].join(' ')}
              >
                <link.Icon className="h-4 w-4" aria-hidden="true" />
                {link.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-[1px] left-0 right-0 h-[3px] bg-navy rounded-t"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info + sign out */}
        <div className="shrink-0 flex items-center gap-3">
          {isAdmin && (
            <span className="rounded bg-gulf-gold/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-gulf-gold">
              Admin
            </span>
          )}
          <span className="text-sm font-medium text-slate-600">{fullName}</span>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign out"
            aria-label="Sign out"
            className="text-slate-400 hover:text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy rounded transition-colors"
          >
            <ArrowRightStartOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
