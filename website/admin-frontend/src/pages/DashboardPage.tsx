import { Users, MapPinned, Building2, Tags, Clock3, Crown, ClipboardList, HardHat, IndianRupee } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import type { DashboardStats } from '@/types';

export const DashboardPage = () => {
  const { data: stats, isLoading } = useDashboardStats();
  const value = (field: keyof DashboardStats) => (isLoading || !stats ? '—' : stats[field] ?? 0);
  return <div><PageHeader title="Dashboard" description="Hyperlocal offers and managed-services overview."/><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <StatCard label="Active Cities" value={value('activeCities')} icon={MapPinned}/><StatCard label="Users" value={value('totalUsers')} icon={Users}/><StatCard label="Businesses" value={value('businesses')} icon={Building2}/><StatCard label="Active Offers" value={value('activeOffers')} icon={Tags}/><StatCard label="Pending Offers" value={value('pendingOffers')} icon={Clock3}/><StatCard label="Active Subscriptions" value={value('activeSubscriptions')} icon={Crown}/><StatCard label="Service Bookings" value={value('serviceBookings')} icon={ClipboardList}/><StatCard label="Active Workers" value={value('activeWorkers')} icon={HardHat}/><StatCard label="Revenue" value={`₹${Number(value('totalRevenue')).toLocaleString('en-IN')}`} icon={IndianRupee}/>
  </div></div>;
};
