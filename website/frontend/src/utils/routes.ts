import { navItems } from '../constants';
import { categories } from '../data/siteData';
import type { BaseRoutePath, RoutePath } from '../types';

export function getCurrentRoute(): RoutePath {
  const path = window.location.pathname;
  if (navItems.some((item) => item.path === path)) {
    return path as BaseRoutePath;
  }

  return getServiceFromRoute(path) ? (path as RoutePath) : '/';
}

export function getServicePath(slug: string): RoutePath {
  return `/services/${slug}`;
}

export function getServiceFromRoute(path: string) {
  const servicePrefix = '/services/';

  if (!path.startsWith(servicePrefix)) {
    return undefined;
  }

  return categories.find((service) => service.slug === path.slice(servicePrefix.length));
}

export function isActiveNavItem(route: RoutePath, navPath: BaseRoutePath) {
  if (route === navPath) {
    return true;
  }

  return navPath !== '/' && route.startsWith(`${navPath}/`);
}
