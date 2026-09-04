import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CitiesPage } from '@/pages/hyperlocal/CitiesPage';
import { WorkersPage } from '@/pages/hyperlocal/WorkersPage';
import { ProviderApplicationsPage } from '@/pages/hyperlocal/ProviderApplicationsPage';
import { ServiceCategoriesPage } from '@/pages/hyperlocal/ServiceCategoriesPage';
import { BusinessesPage } from '@/pages/hyperlocal/BusinessesPage';
import { OffersPage } from '@/pages/hyperlocal/OffersPage';
import { PlansPage } from '@/pages/hyperlocal/PlansPage';
import { OfferTemplatesPage } from '@/pages/hyperlocal/OfferTemplatesPage';
import { BookingsPage } from '@/pages/hyperlocal/BookingsPage';
import { CommercePaymentsPage } from '@/pages/hyperlocal/CommercePaymentsPage';
import { ReportsQueuePage } from '@/pages/admin/ReportsQueuePage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { RevenueChartsPage } from '@/pages/accounting/RevenueChartsPage';
import { UsersPage } from '@/pages/users/UsersPage';
import { UserDetailPage } from '@/pages/users/UserDetailPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/cities', element: <CitiesPage /> },
          { path: '/workers', element: <WorkersPage /> },
          { path: '/provider-applications', element: <ProviderApplicationsPage /> },
          { path: '/service-categories', element: <ServiceCategoriesPage /> },
          { path: '/businesses', element: <BusinessesPage /> },
          { path: '/offers', element: <OffersPage /> },
          { path: '/plans', element: <PlansPage /> },
          { path: '/offer-templates', element: <OfferTemplatesPage /> },
          { path: '/bookings', element: <BookingsPage /> },
          { path: '/payments', element: <CommercePaymentsPage /> },
          { path: '/reports', element: <ReportsQueuePage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '/settings/:tab', element: <SettingsPage /> },
          { path: '/analytics', element: <RevenueChartsPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/users/:id', element: <UserDetailPage /> },
        ],
      },
    ],
  },
]);
