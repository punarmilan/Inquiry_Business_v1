import { Link } from 'react-router-dom';
import type { IconProps } from '@phosphor-icons/react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { cn } from '@/lib/utils';
import { TrendChip } from './DashboardCard';

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

export type StatTone = 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'violet' | 'teal';

const TONES: Record<StatTone, { tile: string; art: string; glow: string }> = {
  green: { tile: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400', art: 'text-emerald-500/70', glow: 'bg-emerald-100/70 dark:bg-emerald-500/10' },
  blue: { tile: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400', art: 'text-blue-500/70', glow: 'bg-blue-100/70 dark:bg-blue-500/10' },
  purple: { tile: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400', art: 'text-purple-500/70', glow: 'bg-purple-100/70 dark:bg-purple-500/10' },
  orange: { tile: 'bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400', art: 'text-orange-400/80', glow: 'bg-orange-100/70 dark:bg-orange-500/10' },
  red: { tile: 'bg-red-50 text-red-500 dark:bg-red-500/15 dark:text-red-400', art: 'text-red-400/70', glow: 'bg-red-100/70 dark:bg-red-500/10' },
  violet: { tile: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400', art: 'text-violet-500/70', glow: 'bg-violet-100/70 dark:bg-violet-500/10' },
  teal: { tile: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400', art: 'text-teal-500/70', glow: 'bg-teal-100/70 dark:bg-teal-500/10' },
};

interface StatTileProps {
  label: string;
  value: string;
  change: number | null;
  compareLabel: string;
  icon: PhosphorIcon;
  art: PhosphorIcon;
  tone: StatTone;
  to: string;
  loading?: boolean;
}

export const StatTile = ({ label, value, change, compareLabel, icon: Icon, art: Art, tone, to, loading }: StatTileProps) => {
  const colors = TONES[tone];
  return (
    <Link
      to={to}
      className="group relative flex min-h-[140px] overflow-hidden rounded-2xl border border-border/80 bg-card p-4 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colors.tile)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="relative z-10 ml-2 min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-foreground/80" title={label}>{label}</p>
        {loading ? (
          <div className="mt-2 h-7 w-20 animate-pulse rounded-md bg-muted" />
        ) : (
          <p className="mt-1 truncate text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
        )}
        <div className="mt-2">
          {loading ? <div className="h-3.5 w-12 animate-pulse rounded bg-muted" /> : <TrendChip change={change} />}
          <p className="mt-0.5 text-[11px] text-muted-foreground">{compareLabel}</p>
        </div>
      </div>
      <div className={cn('pointer-events-none absolute -bottom-6 -right-6 flex h-28 w-28 items-center justify-center rounded-full transition-transform group-hover:scale-105', colors.glow)}>
        <Art className={cn('-translate-x-2 -translate-y-2 h-12 w-12', colors.art)} weight="light" />
      </div>
    </Link>
  );
};
