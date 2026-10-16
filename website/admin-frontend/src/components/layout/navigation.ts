import {
  ChartBar,
  Buildings,
  CreditCard,
  FileText,
  House,
  GridFour,
  Image,
  MapPin,
  GearSix,
  Tag,
  Ticket,
  Users,
  type IconProps,
} from '@phosphor-icons/react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';

export type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

export interface NavItem {
  to: string;
  label: string;
  icon: PhosphorIcon;
  end?: boolean;
  keywords?: string;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Dashboard', icon: GridFour, end: true, keywords: 'home overview' },
      { to: '/analytics', label: 'Analytics', icon: ChartBar, keywords: 'revenue charts' },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { to: '/cities', label: 'Cities', icon: MapPin, keywords: 'locations areas localities' },
      { to: '/workers', label: 'Providers', icon: Users, keywords: 'workers professionals' },
      { to: '/service-categories', label: 'Service Categories', icon: Tag },
      { to: '/businesses', label: 'Businesses', icon: Buildings, keywords: 'shops merchants verification' },
    ],
  },
  {
    label: 'Promotions',
    items: [
      { to: '/offers', label: 'Offers', icon: Ticket, keywords: 'deals moderation' },
      { to: '/home-showcase', label: 'Home Showcase', icon: House, keywords: 'banner trending' },
      { to: '/offer-templates', label: 'Offer Templates', icon: Image, keywords: 'posters designs' },
      { to: '/plans', label: 'Subscription Plans', icon: CreditCard, keywords: 'pricing' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/payments', label: 'Payments', icon: CreditCard, keywords: 'razorpay orders refunds' },
      { to: '/reports', label: 'Reports', icon: FileText, keywords: 'flags complaints' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/users', label: 'Users', icon: Users, keywords: 'customers accounts kyc' },
      { to: '/settings', label: 'Settings', icon: GearSix, keywords: 'configuration' },
    ],
  },
];

export const navItems = navGroups.flatMap((group) => group.items);
