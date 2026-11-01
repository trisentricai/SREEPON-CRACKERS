import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/analytics.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/analytics/analytics_charts.dart';
import 'package:sreepon_admin/features/analytics/analytics_provider.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final range = ref.watch(analyticsRangeProvider);
    final async = ref.watch(analyticsProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Analytics',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: SreeponAdminTheme.slate900,
                              )),
                      const SizedBox(height: 4),
                      Text('Sales rate, top products, and category performance.',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SreeponAdminTheme.slate600)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 7, label: Text('7d')),
                      ButtonSegment(value: 30, label: Text('30d')),
                      ButtonSegment(value: 90, label: Text('90d')),
                    ],
                    selected: {range},
                    onSelectionChanged: (s) => ref.read(analyticsRangeProvider.notifier).state = s.first,
                  ),
                ),
              ],
            ),
          ),
          async.when(
            data: (data) => _buildContent(context, data),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load analytics',
                onRetry: () => ref.refresh(analyticsProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, AnalyticsData d) {
    return SliverPadding(
      padding: const EdgeInsets.all(16),
      sliver: SliverList(
        delegate: SliverChildListDelegate([
          // Revenue line chart
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Revenue (paid orders)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      const Spacer(),
                      Text(formatMoney(d.revenue.isEmpty ? '0' : d.revenue.last.revenue), style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: SreeponAdminTheme.flame600)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(height: 240, child: RevenueLineChart(points: d.revenue)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Orders bar chart (paid vs unpaid)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text('Orders (paid vs unpaid)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                      const Spacer(),
                      Text('${d.orders.fold<int>(0, (a, p) => a + p.orders)} total', style: const TextStyle(fontSize: 14, color: SreeponAdminTheme.slate600)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(height: 240, child: OrdersBarChart(points: d.orders)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Top products + category performance side by side
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Top products by units sold', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 12),
                        SizedBox(height: 320, child: TopProductsChart(products: d.topProducts)),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Category performance (revenue)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                        const SizedBox(height: 12),
                        SizedBox(height: 320, child: CategoriesChart(categories: d.categories)),
                        const SizedBox(height: 12),
                        PieLegend(categories: d.categories),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ]),
      ),
    );
  }
}
