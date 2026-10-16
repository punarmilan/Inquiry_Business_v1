import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent } from './Sidebar';
import { Topbar } from './Topbar';

export const AppShell = () => {
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  const wide = pathname === '/';

  useEffect(() => setNavOpen(false), [pathname]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />

      {navOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button type="button" className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setNavOpen(false)} aria-label="Close navigation" />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] border-r bg-card shadow-2xl">
            <button type="button" onClick={() => setNavOpen(false)} className="absolute right-3 top-5 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="Close navigation">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setNavOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setNavOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className={cn('mx-auto w-full px-4 sm:px-6', wide ? 'max-w-[1680px] pb-6 pt-4' : 'max-w-7xl py-5 lg:px-8')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
