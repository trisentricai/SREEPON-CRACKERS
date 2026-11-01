import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/coupons.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

final couponsProvider = FutureProvider<CouponListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/coupons',
    query: {'page': 1, 'limit': 20},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return CouponListResponse.fromJson(data);
});

class CouponsScreen extends ConsumerWidget {
  const CouponsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(couponsProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'Coupons',
              subtitle: 'Promo codes and discounts',
              trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.refresh(couponsProvider)),
            ),
          ),
          async.when(
            data: (resp) => _buildList(context, resp),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load coupons',
                onRetry: () => ref.refresh(couponsProvider),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
    );
  }

  Widget _buildList(BuildContext context, CouponListResponse resp) {
    if (resp.items.isEmpty) {
      return const SliverFillRemaining(
        child: EmptyState(title: 'No coupons yet.', icon: Icons.local_offer_outlined),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final coupon = resp.items[index];
          final expired = coupon.isExpired;
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: ListTile(
              leading: const CircleAvatar(child: Icon(Icons.local_offer)),
              title: Text(coupon.code, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text('${coupon.discountType ?? 'discount'} ${formatMoney(coupon.discountValue)}', style: const TextStyle(fontSize: 13, color: SreeponAdminTheme.slate600)),
                  const SizedBox(height: 4),
                  Text('min order ${formatMoney(coupon.minOrderAmount)} · used ${coupon.usedCount}/${coupon.usageLimit}', style: const TextStyle(fontSize: 11, color: SreeponAdminTheme.slate500)),
                ],
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (expired || !coupon.isActive)
                    const StatusChip(text: 'Inactive', tone: 'slate')
                  else
                    const StatusChip(text: 'Active', tone: 'green'),
                  const SizedBox(height: 6),
                  Switch(value: coupon.isActive, onChanged: (_) {}, activeColor: SreeponAdminTheme.flame600),
                ],
              ),
            ),
          );
        },
        childCount: resp.items.length,
      ),
    );
  }
}
