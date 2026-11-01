import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/analytics.dart';
import 'package:sreepon_admin/core/network/api_client.dart';

final analyticsRangeProvider = StateProvider<int>((ref) => 30);

final analyticsProvider = FutureProvider<AnalyticsData>((ref) async {
  final days = ref.watch(analyticsRangeProvider);
  final revenue = await api.get<Map<String, dynamic>>(
    '/admin/analytics/revenue',
    query: {'days': days},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  final orders = await api.get<Map<String, dynamic>>(
    '/admin/analytics/orders',
    query: {'days': days},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  final topProducts = await api.get<Map<String, dynamic>>(
    '/admin/analytics/top-products',
    query: {'days': days, 'limit': 10},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  final categories = await api.get<Map<String, dynamic>>(
    '/admin/analytics/categories',
    query: {'days': days},
    fromJson: (json) => json as Map<String, dynamic>,
  );

  return AnalyticsData(
    revenue: (revenue['items'] as List<dynamic>)
        .map((e) => RevenuePoint.fromJson(e as Map<String, dynamic>))
        .toList(),
    orders: (orders['items'] as List<dynamic>)
        .map((e) => OrdersPoint.fromJson(e as Map<String, dynamic>))
        .toList(),
    topProducts: (topProducts['items'] as List<dynamic>)
        .map((e) => TopProduct.fromJson(e as Map<String, dynamic>))
        .toList(),
    categories: (categories['items'] as List<dynamic>)
        .map((e) => CategoryPerformance.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
});
