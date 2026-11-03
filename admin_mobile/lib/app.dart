import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';

import '../features/auth/auth_provider.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/analytics/analytics_screen.dart';
import '../features/products/product_form_screen.dart';
import '../features/products/products_screen.dart';
import '../features/categories/categories_screen.dart';
import '../features/orders/orders_screen.dart';
import '../features/orders/order_detail_screen.dart';
import '../features/customers/customers_screen.dart';
import '../features/inventory/inventory_screen.dart';
import '../features/coupons/coupons_screen.dart';
import '../features/banners/banners_screen.dart';
import '../features/homepage/homepage_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/notifications/notification_centre_screen.dart';
import '../features/notifications/fcm_service.dart'
    show fcmServiceProvider, unreadCountProvider;

/// Sreepon admin app — root widget.
///
/// Owns GoRouter + Riverpod ProviderScope. Auth state drives redirects:
/// unauthenticated users are sent to /login; signed-in admins reach the shell.
class SreeponAdminApp extends ConsumerWidget {
  const SreeponAdminApp({super.key});

  static const String displayName = 'Sreepon Admin';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authProvider);

    final router = GoRouter(
      initialLocation: '/login',
      redirect: (context, state) {
        final loggedIn = authAsync.valueOrNull != null;
        final isLogin = state.matchedLocation == '/login';
        if (!loggedIn) return isLogin ? null : '/login';
        if (isLogin) return '/';
        return null;
      },
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => const LoginScreen(),
        ),
        ShellRoute(
          builder: (context, state, child) => _AdminShell(location: state.uri.path, child: child),
          routes: [
            GoRoute(path: '/', builder: (context, state) => const DashboardScreen()),
            GoRoute(path: '/analytics', builder: (context, state) => const AnalyticsScreen()),
            GoRoute(path: '/products', builder: (context, state) => const ProductsScreen()),
            GoRoute(path: '/products/create', builder: (context, state) => const ProductFormScreen()),
            GoRoute(path: '/products/:id/edit', builder: (context, state) => ProductFormScreen(productId: state.pathParameters['id']!)),
            GoRoute(path: '/categories', builder: (context, state) => const CategoriesScreen()),
            GoRoute(path: '/orders', builder: (context, state) => const OrdersScreen()),
            GoRoute(path: '/orders/:id', builder: (context, state) => OrderDetailScreen(orderId: state.pathParameters['id']!)),
            GoRoute(path: '/customers', builder: (context, state) => const CustomersScreen()),
            GoRoute(path: '/inventory', builder: (context, state) => const InventoryScreen()),
            GoRoute(path: '/coupons', builder: (context, state) => const CouponsScreen()),
            GoRoute(path: '/banners', builder: (context, state) => const BannersScreen()),
            GoRoute(path: '/homepage', builder: (context, state) => const HomepageScreen()),
            GoRoute(path: '/settings', builder: (context, state) => const SettingsScreen()),
            GoRoute(path: '/notifications', builder: (context, state) => const NotificationCentreScreen()),
          ],
        ),
      ],
    );

    return MaterialApp.router(
      title: displayName,
      debugShowCheckedModeBanner: false,
      theme: SreeponAdminTheme.light,
      routerConfig: router,
    );
  }
}

/// Admin shell — drawer navigation + body area.
class _AdminShell extends ConsumerStatefulWidget {
  const _AdminShell({required this.child, required this.location});

  final Widget child;
  final String location;

  @override
  ConsumerState<_AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends ConsumerState<_AdminShell> {
  Timer? _notificationPoller;

  /// Bottom-bar destinations.
  static const List<_NavItem> _primaryItems = [
    _NavItem(label: 'Dashboard', icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, route: '/'),
    _NavItem(label: 'Orders', icon: Icons.receipt_outlined, activeIcon: Icons.receipt, route: '/orders'),
    _NavItem(label: 'Products', icon: Icons.shopping_bag_outlined, activeIcon: Icons.shopping_bag, route: '/products'),
    _NavItem(label: 'Inventory', icon: Icons.inventory_2_outlined, activeIcon: Icons.inventory_2, route: '/inventory'),
    _NavItem(label: 'Customers', icon: Icons.people_outlined, activeIcon: Icons.people, route: '/customers'),
  ];

  /// Extra destinations exposed through the drawer.
  static const List<_NavItem> _secondaryItems = [
    _NavItem(label: 'Analytics', icon: Icons.bar_chart_outlined, activeIcon: Icons.bar_chart, route: '/analytics'),
    _NavItem(label: 'Categories', icon: Icons.category_outlined, activeIcon: Icons.category, route: '/categories'),
    _NavItem(label: 'Coupons', icon: Icons.local_offer_outlined, activeIcon: Icons.local_offer, route: '/coupons'),
    _NavItem(label: 'Banners', icon: Icons.image_outlined, activeIcon: Icons.image, route: '/banners'),
    _NavItem(label: 'Homepage', icon: Icons.web_outlined, activeIcon: Icons.web, route: '/homepage'),
  ];

  int get _selectedIndex {
    final index = _primaryItems.indexWhere((item) => _matches(widget.location, item.route));
    return index < 0 ? 0 : index;
  }

  static bool _matches(String location, String route) {
    if (route == '/') return location == '/';
    return location == route || location.startsWith('$route/');
  }

  void _onItemTapped(int index) {
    context.go(_primaryItems[index].route);
  }

  void _onDrawerItem(String route) {
    context.pop(); // close drawer
    context.go(route);
  }

  @override
  void initState() {
    super.initState();
    // Wire notification taps to navigate to the relevant screen.
    ref.read(fcmServiceProvider).onNotificationTap = (route) {
      if (mounted) context.go(route);
    };
    // Cold-start deep link: a notification tap that launched the app.
    final pendingRoute = ref.read(fcmServiceProvider).takePendingRoute();
    if (pendingRoute != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) context.go(pendingRoute);
      });
    }
    ref.read(fcmServiceProvider).refreshBadge();
    ref.read(fcmServiceProvider).registerDevice();
    // Poll for unread notifications so new orders surface while the app is open.
    _notificationPoller = Timer.periodic(const Duration(seconds: 30), (_) {
      if (!mounted) return;
      ref.read(fcmServiceProvider).refreshBadge();
    });
  }

  @override
  void dispose() {
    _notificationPoller?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(currentUserProvider);

    return Scaffold(
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              accountName: Text(user?.name ?? user?.email ?? 'Admin'),
              accountEmail: Text(user?.email ?? ''),
              currentAccountPicture: const CircleAvatar(child: Icon(Icons.store, color: Colors.white)),
            ),
            ..._primaryItems.map((item) {
              final active = _matches(widget.location, item.route);
              return ListTile(
                leading: Icon(active ? item.activeIcon : item.icon,
                    color: active ? SreeponAdminTheme.flame600 : SreeponAdminTheme.slate600),
                title: Text(item.label,
                    style: TextStyle(
                      color: active ? SreeponAdminTheme.slate900 : SreeponAdminTheme.slate600,
                      fontWeight: active ? FontWeight.w600 : FontWeight.normal,
                    )),
                selected: active,
                onTap: () => _onDrawerItem(item.route),
              );
            }),
            const Divider(),
            const Padding(
              padding: EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: Text('MANAGE',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate400)),
            ),
            ..._secondaryItems.map((item) {
              final active = _matches(widget.location, item.route);
              return ListTile(
                leading: Icon(active ? item.activeIcon : item.icon,
                    color: active ? SreeponAdminTheme.flame600 : SreeponAdminTheme.slate600),
                title: Text(item.label,
                    style: TextStyle(
                      color: active ? SreeponAdminTheme.slate900 : SreeponAdminTheme.slate600,
                      fontWeight: active ? FontWeight.w600 : FontWeight.normal,
                    )),
                selected: active,
                onTap: () => _onDrawerItem(item.route),
              );
            }),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.notifications_outlined, color: SreeponAdminTheme.slate600),
              title: const Text('Notifications', style: TextStyle(color: SreeponAdminTheme.slate600)),
              onTap: () {
                context.pop();
                context.go('/notifications');
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings_outlined, color: SreeponAdminTheme.slate600),
              title: const Text('Settings', style: TextStyle(color: SreeponAdminTheme.slate600)),
              onTap: () {
                context.pop();
                context.go('/settings');
              },
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: SreeponAdminTheme.red600),
              title: const Text('Sign out', style: TextStyle(color: SreeponAdminTheme.red600)),
              onTap: () async {
                context.pop();
                await ref.read(authProvider.notifier).signOut();
                if (context.mounted) context.go('/login');
              },
            ),
          ],
        ),
      ),
      appBar: AppBar(
        title: const Text('Sreepon Admin'),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => context.go('/notifications'),
              ),
              Consumer(
                builder: (_, ref, __) {
                  final count = ref.watch(unreadCountProvider);
                  if (count == 0) return const SizedBox.shrink();
                  return Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: SreeponAdminTheme.flame600,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        count > 9 ? '9+' : count.toString(),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () => context.go('/settings'),
          ),
        ],
      ),
      body: widget.child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        items: _primaryItems
            .map((i) => BottomNavigationBarItem(
                  icon: Icon(i.icon),
                  activeIcon: Icon(i.activeIcon),
                  label: i.label,
                ))
            .toList(),
        selectedItemColor: SreeponAdminTheme.flame600,
        unselectedItemColor: SreeponAdminTheme.slate600,
        type: BottomNavigationBarType.fixed,
      ),
    );
  }
}

class _NavItem {
  const _NavItem({required this.label, required this.icon, required this.activeIcon, required this.route});
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String route;
}
