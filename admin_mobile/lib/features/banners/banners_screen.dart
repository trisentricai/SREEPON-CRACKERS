import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/banners.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

final bannersProvider = FutureProvider<BannerListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/banners',
    query: {'page': 1, 'limit': 20},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return BannerListResponse.fromJson(data);
});

class BannersScreen extends ConsumerWidget {
  const BannersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(bannersProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'Banners',
              subtitle: 'Homepage and placement banners',
              trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.refresh(bannersProvider)),
            ),
          ),
          async.when(
            data: (resp) => _buildList(context, resp),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load banners',
                onRetry: () => ref.refresh(bannersProvider),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
    );
  }

  Widget _buildList(BuildContext context, BannerListResponse resp) {
    if (resp.items.isEmpty) {
      return const SliverFillRemaining(
        child: EmptyState(title: 'No banners yet.', icon: Icons.image_outlined),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final banner = resp.items[index];
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: ListTile(
              leading: banner.imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(banner.imageUrl!, width: 56, height: 56, fit: BoxFit.cover),
                    )
                  : const CircleAvatar(child: Icon(Icons.image_outlined)),
              title: Text(banner.title ?? 'Untitled', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text('${banner.placement ?? '-'} · order #{banner.displayOrder}', style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate600)),
                ],
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  StatusChip(text: banner.isActive ? 'Active' : 'Inactive', tone: banner.isActive ? 'green' : 'slate'),
                  const SizedBox(height: 6),
                  Switch(value: banner.isActive, onChanged: (_) {}, activeColor: SreeponAdminTheme.flame600),
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
