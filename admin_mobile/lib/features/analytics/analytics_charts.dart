import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:sreepon_admin/core/models/analytics.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

/// Vertical grid line style shared by time-series charts.
const _gridColor = Color(0xFFE2E8F0);

/// Revenue over time — line chart with filled area.
class RevenueLineChart extends StatelessWidget {
  const RevenueLineChart({super.key, required this.points});

  final List<RevenuePoint> points;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const EmptyState(title: 'No revenue data yet.', icon: Icons.attach_money);
    }

    final maxY = points.map((p) => double.tryParse(p.revenue) ?? 0).reduce((a, b) => a > b ? a : b);
    final top = maxY > 0 ? maxY * 1.2 : 100;

    return LineChart(
      LineChartData(
        gridData: FlGridData(show: true, drawVerticalLine: true, horizontalInterval: top / 5, verticalInterval: 1, getDrawingHorizontalLine: (value) => const FlLine(color: _gridColor, strokeWidth: 1), getDrawingVerticalLine: (value) => const FlLine(color: _gridColor, strokeWidth: 1)),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 24, interval: 1, getTitlesWidget: (value, meta) {
            if (value < 0 || value >= points.length) return const Text('');
            final p = points[value.toInt()];
            return SideTitleWidget(child: Text(formatDate(p.day), style: const TextStyle(fontSize: 10, color: SreeponAdminTheme.slate500)), axisSide: meta.axisSide, space: 8);
          })),
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 50, interval: top / 5, getTitlesWidget: (value, meta) {
            return SideTitleWidget(child: Text(formatMoney(value.toString()), style: const TextStyle(fontSize: 10, color: SreeponAdminTheme.slate500)), axisSide: meta.axisSide, space: 4);
          })),
        ),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: points.asMap().entries.map((e) => FlSpot(e.key.toDouble(), double.tryParse(e.value.revenue) ?? 0)).toList(),
            isCurved: true,
            color: SreeponAdminTheme.flame600,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(show: true, color: SreeponAdminTheme.flame600.withValues(alpha: 0.15)),
          ),
        ],
        lineTouchData: LineTouchData(enabled: true, touchTooltipData: LineTouchTooltipData(getTooltipItems: (touchedSpots) {
          return touchedSpots.map((spot) {
            final p = points[spot.x.toInt()];
            return LineTooltipItem('${formatMoney(p.revenue)}\n${p.day}', const TextStyle(color: Colors.white, fontSize: 11));
          }).toList();
        })),
      ),
      duration: const Duration(milliseconds: 300),
    );
  }
}

/// Orders over time — grouped bar chart (paid vs unpaid).
class OrdersBarChart extends StatelessWidget {
  const OrdersBarChart({super.key, required this.points});

  final List<OrdersPoint> points;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const EmptyState(title: 'No order data yet.', icon: Icons.receipt_outlined);
    }

    final maxY = points.map((p) => p.orders.toDouble()).reduce((a, b) => a > b ? a : b);
    final top = maxY > 0 ? maxY * 1.2 : 10.0;

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: top,
        barTouchData: BarTouchData(enabled: true, touchTooltipData: BarTouchTooltipData(getTooltipItem: (group, groupIndex, rod, rodIndex) {
          final p = points[groupIndex];
          final label = rodIndex == 0 ? 'Paid' : 'Unpaid';
          final value = rodIndex == 0 ? p.paid : p.unpaid;
          return BarTooltipItem('$label: $value\n${p.day}', const TextStyle(color: Colors.white, fontSize: 11));
        })),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 24, interval: 1, getTitlesWidget: (value, meta) {
            if (value < 0 || value >= points.length) return const Text('');
            return SideTitleWidget(child: Text(formatDate(points[value.toInt()].day), style: const TextStyle(fontSize: 10, color: SreeponAdminTheme.slate500)), axisSide: meta.axisSide, space: 8);
          })),
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 28, interval: top / 5, getTitlesWidget: (value, meta) {
            return SideTitleWidget(child: Text(value.toInt().toString(), style: const TextStyle(fontSize: 10, color: SreeponAdminTheme.slate500)), axisSide: meta.axisSide, space: 4);
          })),
        ),
        barGroups: points.asMap().entries.map((e) {
          final p = e.value;
          return BarChartGroupData(x: e.key, barRods: [
            BarChartRodData(toY: p.paid.toDouble(), color: SreeponAdminTheme.green600, width: 12, borderRadius: const BorderRadius.vertical(top: Radius.circular(4)), backDrawRodData: BackgroundBarChartRodData(show: true, toY: top)),
            BarChartRodData(toY: p.unpaid.toDouble(), color: SreeponAdminTheme.amber600, width: 12, borderRadius: const BorderRadius.vertical(top: Radius.circular(4)), backDrawRodData: BackgroundBarChartRodData(show: true, toY: top)),
          ]);
        }).toList(),
      ),
      duration: const Duration(milliseconds: 300),
    );
  }
}

/// Top products — horizontal bar chart.
class TopProductsChart extends StatelessWidget {
  const TopProductsChart({super.key, required this.products});

  final List<TopProduct> products;

  @override
  Widget build(BuildContext context) {
    if (products.isEmpty) {
      return const EmptyState(title: 'No product sales yet.', icon: Icons.shopping_bag_outlined);
    }

    final max = products.map((p) => p.units.toDouble()).reduce((a, b) => a > b ? a : b);
    final top = max > 0 ? max * 1.2 : 10.0;

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: top,
        titlesData: FlTitlesData(
          show: true,
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 90, interval: 1, getTitlesWidget: (value, meta) {
            if (value < 0 || value >= products.length) return const Text('');
            final p = products[products.length - 1 - value.toInt()];
            return SideTitleWidget(child: Text(p.name ?? p.productId, style: const TextStyle(fontSize: 10, color: SreeponAdminTheme.slate600), overflow: TextOverflow.ellipsis, maxLines: 1), axisSide: meta.axisSide, space: 8);
          })),
          bottomTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        barGroups: products.asMap().entries.map((e) {
          final p = e.value;
          final y = products.length - 1 - e.key;
          return BarChartGroupData(x: y, barRods: [
            BarChartRodData(toY: p.units.toDouble(), color: SreeponAdminTheme.indigo600, width: 18, borderRadius: const BorderRadius.horizontal(right: Radius.circular(4)), backDrawRodData: BackgroundBarChartRodData(show: true, toY: top)),
          ], showingTooltipIndicators: [0]);
        }).toList(),
        barTouchData: BarTouchData(enabled: true, touchTooltipData: BarTouchTooltipData(getTooltipItem: (group, groupIndex, rod, rodIndex) {
          final p = products[products.length - 1 - groupIndex];
          return BarTooltipItem('${p.units} units\n${formatMoney(p.revenue)}', const TextStyle(color: Colors.white, fontSize: 11));
        })),
      ),
      swapAnimationDuration: const Duration(milliseconds: 300),
    );
  }
}

/// Category performance — pie chart (top 5).
class CategoriesChart extends StatelessWidget {
  const CategoriesChart({super.key, required this.categories});

  final List<CategoryPerformance> categories;

  @override
  Widget build(BuildContext context) {
    if (categories.isEmpty) {
      return const EmptyState(title: 'No category data yet.', icon: Icons.category_outlined);
    }

    final top5 = categories.take(5).toList();
    final total = top5.fold<double>(0, (sum, c) => sum + (double.tryParse(c.revenue) ?? 0));
    if (total == 0) {
      return const Center(child: Text('No revenue to show', style: TextStyle(color: SreeponAdminTheme.slate500)));
    }

    const colors = [SreeponAdminTheme.flame600, SreeponAdminTheme.indigo600, SreeponAdminTheme.green600, SreeponAdminTheme.amber600, SreeponAdminTheme.slate600];

    return PieChart(
      PieChartData(
        centerSpaceRadius: 40,
        sections: top5.asMap().entries.map((e) {
          final c = e.value;
          final rev = double.tryParse(c.revenue) ?? 0;
          return PieChartSectionData(value: rev, color: colors[e.key % colors.length], title: '${(rev / total * 100).toStringAsFixed(0)}%', radius: 70, titleStyle: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold));
        }).toList(),
        sectionsSpace: 4,
        borderData: FlBorderData(show: false),
        pieTouchData: PieTouchData(enabled: true, touchCallback: (event, response) {}),
      ),
      duration: const Duration(milliseconds: 300),
    );
  }
}

/// Small legend chip for pie chart categories.
class PieLegend extends StatelessWidget {
  const PieLegend({super.key, required this.categories});

  final List<CategoryPerformance> categories;

  @override
  Widget build(BuildContext context) {
    final top5 = categories.take(5).toList();
    const colors = [SreeponAdminTheme.flame600, SreeponAdminTheme.indigo600, SreeponAdminTheme.green600, SreeponAdminTheme.amber600, SreeponAdminTheme.slate600];

    return Column(
      children: top5.asMap().entries.map((e) {
        final c = e.value;
        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Row(
            children: [
              Container(width: 12, height: 12, decoration: BoxDecoration(color: colors[e.key % colors.length], shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Text(c.name ?? c.slug ?? '', style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate700)),
              const Spacer(),
              Text(formatMoney(c.revenue), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: SreeponAdminTheme.slate900)),
            ],
          ),
        );
      }).toList(),
    );
  }
}
