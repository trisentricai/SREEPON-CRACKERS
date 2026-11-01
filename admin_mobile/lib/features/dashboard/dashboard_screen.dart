import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

class DashboardMetrics {
  const DashboardMetrics({
    required this.revenue,
    required this.paidOrders,
    required this.averageOrderValue,
    required this.totalOrders,
    required this.customers,
    required this.newCustomersLast30Days,
    required this.activeProducts,
    required this.pendingOrdersCount,
    required this.outOfStockCount,
    required this.lowStockCount,
  });

  factory DashboardMetrics.fromJson(Map<String, dynamic> json) {
    return DashboardMetrics(
      revenue: (json['revenue'] ?? '0.00').toString(),
      paidOrders: (json['paidOrders'] ?? 0) as int,
      averageOrderValue: (json['averageOrderValue'] ?? '0.00').toString(),
      totalOrders: (json['totalOrders'] ?? 0) as int,
      customers: (json['customers'] ?? 0) as int,
      newCustomersLast30Days: (json['newCustomersLast30Days'] ?? 0) as int,
      activeProducts: (json['activeProducts'] ?? 0) as int,
      pendingOrdersCount: (json['pendingOrdersCount'] ?? 0) as int,
      outOfStockCount: (json['outOfStockCount'] ?? 0) as int,
      lowStockCount: (json['lowStockCount'] ?? 0) as int,
    );
  }

  final String revenue;
  final int paidOrders;
  final String averageOrderValue;
  final int totalOrders;
  final int customers;
  final int newCustomersLast30Days;
  final int activeProducts;
  final int pendingOrdersCount;
  final int outOfStockCount;
  final int lowStockCount;
}

/// Provider that fetches the dashboard KPIs from the backend.
final dashboardProvider = FutureProvider<DashboardMetrics>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/analytics/dashboard',
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return DashboardMetrics.fromJson(data);
});

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dashboardProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Dashboard',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: SreeponAdminTheme.slate900,
                          )),
                  const SizedBox(height: 4),
                  Text('Overview of store performance, orders, and inventory.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SreeponAdminTheme.slate600)),
                ],
              ),
            ),
          ),
          async.when(
            data: (metrics) => _buildContent(context, metrics),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load dashboard',
                onRetry: () => ref.refresh(dashboardProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, DashboardMetrics m) {
    final items = [
      _stat('Total revenue (paid)', formatMoney(m.revenue), Icons.attach_money, SreeponAdminTheme.green600),
      _stat('Total orders', '${m.totalOrders}', Icons.receipt_outlined, null, hint: '${m.paidOrders} paid'),
      _stat('Avg. order value', formatMoney(m.averageOrderValue), Icons.trending_up, null),
      _stat('Customers', '${m.customers}', Icons.people_outlined, null,
          hint: '${m.newCustomersLast30Days} new in 30 days'),
      _stat('Active products', '${m.activeProducts}', Icons.inventory_outlined, null),
      _stat('Pending orders', '${m.pendingOrdersCount}', Icons.access_time, SreeponAdminTheme.amber600,
          hint: 'awaiting fulfilment'),
      _stat('Low stock', '${m.lowStockCount}', Icons.inventory_2, SreeponAdminTheme.flame600,
          hint: 'at or below threshold'),
      _stat('Out of stock', '${m.outOfStockCount}', Icons.block, SreeponAdminTheme.red600),
    ];

    return SliverPadding(
      padding: const EdgeInsets.all(16),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.5,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, index) => items[index],
          childCount: items.length,
        ),
      ),
    );
  }

  Widget _stat(String label, String value, IconData icon, Color? accent, {String? hint}) {
    return StatCard(label: label, value: value, hint: hint, accent: accent, icon: icon);
  }
}
