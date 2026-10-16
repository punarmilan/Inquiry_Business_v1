import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Buildings,
  CaretRight,
  Clock,
  CreditCard,
  ChartBar,
  MapPin,
  Storefront,
  Ticket,
  UserPlus,
  User,
  Users,
  Lightning,
  type IconProps,
} from '@phosphor-icons/react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import type { ActivityType, DashboardInsights } from '@/types';
import { cn } from '@/lib/utils';
import { CardSkeleton, DashboardCard, DashboardCardHeader } from './DashboardCard';
import { PersonSprite } from './PersonSprite';
import { timeAgo } from './format';

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const ACTIVITY_STYLE: Record<ActivityType, { icon: PhosphorIcon; tone: string }> = {
  provider: { icon: UserPlus, tone: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400' },
  offer: { icon: Ticket, tone: 'bg-orange-50 text-orange-500 dark:bg-orange-500/15 dark:text-orange-400' },
  business: { icon: Buildings, tone: 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400' },
  subscription: { icon: CreditCard, tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  user: { icon: User, tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400' },
};

const COLLAPSED_ACTIVITY = 5;

export const RecentActivityCard = ({ items, loading }: { items?: DashboardInsights['recentActivity']; loading: boolean }) => {
  const [expanded, setExpanded] = useState(false);
  const list = items ?? [];
  const visible = expanded ? list : list.slice(0, COLLAPSED_ACTIVITY);
  return (
    <DashboardCard>
      <DashboardCardHeader
        icon={Clock}
        title="Recent Activity"
        action={list.length > COLLAPSED_ACTIVITY ? (
          <button type="button" onClick={() => setExpanded((value) => !value)} className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
            {expanded ? 'Show Less' : 'View All'}
            <CaretRight className={cn('h-3.5 w-3.5 transition-transform', expanded && 'rotate-90')} />
          </button>
        ) : null}
      />
      {loading ? (
        <div className="space-y-4">{Array.from({ length: 5 }, (_, i) => <CardSkeleton key={i} className="h-10" />)}</div>
      ) : list.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">No activity yet.</p>
      ) : (
        <ul className="space-y-4">
          {visible.map((item) => {
            const style = ACTIVITY_STYLE[item.type];
            return (
              <li key={item.id} className="flex items-start gap-2.5">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', style.tone)}>
                  <style.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12.5px] font-semibold leading-snug text-foreground">{item.title}</p>
                    <span className="shrink-0 whitespace-nowrap pt-px text-[10.5px] text-muted-foreground">{timeAgo(item.at)}</span>
                  </div>
                  <p className="truncate text-[11.5px] text-muted-foreground" title={item.subtitle}>{item.subtitle}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
};

export const SupportBanner = () => (
  <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#13a99d] via-[#0f968d] to-[#0a7671] p-5 text-white shadow-card">
    <div className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
    <div className="relative z-10 max-w-[60%]">
      <h2 className="text-xl font-extrabold leading-tight">Support<br />Local Business</h2>
      <p className="mt-2 text-xs leading-relaxed text-white/85">More offers. More customers. Stronger community.</p>
      <Link
        to="/offers"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-white/30 backdrop-blur transition-colors hover:bg-white/25"
      >
        Explore Offers
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
    <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
      <Storefront className="h-4 w-4" />
    </span>
    <PersonSprite sheet={5} slot={1} className="absolute -bottom-3 -right-5 h-[150px] w-[150px]" />
  </section>
);

const QUICK_ACTIONS: { label: string; to: string; icon: PhosphorIcon; tone: string }[] = [
  { label: 'Add City', to: '/cities', icon: MapPin, tone: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Add Provider', to: '/workers', icon: Users, tone: 'text-blue-600 dark:text-blue-400' },
  { label: 'Create Offer', to: '/offer-templates', icon: Ticket, tone: 'text-orange-500 dark:text-orange-400' },
  { label: 'Add Business', to: '/businesses', icon: Buildings, tone: 'text-purple-600 dark:text-purple-400' },
  { label: 'Manage Users', to: '/users', icon: Users, tone: 'text-blue-600 dark:text-blue-400' },
  { label: 'View Reports', to: '/reports', icon: ChartBar, tone: 'text-violet-600 dark:text-violet-400' },
];

export const QuickActionsCard = () => (
  <DashboardCard className="p-4">
    <DashboardCardHeader icon={Lightning} title="Quick Actions" />
    <div className="grid grid-cols-2 gap-2.5">
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.label}
          to={action.to}
          className="flex items-center gap-2 rounded-xl border border-border/80 px-2.5 py-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-accent/60"
        >
          <action.icon className={cn('h-4 w-4 shrink-0', action.tone)} />
          <span className="truncate">{action.label}</span>
        </Link>
      ))}
    </div>
  </DashboardCard>
);
