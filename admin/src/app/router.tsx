import { createBrowserRouter, Outlet } from 'react-router-dom';
import { AdminAuthProvider } from '@/features/auth/context/admin-auth-context';
import { AdminLayout, RequireAdminAuth } from '@/layout/admin-layout';
import { LoginPage } from '@/pages/login-page';
import { DashboardPage } from '@/pages/dashboard-page';
import { ProductsPage } from '@/pages/products-page';
import { CategoriesPage } from '@/pages/categories-page';
import { OrdersPage } from '@/pages/orders-page';
import { CustomersPage } from '@/pages/customers-page';
import { InventoryPage } from '@/pages/inventory-page';
import { CouponsPage } from '@/pages/coupons-page';
import { BannersPage } from '@/pages/banners-page';
import { SettingsPage } from '@/pages/settings-page';
import { AdminNotFoundPage } from '@/pages/not-found-page';

const shell = (
  <RequireAdminAuth>
    <AdminLayout />
  </RequireAdminAuth>
);

/** Root layout: provides Supabase auth context to every route. */
function AuthRoot() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

export const adminRouter = createBrowserRouter([
  {
    element: <AuthRoot />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/',
        element: shell,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'categories', element: <CategoriesPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'customers', element: <CustomersPage /> },
          { path: 'inventory', element: <InventoryPage /> },
          { path: 'coupons', element: <CouponsPage /> },
          { path: 'banners', element: <BannersPage /> },
          { path: 'settings', element: <SettingsPage /> },
        ],
      },
      { path: '*', element: <AdminNotFoundPage /> },
    ],
  },
]);