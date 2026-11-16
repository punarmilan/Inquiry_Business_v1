import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Buildings, Flag, List, Moon, Sun, Ticket, Users, type IconProps } from '@phosphor-icons/react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDashboardTrends } from '@/hooks/useDashboardStats';
import { GlobalSearch } from './GlobalSearch';
import { ProfileNavMenu } from './ProfileNavMenu';

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const iconButton =
  'relative flex h-10 w-10 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const NotificationsMenu = () => {
  const { data } = useDashboardTrends(7);
  const attention = data?.attention;
  const items: { label: string; count: number; to: string; icon: PhosphorIcon }[] = attention
    ? [
        { label: 'Offers awaiting review', count: attention.pendingOffers, to: '/offers', icon: Ticket },
        { label: 'Provider applications', count: attention.pendingProviderApplications, to: '/provider-applications', icon: Users },
        { label: 'Businesses to verify', count: attention.pendingBusinessVerifications, to: '/businesses', icon: Buildings },
        { label: 'Reports to review', count: attention.pendingReports, to: '/reports', icon: Flag },
      ].filter((item) => item.count > 0)
    : [];
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={iconButton} aria-label={total ? `${total} items need attention` : 'Notifications'}>
          <Bell className="h-5 w-5" />
          {total > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-card">
              {total > 99 ? '99+' : total}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-2">
        <DropdownMenuLabel className="px-2 text-sm">Needs your attention</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">You're all caught up.</p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.to + item.label} asChild className="cursor-pointer rounded-lg px-2 py-2">
              <Link to={item.to} className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400">{item.count}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return (
    <button type="button" className={iconButton} onClick={() => setTheme(dark ? 'light' : 'dark')} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
};

export const Topbar = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);

  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] shrink-0 flex-wrap items-center justify-between gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur-sm sm:h-[72px] sm:flex-nowrap sm:px-6 sm:py-0">
      {/* Brand & Left Mobile Trigger */}
      <div className="flex items-center gap-3">
        <button
          ref={menuTrigger}
          type="button"
          className="flex h-10 items-center justify-center gap-2 rounded-xl px-2 text-sm font-semibold text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          onClick={() => {
            if (onMenuClick) onMenuClick();
            else setMobileDrawerOpen(true);
          }}
          aria-label="Open navigation menu"
        >
          <List className="h-5 w-5" />
          <span>Menu</span>
        </button>

        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#16b3a6] to-[#0b7f7a] text-xs font-extrabold tracking-wide text-white shadow-[0_4px_12px_-3px_rgba(13,148,136,0.5)]">
            IE
          </span>
          <div className="hidden sm:block">
            <span className="block text-sm font-bold leading-tight text-foreground">InquiryExperts</span>
            <span className="block text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">Admin Center</span>
          </div>
        </Link>
      </div>

      {/* Global Search Bar */}
      <GlobalSearch className="order-last w-full min-w-0 sm:order-none sm:mx-2 sm:max-w-md sm:flex-1 lg:max-w-xl" />

      {/* Right Actions: Notifications, Theme Switcher, Profile Nav */}
      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationsMenu />
        <ThemeToggle />
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <ProfileNavMenu
          externalTriggerRef={menuTrigger}
          externalOpen={mobileDrawerOpen ? true : undefined}
          onCloseExternal={() => setMobileDrawerOpen(false)}
        />
      </div>
    </header>
  );
};
