import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';

import '../features/auth/auth_provider.dart';
import '../features/auth/presentation/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/analytics/analytics_screen.dart';
import '../features/products/products_screen.dart';
import '../features/categories/categories_screen.dart';
import '../features/orders/orders_screen.dart';
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
          builder: (context, state, child) => _AdminShell(child: child),
          routes: [
            GoRoute(path: '/', builder: (context, state) => const DashboardScreen()),
            GoRoute(path: '/analytics', builder: (context, state) => const AnalyticsScreen()),
            GoRoute(path: '/products', builder: (context, state) => const ProductsScreen()),
            GoRoute(path: '/categories', builder: (context, state) => const CategoriesScreen()),
            GoRoute(path: '/orders', builder: (context, state) => const OrdersScreen()),
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
  const _AdminShell({required this.child});

  final Widget child;

  @override
  ConsumerState<_AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends ConsumerState<_AdminShell> {
  int _selectedIndex = 0;

  static const List<_NavItem> _items = [
    _NavItem(label: 'Dashboard', icon: Icons.dashboard_outlined, activeIcon: Icons.dashboard, route: '/'),
    _NavItem(label: 'Orders', icon: Icons.receipt_outlined, activeIcon: Icons.receipt, route: '/orders'),
    _NavItem(label: 'Products', icon: Icons.shopping_bag_outlined, activeIcon: Icons.shopping_bag, route: '/products'),
    _NavItem(label: 'Customers', icon: Icons.people_outlined, activeIcon: Icons.people, route: '/customers'),
  ];

  void _onItemTapped(int index) {
    setState(() => _selectedIndex = index);
    context.go(_items[index].route);
  }

  void _onDrawerItem(String route) {
    setState(() => _selectedIndex = _items.indexWhere((i) => i.route == route));
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
    ref.read(fcmServiceProvider).refreshBadge();
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
            ..._items.map((item) {
              final active = _selectedIndex == _items.indexOf(item) ||
                  ModalRoute.of(context)?.settings.name == item.route;
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
            }).toList(),
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
                if (mounted) context.go('/login');
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
        currentIndex: _selectedIndex.clamp(0, _items.length - 1),
        onTap: _onItemTapped,
        items: _items
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
