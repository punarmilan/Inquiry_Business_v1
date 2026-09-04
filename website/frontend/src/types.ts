import type { MouseEvent, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type IconText = {
  icon: LucideIcon;
  title: string;
  body?: string;
  image?: string;
  imageAlt?: string;
};

export type ServiceItem = IconText & {
  slug: string;
  intro: string;
};

export type BaseRoutePath = '/' | '/work-hub' | '/services' | '/features' | '/download';
export type RoutePath = BaseRoutePath | `/services/${string}`;

export type NavItem = {
  label: string;
  path: BaseRoutePath;
};

export type NavigationHandler = (event: MouseEvent<HTMLAnchorElement>, path: RoutePath) => void;

export type PageTitle = ReactNode;
