import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Topbar } from './Topbar';
import { AdminNavigation } from './AdminNavigation';
import { navItems } from './navigation';

export const AppShell = () => {
  const { pathname } = useLocation();
  const wide = pathname === '/' || pathname.startsWith('/ui/');
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const item = navItems.find(item => pathname === item.to || (!item.end && pathname.startsWith(`${item.to}/`)));
    document.title = `${item?.label || 'Admin'} · InquiryExperts Admin`;
  }, [pathname]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Topbar />
      <div className="flex min-w-0 flex-1 items-start">
        <aside aria-label="Sidebar" className="sticky top-[72px] hidden h-[calc(100dvh-72px)] w-60 shrink-0 flex-col border-r bg-card lg:flex">
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5"><AdminNavigation /></div>
          <Link to="/app-content" className="m-3 rounded-lg border bg-background p-3 text-xs leading-5 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="block font-semibold text-foreground">Changing the app home?</span>
            Start with App content →
          </Link>
        </aside>
      <main id="main-content" className="min-w-0 flex-1">
        <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8 py-6', wide ? 'max-w-[1720px]' : 'max-w-7xl')}>
          <Outlet />
        </div>
      </main>
      </div>
    </div>
  );
};
