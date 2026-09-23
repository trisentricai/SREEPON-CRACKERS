import { createBrowserRouter } from 'react-router-dom';
import { MDScopeProvider } from '../context/md-scope';
import { AuthProvider } from '../features/auth/context/auth-context';
import { AppShell } from '../layout/app-shell';
import { CartPage } from '../pages/cart-page';
import { CheckoutPage } from '../pages/checkout-page';
import { HomePage } from '../pages/home-page';
import { NotFoundPage } from '../pages/not-found-page';
import { OrderDetailsPage } from '../pages/order-details-page';
import { OrdersPage } from '../pages/orders-page';
import { ProductDetailsPage } from '../pages/product-details-page';
import { ProductsPage } from '../pages/products-page';
import { ProfilePage } from '../pages/profile-page';
import { WishlistPage } from '../pages/wishlist-page';

/** SriPon customer web routes. Feature routes are lazy-loaded where backed by heavy UIs. */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppElement />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'products/:categorySlug', element: <ProductsPage /> },
      { path: 'products/:categorySlug/:productSlug', element: <ProductDetailsPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'wishlist', element: <WishlistPage /> },
      { path: 'orders', element: <OrdersPage /> },
      { path: 'orders/:orderId', element: <OrderDetailsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

function AppElement() {
  return (
    <MDScopeProvider>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </MDScopeProvider>
  );
}