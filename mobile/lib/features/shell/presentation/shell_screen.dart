import 'package:flutter/material.dart';
import 'package:sripon/app.dart';

/// Root shell that hosts the bottom navigation bar and keeps each destination
/// alive with [IndexedStack]. The five tabs map to the customer app's
/// top-level areas; placeholder screens render during the early phases and are
/// replaced by real feature implementations as the product phases ship.
class ShellScreen extends StatefulWidget {
  const ShellScreen({super.key});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
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
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.category_outlined),
            selectedIcon: Icon(Icons.category),
            label: 'Categories',
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_cart_outlined),
            selectedIcon: Icon(Icons.shopping_cart),
            label: 'Cart',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

/// Placeholder used by shell destinations until their feature lands.
/// Renders an honest "coming online in phase N" message — Phase 1 ships
/// navigable placeholder tabs; real feature screens replace these as the
/// product phases ship.
class PhasePlaceholderScreen extends StatelessWidget {
  const PhasePlaceholderScreen({
    super.key,
    required this.icon,
    required this.title,
    required this.phase,
  });

  final IconData icon;
  final String title;
  final int phase;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 56, color: theme.colorScheme.primary),
            const SizedBox(height: 16),
            Text('$title — coming online in Phase $phase', style: theme.textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              '${SriPonApp.displayName} is under active development.',
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const PhasePlaceholderScreen(icon: Icons.storefront, title: 'Home', phase: 3);
}

class CategoriesScreen extends StatelessWidget {
  const CategoriesScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const PhasePlaceholderScreen(icon: Icons.category, title: 'Categories', phase: 4);
}

class CartScreen extends StatelessWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const PhasePlaceholderScreen(icon: Icons.shopping_cart, title: 'Cart', phase: 5);
}

class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const PhasePlaceholderScreen(icon: Icons.receipt_long, title: 'Orders', phase: 8);
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) =>
      const PhasePlaceholderScreen(icon: Icons.person, title: 'Profile', phase: 10);
}