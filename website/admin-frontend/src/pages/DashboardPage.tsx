import { useState } from 'react';
import {
  Alarm,
  Buildings,
  Coins,
  Crown,
  Gift,
  HardHat,
  CurrencyInr,
  MapPin,
Storefront,
  Ticket,
  UserGear,
  Users,
  UsersThree,
  type IconProps,
} from '@phosphor-icons/react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboardInsights, useDashboardTrends, usePerformance } from '@/hooks/useDashboardStats';
import type { CompareWindow, DashboardStats } from '@/types';
import { DatePill, HeroBanner } from '@/components/dashboard/HeroBanner';
import { StatTile, type StatTone } from '@/components/dashboard/StatTile';
import { QuickActionsCard, RecentActivityCard, SupportBanner } from '@/components/dashboard/SideCards';
import { CategoryDistributionCard, PerformanceChart, RevenueOverviewCard } from '@/components/dashboard/Charts';
import { RecentOffersCard, TopCitiesCard } from '@/components/dashboard/Lists';
import { formatCount, formatINR, percentChange } from '@/components/dashboard/format';

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const TILES: { key: keyof DashboardStats; label: string; icon: PhosphorIcon; art: PhosphorIcon; tone: StatTone; to: string; money?: boolean }[] = [
  { key: 'activeCities', label: 'Active Cities', icon: MapPin, art: MapPin, tone: 'green', to: '/cities' },
  { key: 'totalUsers', label: 'Users', icon: Users, art: UsersThree, tone: 'blue', to: '/users' },
  { key: 'businesses', label: 'Businesses', icon: Buildings, art: Storefront, tone: 'purple', to: '/businesses' },
  { key: 'activeOffers', label: 'Active Offers', icon: Ticket, art: Gift, tone: 'orange', to: '/offers' },
  { key: 'pendingOffers', label: 'Pending Offers', icon: Alarm, art: Alarm, tone: 'red', to: '/offers' },
  { key: 'activeSubscriptions', label: 'Active Subscriptions', icon: Crown, art: Crown, tone: 'violet', to: '/plans' },
  { key: 'activeWorkers', label: 'Active Providers', icon: UserGear, art: HardHat, tone: 'teal', to: '/workers' },
  { key: 'totalRevenue', label: 'Revenue', icon: CurrencyInr, art: Coins, tone: 'green', to: '/analytics', money: true },
];

export const DashboardPage = () => {
  const { admin } = useAuth();
  const [compareDays, setCompareDays] = useState<CompareWindow>(7);
  const [range, setRange] = useState<CompareWindow>(7);
  const trends = useDashboardTrends(compareDays);
  const performance = usePerformance(range);
  const insights = useDashboardInsights();

  const stats = trends.data?.stats;
  const previous = trends.data?.previous;
  const compareLabel = `vs. last ${compareDays} days`;

  const datePill = <DatePill compareDays={compareDays} onChange={setCompareDays} />;

  return (
    <div className="grid gap-5 min-[1400px]:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="min-[1400px]:hidden">{datePill}</div>
        <HeroBanner name={admin?.name} online={!trends.isError} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TILES.map((tile) => {
            const current = stats?.[tile.key] ?? 0;
            return (
              <StatTile
                key={tile.key}
                label={tile.label}
                value={tile.money ? formatINR(current) : formatCount(current)}
                change={previous ? percentChange(current, previous[tile.key]) : null}
                compareLabel={compareLabel}
                icon={tile.icon}
                art={tile.art}
                tone={tile.tone}
                to={tile.to}
                loading={trends.isLoading}
              />
            );
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <PerformanceChart series={performance.data} range={range} onRangeChange={setRange} loading={performance.isLoading} />
          <CategoryDistributionCard data={insights.data?.categoryDistribution} loading={insights.isLoading} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <TopCitiesCard cities={insights.data?.topCities} loading={insights.isLoading} />
          <RevenueOverviewCard data={insights.data?.revenueLast7Days} loading={insights.isLoading} />
          <RecentOffersCard offers={insights.data?.recentOffers} loading={insights.isLoading} />
        </div>
      </div>

      <aside className="grid content-start gap-5 md:grid-cols-2 min-[1400px]:grid-cols-1">
        <div className="hidden min-[1400px]:block">{datePill}</div>
        <RecentActivityCard items={insights.data?.recentActivity} loading={insights.isLoading} />
        <SupportBanner />
        <QuickActionsCard />
      </aside>
    </div>
  );
};
