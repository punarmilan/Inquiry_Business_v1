import {
  Calendar,
  ChartBar,
  Buildings,
  CreditCard,
  FileText,
  House,
  GridFour,
  Image,
  MapPin,
  GearSix,
  Palette,
  Sparkle,
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
  description?: string;
  icon: PhosphorIcon;
  end?: boolean;
  keywords?: string;
}

export interface NavGroup {
  label: string;
  description?: string;
  icon?: PhosphorIcon;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: 'Dashboard',
    description: 'System overview and live operational metrics',
    icon: House,
    items: [
      { to: '/', label: 'Overview', description: 'Core operational KPIs, quick stats & daily trends', icon: House, end: true, keywords: 'home overview dashboard' },
    ],
  },
  {
    label: 'App content',
    description: 'Edit what customers see in the mobile app',
    icon: GridFour,
    items: [
      { to: '/app-content', label: 'App content overview', description: 'Choose what you want to change in the app', icon: GridFour, end: true, keywords: 'home manage app content help' },
      { to: '/home-content', label: 'Home cards & banners', description: 'Change existing home cards, banner images and text', icon: House, keywords: 'home banner carousel image content' },
      { to: '/home-showcase', label: 'Trending offers', description: 'Choose and reorder offer posters shown on home', icon: Ticket, keywords: 'home showcase featured posters trending' },
    ],
  },
  {
    label: 'Dynamic UI',
    description: 'Screen layout, appearance and scheduled app experiences',
    icon: GridFour,
    items: [
      { to: '/ui/pages/offersHome', label: 'Dynamic UI editor', description: 'Add extra sections and change screen layout', icon: GridFour, keywords: 'page builder visual editor layout sections screens dynamic ui' },
      { to: '/ui/themes', label: 'App colors', description: 'Change app colors in light and dark mode', icon: Palette, keywords: 'theme studio palette appearance' },
      { to: '/ui/animations', label: 'Animations', description: 'Upload and preview Lottie animations', icon: Sparkle, keywords: 'animation studio lottie motion assets' },
      { to: '/ui/campaigns', label: 'Scheduled campaigns', description: 'Schedule festival content for selected cities', icon: Calendar, keywords: 'festival campaigns diwali holi schedule' },
    ],
  },
  {
    label: 'Analytics',
    description: 'Deep performance charts & revenue telemetry',
    icon: ChartBar,
    items: [
      { to: '/analytics', label: 'Analytics Overview', description: 'Revenue graphs, order volume & growth analytics', icon: ChartBar, keywords: 'revenue charts trends metrics' },
    ],
  },
  {
    label: 'Marketplace',
    description: 'Hyperlocal network of cities, providers and businesses',
    icon: Buildings,
    items: [
      { to: '/cities', label: 'Cities', description: 'Active service areas, geo boundaries and coverage', icon: MapPin, keywords: 'locations areas localities geocoding' },
      { to: '/workers', label: 'Providers', description: 'Service professionals, verifications and profiles', icon: Users, keywords: 'workers professionals kyc onboarding' },
      { to: '/service-categories', label: 'Service Categories', description: 'Catalog taxonomy, hierarchy and commissions', icon: Tag, keywords: 'services catalog hierarchy' },
      { to: '/businesses', label: 'Businesses', description: 'Registered shops, merchant profiles and status', icon: Buildings, keywords: 'shops merchants verification directory' },
    ],
  },
  {
    label: 'Offers & plans',
    description: 'Review offers, design posters and manage subscription plans',
    icon: Ticket,
    items: [
      { to: '/offers', label: 'Offers', description: 'Promotional deals, discounts and moderation queue', icon: Ticket, keywords: 'deals moderation coupons' },
      { to: '/offer-templates', label: 'Offer Templates', description: 'Visual design templates and flyer generators', icon: Image, keywords: 'posters designs banners templates' },
      { to: '/plans', label: 'Subscription Plans', description: 'Tiered pricing plans and membership benefits', icon: CreditCard, keywords: 'pricing subscriptions tiers' },
    ],
  },
  {
    label: 'Finance',
    description: 'Payments and transaction history',
    icon: CreditCard,
    items: [
      { to: '/payments', label: 'Payments', description: 'Razorpay transactions, settlements and refunds', icon: CreditCard, keywords: 'razorpay orders refunds finance' },
    ],
  },
  {
    label: 'Management',
    description: 'User accounts, reported content and platform settings',
    icon: GearSix,
    items: [
      { to: '/users', label: 'Users', description: 'Customer accounts, roles and status controls', icon: Users, keywords: 'customers accounts kyc' },
      { to: '/reports', label: 'Reported content', description: 'Review complaints and flagged content', icon: FileText, keywords: 'reports flags complaints moderation' },
      { to: '/settings', label: 'Settings', description: 'Platform configuration, API keys and preferences', icon: GearSix, keywords: 'configuration system admin' },
    ],
  },
];

export const navItems = navGroups.flatMap((group) => group.items);
