import { Link, useNavigate } from 'react-router-dom';
import { Bell, Buildings, CaretDown, Flag, SignOut, List, Moon, GearSix, Sun, Ticket, Users, type IconProps } from '@phosphor-icons/react';
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
import { useAuth } from '@/context/AuthContext';
import { useDashboardTrends } from '@/hooks/useDashboardStats';
import { cn } from '@/lib/utils';
import { GlobalSearch } from './GlobalSearch';

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const iconButton = 'relative flex h-10 w-10 items-center justify-center rounded-xl text-foreground/70 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'A';

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

export const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = admin?.role === 'super-admin' ? 'Super Admin' : 'Administrator';

  return (
    <header className="flex h-[72px] shrink-0 items-center gap-3 border-b bg-card px-4 sm:px-6">
      <button type="button" className={cn(iconButton, 'lg:hidden')} onClick={onMenuClick} aria-label="Open navigation">
        <List className="h-5 w-5" />
      </button>

      <GlobalSearch className="min-w-0 flex-1 md:max-w-[560px]" />

      <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
        <NotificationsMenu />
        <ThemeToggle />
        <div className="mx-1 hidden h-8 w-px bg-border sm:block" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex items-center gap-3 rounded-xl px-1.5 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#16b3a6] to-[#0b7f7a] text-sm font-bold text-white">
                {initials(admin?.name)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-36 truncate text-sm font-bold leading-tight text-foreground">{admin?.name}</span>
                <span className="block text-xs text-muted-foreground">{roleLabel}</span>
              </span>
              <CaretDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 rounded-xl p-2">
            <DropdownMenuLabel className="px-2">
              <span className="block truncate font-semibold">{admin?.name}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">{admin?.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg">
              <Link to="/settings"><GearSix className="mr-2 h-4 w-4" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg text-destructive focus:text-destructive">
              <SignOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
