import 'package:flutter/material.dart';
import 'package:flutter_iconly_plus/flutter_iconly_plus.dart';

import '../../../core/theme/sripon_theme.dart';
import '../../auth/presentation/profile_screen.dart';
import '../../cart/presentation/cart_screen.dart';
import '../../cart/presentation/checkout_screen.dart';
import '../../home/presentation/home_screen.dart';
import '../../orders/presentation/orders_screen.dart';
import '../../products/presentation/product_list_screen.dart';
import '../../wishlist/presentation/wishlist_screen.dart';

/// Root shell that hosts the bottom navigation bar and keeps each destination
/// alive with [IndexedStack]. The five tabs map to the customer app's
/// top-level areas. Pushed routes (product detail, wishlist, checkout, order
/// detail) are registered here too and reachable from any tab.
class ShellScreen extends StatelessWidget {
  const ShellScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SriPon',
      debugShowCheckedModeBanner: false,
      theme: SriPonTheme.light,
      onGenerateRoute: (settings) => _buildRoute(settings.name),
      home: const MainTabs(),
    );
  }

  Route<void>? _buildRoute(String? name) {
    Widget? screen;
    switch (name) {
      case '/wishlist':
        screen = const WishlistScreen();
      case '/checkout':
        screen = const CheckoutScreen();
      case '/orders':
        screen = const OrdersScreen();
      case '/products':
        screen = const ProductListScreen();
      case '/profile':
        screen = const ProfileScreen();
      case '/account/addresses':
        screen = const ProfileScreen();
      case '/account/orders':
        screen = const OrdersScreen();
    }
    if (screen == null) return null;
    return MaterialPageRoute(builder: (_) => screen!);
  }
}

class MainTabs extends StatefulWidget {
  const MainTabs({super.key});

  @override
  State<MainTabs> createState() => _MainTabsState();
}

class _MainTabsState extends State<MainTabs> {
  int _index = 0;

  static const _screens = <Widget>[
    HomeScreen(),
    CategoriesScreen(),
    CartScreen(),
    OrdersScreen(),
    ProfileScreen(),
  ];

  void _onDestinationSelected(int index) => setState(() => _index = index);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: _onDestinationSelected,
        destinations: const [
          NavigationDestination(
            icon: Icon(IconlyLight.home),
            selectedIcon: Icon(IconlyBold.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(IconlyLight.category),
            selectedIcon: Icon(IconlyBold.category),
            label: 'Shop',
          ),
          NavigationDestination(
            icon: Icon(IconlyLight.bag_2),
            selectedIcon: Icon(IconlyBold.bag_2),
            label: 'Cart',
          ),
          NavigationDestination(
            icon: Icon(IconlyLight.paper),
            selectedIcon: Icon(IconlyBold.paper),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(IconlyLight.user),
            selectedIcon: Icon(IconlyBold.user_2),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}

/// The Shop tab renders the full catalogue from the get-go (no placeholder).
class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const ProductListScreen();
  }
}