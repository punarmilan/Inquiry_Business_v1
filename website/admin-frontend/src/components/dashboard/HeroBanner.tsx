import type { ReactNode } from 'react';
import { CalendarDots, CaretDown, MapPin, Plant, Storefront } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CompareWindow } from '@/types';
import { cn } from '@/lib/utils';
import { greeting } from './format';
import { PersonSprite } from './PersonSprite';

interface HeroBannerProps {
  name?: string;
  online: boolean;
}

const FloatingTile = ({ className, children }: { className?: string; children: ReactNode }) => (
  <span className={cn('absolute flex items-center justify-center rounded-2xl bg-card/90 shadow-lg shadow-teal-900/10 ring-1 ring-white/60 backdrop-blur dark:ring-white/10', className)}>
    {children}
  </span>
);

export const HeroBanner = ({ name, online }: HeroBannerProps) => (
  <section className="relative overflow-hidden rounded-2xl border border-teal-100/80 bg-gradient-to-r from-[#e2f5f1] via-[#eef9f7] to-[#dff3ef] px-6 py-3.5 dark:border-teal-900/40 dark:from-teal-950/60 dark:via-teal-950/30 dark:to-teal-900/40 sm:px-8">
    <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-teal-300/20 blur-3xl" />
    <div className="relative flex min-h-[84px] items-center gap-6">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-foreground/80">{greeting()},</p>
        <h1 className="mt-0.5 flex items-center gap-2 truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-[28px]">
          <span className="truncate">{name || 'Admin'}</span>
          <span aria-hidden="true" className="shrink-0">👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Here's what's happening with your platform today.</p>
      </div>

      <div className="hidden shrink-0 md:block">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs font-bold shadow-sm', online ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
          <span className="relative flex h-2 w-2">
            {online ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /> : null}
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', online ? 'bg-emerald-500' : 'bg-red-500')} />
          </span>
          {online ? 'Live' : 'Offline'}
        </span>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">{online ? 'System Online' : "Can't reach the API"}</p>
      </div>

      <div className="relative hidden h-[92px] w-[250px] shrink-0 sm:block">
        <FloatingTile className="left-2 top-0 h-10 w-10 text-teal-600"><MapPin className="h-5 w-5" /></FloatingTile>
        <FloatingTile className="left-12 top-11 h-9 w-9 text-emerald-600"><Storefront className="h-[18px] w-[18px]" /></FloatingTile>
        <FloatingTile className="right-0 top-1 h-10 w-10 text-teal-600"><Plant className="h-5 w-5" /></FloatingTile>
        <PersonSprite sheet={5} slot={3} className="absolute -bottom-4 right-10 h-[118px] w-[118px]" />
      </div>
    </div>
  </section>
);

const COMPARE_OPTIONS: { value: CompareWindow; label: string }[] = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

export const DatePill = ({ compareDays, onChange, className }: { compareDays: CompareWindow; onChange: (value: CompareWindow) => void; className?: string }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className={cn('flex h-12 w-full items-center gap-3 rounded-xl border bg-card px-4 text-sm font-semibold text-foreground shadow-card transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
        aria-label={`Today, comparing with the last ${compareDays} days`}
      >
        <CalendarDots className="h-[18px] w-[18px] text-muted-foreground" />
        <span className="flex-1 text-left">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <CaretDown className="h-4 w-4 text-muted-foreground" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
      <DropdownMenuLabel className="px-2 text-xs font-medium text-muted-foreground">Compare stats with</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuRadioGroup value={String(compareDays)} onValueChange={(value) => onChange(Number(value) as CompareWindow)}>
        {COMPARE_OPTIONS.map((option) => (
          <DropdownMenuRadioItem key={option.value} value={String(option.value)} className="cursor-pointer rounded-lg">
            {option.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
