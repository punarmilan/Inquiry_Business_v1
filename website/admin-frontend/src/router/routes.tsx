import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';

export const router = createBrowserRouter([
  {
    path: '/login',
    lazy: async () => {
      const { LoginPage } = await import('@/pages/LoginPage');
      return { Component: LoginPage };
    },
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: '/',
            lazy: async () => {
              const { DashboardPage } = await import('@/pages/DashboardPage');
              return { Component: DashboardPage };
            },
          },
          {
            path: '/cities',
            lazy: async () => {
              const { CitiesPage } = await import('@/pages/hyperlocal/CitiesPage');
              return { Component: CitiesPage };
            },
          },
          {
            path: '/workers',
            lazy: async () => {
              const { WorkersPage } = await import('@/pages/hyperlocal/WorkersPage');
              return { Component: WorkersPage };
            },
          },
          {
            path: '/provider-applications',
            lazy: async () => {
              const { ProviderApplicationsPage } = await import('@/pages/hyperlocal/ProviderApplicationsPage');
              return { Component: ProviderApplicationsPage };
            },
          },
          {
            path: '/service-categories',
            lazy: async () => {
              const { ServiceCategoriesPage } = await import('@/pages/hyperlocal/ServiceCategoriesPage');
              return { Component: ServiceCategoriesPage };
            },
          },
          {
            path: '/businesses',
            lazy: async () => {
              const { BusinessesPage } = await import('@/pages/hyperlocal/BusinessesPage');
              return { Component: BusinessesPage };
            },
          },
          {
            path: '/offers',
            lazy: async () => {
              const { OffersPage } = await import('@/pages/hyperlocal/OffersPage');
              return { Component: OffersPage };
            },
          },
          {
            path: '/plans',
            lazy: async () => {
              const { PlansPage } = await import('@/pages/hyperlocal/PlansPage');
              return { Component: PlansPage };
            },
          },
          {
            path: '/offer-templates',
            lazy: async () => {
              const { OfferTemplatesPage } = await import('@/pages/hyperlocal/OfferTemplatesPage');
              return { Component: OfferTemplatesPage };
            },
          },
          {
            path: '/bookings',
            lazy: async () => {
              const { BookingsPage } = await import('@/pages/hyperlocal/BookingsPage');
              return { Component: BookingsPage };
            },
          },
          {
            path: '/payments',
            lazy: async () => {
              const { CommercePaymentsPage } = await import('@/pages/hyperlocal/CommercePaymentsPage');
              return { Component: CommercePaymentsPage };
            },
          },
          {
            path: '/reports',
            lazy: async () => {
              const { ReportsQueuePage } = await import('@/pages/admin/ReportsQueuePage');
              return { Component: ReportsQueuePage };
            },
          },
          {
            path: '/settings',
            lazy: async () => {
              const { SettingsPage } = await import('@/pages/admin/SettingsPage');
              return { Component: SettingsPage };
            },
          },
          {
            path: '/settings/:tab',
            lazy: async () => {
              const { SettingsPage } = await import('@/pages/admin/SettingsPage');
              return { Component: SettingsPage };
            },
          },
          {
            path: '/analytics',
            lazy: async () => {
              const { RevenueChartsPage } = await import('@/pages/accounting/RevenueChartsPage');
              return { Component: RevenueChartsPage };
            },
          },
          {
            path: '/users',
            lazy: async () => {
              const { UsersPage } = await import('@/pages/users/UsersPage');
              return { Component: UsersPage };
            },
          },
          {
            path: '/users/:id',
            lazy: async () => {
              const { UserDetailPage } = await import('@/pages/users/UserDetailPage');
              return { Component: UserDetailPage };
            },
          },
        ],
      },
    ],
  },
]);
