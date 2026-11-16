import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { CaretDown, GearSix, SignOut, X } from '@phosphor-icons/react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { AdminNavigation } from './AdminNavigation';

const initials = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'A';

const focusStyle = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover';

interface ProfileNavMenuProps {
  onMenuToggle?: (open: boolean) => void;
  externalOpen?: boolean;
  onCloseExternal?: () => void;
  externalTriggerRef?: RefObject<HTMLButtonElement | null>;
}

export const ProfileNavMenu = ({ onMenuToggle, externalOpen, onCloseExternal, externalTriggerRef }: ProfileNavMenuProps) => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const previousPathname = useRef(pathname);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = externalOpen ?? internalOpen;
  const openedExternally = useRef(false);
  useEffect(() => { if (externalOpen) openedExternally.current = true; }, [externalOpen]);

  const setOpen = useCallback((open: boolean) => {
    if (externalOpen !== undefined && !open) onCloseExternal?.();
    setInternalOpen(open);
    onMenuToggle?.(open);
  }, [externalOpen, onCloseExternal, onMenuToggle]);

  useEffect(() => {
    if (previousPathname.current === pathname) return;
    previousPathname.current = pathname;
    setOpen(false);
  }, [pathname, setOpen]);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = admin?.role === 'super-admin' ? 'Super Admin' : 'Administrator';
  const groupRowStyle = cn(
    'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors',
    'text-foreground/80 hover:bg-muted hover:text-foreground',
    focusStyle
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open profile navigation menu"
          className={cn(
            'flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted',
            focusStyle,
            isOpen && 'bg-muted'
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {initials(admin?.name)}
          </span>
          <span className="hidden min-w-0 text-left sm:block">
            <span className="block max-w-36 truncate text-sm font-semibold leading-5 text-foreground">{admin?.name || 'Admin'}</span>
            <span className="block text-xs leading-4 text-muted-foreground">{roleLabel}</span>
          </span>
          <CaretDown aria-hidden="true" className={cn('hidden h-3.5 w-3.5 text-muted-foreground transition-transform motion-reduce:transition-none sm:block', isOpen && 'rotate-180')} />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-950/25 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            if (openedExternally.current && externalTriggerRef?.current) {
              event.preventDefault();
              externalTriggerRef.current.focus();
            }
            openedExternally.current = false;
          }}
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-[min(360px,calc(100vw-1rem))] flex-col overflow-hidden border-l border-border bg-popover text-popover-foreground shadow-2xl',
            'sm:inset-y-auto sm:right-6 sm:top-20 sm:h-auto sm:max-h-[calc(100dvh-6rem)] sm:rounded-2xl sm:border',
            'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-right-4 duration-200'
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <Dialog.Title className="text-sm font-semibold text-foreground">Navigation</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close navigation menu" className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground', focusStyle)}>
                <X aria-hidden="true" className="h-[18px] w-[18px]" />
              </button>
            </Dialog.Close>
          </div>

          <div className="flex shrink-0 items-center gap-3 px-5 py-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground">{initials(admin?.name)}</span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{admin?.name || 'Admin'}</span>
                <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{roleLabel}</span>
              </div>
              {admin?.email && <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={admin.email}>{admin.email}</span>}
            </div>
          </div>

          <div className="profile-navigation-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">
            <AdminNavigation onNavigate={() => setOpen(false)} />
          </div>

          <div className="shrink-0 space-y-1 border-t border-border px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Link to="/settings" onClick={() => setOpen(false)} className={groupRowStyle}>
              <GearSix aria-hidden="true" className="h-[18px] w-[18px] text-muted-foreground" />
              Platform settings
            </Link>
            <button type="button" onClick={handleLogout} className={cn(groupRowStyle, 'text-destructive hover:bg-destructive/10 hover:text-destructive')}>
              <SignOut aria-hidden="true" className="h-[18px] w-[18px]" />
              Log out
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
