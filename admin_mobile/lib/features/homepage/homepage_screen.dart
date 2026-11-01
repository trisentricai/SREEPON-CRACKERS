import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/homepage.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/homepage/homepage_provider.dart';

class HomepageScreen extends ConsumerWidget {
  const HomepageScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(homepageProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'Homepage',
              subtitle: 'Manage homepage sections and config',
              trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.refresh(homepageProvider)),
            ),
          ),
          async.when(
            data: (resp) => _buildContent(context, resp),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load homepage',
                onRetry: () => ref.refresh(homepageProvider),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
    );
  }

  Widget _buildContent(BuildContext context, HomepageResponse resp) {
    return SliverPadding(
      padding: const EdgeInsets.all(16),
      sliver: SliverList(
        delegate: SliverChildListDelegate([
          // Config header
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Homepage config', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          decoration: const InputDecoration(labelText: 'Hero title'),
                          controller: TextEditingController(text: resp.config.heroTitle ?? ''),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          decoration: const InputDecoration(labelText: 'Hero tagline'),
                          controller: TextEditingController(text: resp.config.heroTagline ?? ''),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Sections list
          ...resp.sections.map((section) => _sectionCard(context, section)),
        ]),
      ),
    );
  }

  Widget _sectionCard(BuildContext context, HomepageSection s) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ListTile(
        leading: CircleAvatar(
          child: Text(_sectionIcon(s.type)),
        ),
        title: Text(s.title ?? s.type.value.replaceAll('_', ' '), style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text('order #${s.displayOrder} · ${s.isActive ? 'Active' : 'Inactive'}', style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate600)),
          ],
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            StatusChip(text: s.isActive ? 'Active' : 'Inactive', tone: s.isActive ? 'green' : 'slate'),
            const SizedBox(height: 6),
            Switch(value: s.isActive, onChanged: (_) {}, activeColor: SreeponAdminTheme.flame600),
          ],
        ),
      ),
    );
  }

  String _sectionIcon(HomepageSectionType t) {
    switch (t) {
      case HomepageSectionType.hero:
        return '🦸';
      case HomepageSectionType.featuredProducts:
        return '⭐';
      case HomepageSectionType.categoryGrid:
        return '📦';
      case HomepageSectionType.bestSellers:
        return '🏆';
      case HomepageSectionType.trendingProducts:
        return '🔥';
      case HomepageSectionType.offers:
        return '🎁';
    }
  }
}
