import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, CaretRight, type IconProps } from '@phosphor-icons/react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { cn } from '@/lib/utils';

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

export const DashboardCard = ({ className, children }: { className?: string; children: ReactNode }) => (
  <section className={cn('rounded-2xl border border-border/80 bg-card p-5 shadow-card', className)}>{children}</section>
);

interface CardHeaderProps {
  icon: PhosphorIcon;
  title: string;
  action?: ReactNode;
}

export const DashboardCardHeader = ({ icon: Icon, title, action }: CardHeaderProps) => (
  <div className="mb-4 flex items-center gap-3">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
      <Icon className="h-[18px] w-[18px]" />
    </span>
    <h3 className="min-w-0 flex-1 truncate text-[13px] font-bold text-foreground">{title}</h3>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const ViewAllLink = ({ to, children }: { to: string; children?: ReactNode }) => (
  <Link to={to} className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
    {children ?? 'View All'}
    <CaretRight className="h-3 w-3" />
  </Link>
);

export const TrendChip = ({ change }: { change: number | null }) => {
  if (change === null) return <span className="text-[11px] text-muted-foreground">—</span>;
  const positive = change >= 0;
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-bold', positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500')}>
      {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
};

export const CardSkeleton = ({ className }: { className?: string }) => (
  <div className={cn('animate-pulse rounded-lg bg-muted', className)} />
);
