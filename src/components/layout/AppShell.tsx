import type { ReactNode } from 'react';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      {/* Desktop / tablet top nav — hidden on mobile */}
      <TopNav />

      {/* Main content area */}
      <main
        className={[
          'flex-1 flex flex-col',
          // Bottom padding on mobile to clear the fixed bottom nav (64px)
          'pb-16 md:pb-0',
        ].join(' ')}
      >
        {children}
      </main>

      {/* Mobile bottom nav — hidden on md+ */}
      <BottomNav />
    </>
  );
}
