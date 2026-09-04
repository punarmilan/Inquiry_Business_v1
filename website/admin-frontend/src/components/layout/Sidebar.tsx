import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MapPinned, HardHat, Wrench, Building2, Tags, ClipboardList, CreditCard, Flag, LineChart, Settings, Users, PanelsTopLeft, UserRoundPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/cities', label: 'Cities', icon: MapPinned },
  { to: '/workers', label: 'Workers', icon: HardHat },
  { to: '/provider-applications', label: 'Provider Applications', icon: UserRoundPlus },
  { to: '/service-categories', label: 'Service Categories', icon: Wrench },
  { to: '/businesses', label: 'Businesses', icon: Building2 },
  { to: '/offers', label: 'Offers', icon: Tags },
  { to: '/plans', label: 'Subscription Plans', icon: CreditCard },
  { to: '/offer-templates', label: 'Offer Templates', icon: PanelsTopLeft },
  { to: '/bookings', label: 'Bookings', icon: ClipboardList },
  { to: '/payments', label: 'Payments', icon: CreditCard },
  { to: '/reports', label: 'Reports', icon: Flag },
  { to: '/analytics', label: 'Analytics', icon: LineChart },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar = () => <aside className="hidden w-72 shrink-0 border-r bg-card/95 shadow-sm md:flex md:flex-col"><div className="flex h-20 items-center border-b px-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground">IE</div><div className="ml-3"><p className="text-lg font-bold">InquiryExperts</p><p className="text-xs text-muted-foreground">Admin Control Center</p></div></div><nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">{items.map(item=><NavLink key={item.to} to={item.to} end={item.end} className={({isActive})=>cn('flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',isActive?'bg-primary text-primary-foreground shadow-sm':'text-foreground/80 hover:bg-accent')}><item.icon className="h-4 w-4"/>{item.label}</NavLink>)}</nav></aside>;
