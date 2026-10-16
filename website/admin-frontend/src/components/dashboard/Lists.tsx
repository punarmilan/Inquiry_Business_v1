import { useState } from 'react';
import { MapPin, Ticket } from '@phosphor-icons/react';
import type { DashboardInsights, RecentOfferState } from '@/types';
import { cn } from '@/lib/utils';
import { CardSkeleton, DashboardCard, DashboardCardHeader, TrendChip, ViewAllLink } from './DashboardCard';
import { formatCount } from './format';

export const TopCitiesCard = ({ cities, loading }: { cities?: DashboardInsights['topCities']; loading: boolean }) => {
  const rows = cities ?? [];
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <DashboardCard className="p-4">
      <DashboardCardHeader icon={MapPin} title="Top Performing Cities" action={<ViewAllLink to="/cities" />} />
      {loading ? (
        <div className="space-y-4">{Array.from({ length: 5 }, (_, i) => <CardSkeleton key={i} className="h-6" />)}</div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No active businesses or providers in any city yet.</p>
      ) : (
        <>
          <ul className="space-y-4">
            {rows.map((row, index) => (
              <li key={row.cityId} className="flex items-center gap-2 text-[13px]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#15a79c] to-[#0d8781] text-[10px] font-bold text-white">{index + 1}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate font-semibold text-foreground" title={row.name}>{row.name}</span>
                </span>
                <span className="h-2 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                  <span className="block h-full rounded-full bg-gradient-to-r from-[#2dd4bf] to-[#0d9488]" style={{ width: `${Math.max(8, (row.count / max) * 100)}%` }} />
                </span>
                <span className="w-10 shrink-0 text-right font-semibold text-foreground">{formatCount(row.count)}</span>
                <span className="w-12 shrink-0 text-right"><TrendChip change={row.growth} /></span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] text-muted-foreground">Active businesses + providers · growth over 7 days</p>
        </>
      )}
    </DashboardCard>
  );
};

const STATE_BADGE: Record<RecentOfferState, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400' },
  pending: { label: 'Pending', className: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400' },
  inactive: { label: 'Inactive', className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
  expired: { label: 'Expired', className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300' },
};

const OfferThumb = ({ src, title }: { src: string | null; title: string }) => {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-500 dark:bg-orange-500/15">
        <Ticket className="h-5 w-5" />
      </span>
    );
  }
  return <img src={src} alt={title} loading="lazy" onError={() => setBroken(true)} className="h-10 w-10 shrink-0 rounded-lg object-cover" />;
};

export const RecentOffersCard = ({ offers, loading }: { offers?: DashboardInsights['recentOffers']; loading: boolean }) => (
  <DashboardCard className="p-4">
    <DashboardCardHeader icon={Ticket} title="Recent Offers" action={<ViewAllLink to="/offers" />} />
    {loading ? (
      <div className="space-y-4">{Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} className="h-10" />)}</div>
    ) : !offers?.length ? (
      <p className="py-10 text-center text-sm text-muted-foreground">No offers posted yet.</p>
    ) : (
      <ul className="space-y-3.5">
        {offers.map((offer) => {
          const badge = STATE_BADGE[offer.state];
          return (
            <li key={offer._id} className="flex items-center gap-3">
              <OfferThumb src={offer.imageUrl} title={offer.title} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foreground">{offer.title}</p>
                <p className="truncate text-xs text-muted-foreground">{offer.category || offer.businessName || '—'}</p>
              </div>
              <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold', badge.className)}>{badge.label}</span>
            </li>
          );
        })}
      </ul>
    )}
  </DashboardCard>
);
