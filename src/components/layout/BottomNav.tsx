'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  WifiIcon,
  BellIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  WifiIcon as WifiIconSolid,
  BellIcon as BellIconSolid,
  Cog6ToothIcon as CogIconSolid,
} from '@heroicons/react/24/solid';

interface NavTab {
  href: string;
  label: string;
  OutlineIcon: typeof HomeIcon;
  SolidIcon: typeof HomeIconSolid;
  matchPaths: string[];
}

const TABS: NavTab[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    OutlineIcon: HomeIcon,
    SolidIcon: HomeIconSolid,
    matchPaths: ['/dashboard'],
  },
  {
    href: '/devices',
    label: 'Devices',
    OutlineIcon: WifiIcon,
    SolidIcon: WifiIconSolid,
    matchPaths: ['/devices'],
  },
  {
    href: '/alerts',
    label: 'Alerts',
    OutlineIcon: BellIcon,
    SolidIcon: BellIconSolid,
    matchPaths: ['/alerts'],
  },
  {
    href: '/settings',
    label: 'Settings',
    OutlineIcon: Cog6ToothIcon,
    SolidIcon: CogIconSolid,
    matchPaths: ['/settings'],
  },
];

function isTabActive(pathname: string, tab: NavTab): boolean {
  if (tab.href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return tab.matchPaths.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 flex h-16 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)] md:hidden"
      aria-label="Primary navigation"
    >
      {TABS.map((tab) => {
        const active = isTabActive(pathname, tab);
        const Icon = active ? tab.SolidIcon : tab.OutlineIcon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={[
              'flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0',
              'text-sm font-semibold transition-colors duration-100',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-navy focus-visible:outline-offset-[-2px]',
              active
                ? 'text-navy'
                : 'text-slate-400 hover:text-slate-600',
            ].join(' ')}
          >
            <span className="relative">
              <Icon className="h-6 w-6" aria-hidden="true" />
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-6 rounded-full bg-gulf-gold"
                />
              )}
            </span>
            <span className="truncate leading-none mt-1">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
