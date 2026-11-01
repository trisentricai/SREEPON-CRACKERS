import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/notifications/fcm_service.dart';

class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    required this.isRead,
    required this.createdAt,
    this.route,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String,
      title: json['title'] as String,
      body: json['body'] as String?,
      isRead: (json['isRead'] ?? false) as bool,
      createdAt: json['createdAt'] as String?,
      route: (json['data'] as Map<String, dynamic>?)?['route'] as String?,
    );
  }

  final String id;
  final String title;
  final String? body;
  final bool isRead;
  final String? createdAt;
  final String? route;
}

final notificationsProvider = FutureProvider<List<NotificationItem>>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/notifications',
    query: {'page': 1, 'limit': 50},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  final items = (data['items'] as List<dynamic>)
      .map((e) => NotificationItem.fromJson(e as Map<String, dynamic>))
      .toList();
  return items;
});

class NotificationCentreScreen extends ConsumerStatefulWidget {
  const NotificationCentreScreen({super.key});

  @override
  ConsumerState<NotificationCentreScreen> createState() => _NotificationCentreScreenState();
}

class _NotificationCentreScreenState extends ConsumerState<NotificationCentreScreen> {
  Future<void> _markRead(String id) async {
    await api.patch(
      path: '/admin/notifications/$id/read',
      fromJson: (json) => json,
    );
    ref.refresh(notificationsProvider);
    ref.read(unreadCountProvider.notifier).state =
        (ref.read(unreadCountProvider) > 0 ? ref.read(unreadCountProvider) - 1 : 0);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(notificationsProvider);
    final unread = ref.watch(unreadCountProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Row(
                children: [
                  Text('Notifications',
                      style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                            fontWeight: FontWeight.w700,
                            color: SreeponAdminTheme.slate900,
                          )),
                  const Spacer(),
                  if (unread > 0)
                    TextButton.icon(
                      onPressed: () async {
                        await api.patch(
                          path: '/admin/notifications/read-all',
                          fromJson: (json) => json,
                        );
                        ref.refresh(notificationsProvider);
                        ref.read(unreadCountProvider.notifier).state = 0;
                      },
                      label: const Text('Mark all read'),
                      icon: const Icon(Icons.mark_as_unread, size: 18),
                    ),
                ],
              ),
            ),
          ),
          async.when(
            data: (items) => _buildList(context, items),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load notifications',
                onRetry: () => ref.refresh(notificationsProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(BuildContext context, List<NotificationItem> items) {
    if (items.isEmpty) {
      return const SliverFillRemaining(
        child: EmptyState(title: 'No notifications yet.', icon: Icons.notifications_none),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final item = items[index];
          return _NotificationRow(item: item, onMarkRead: _markRead);
        },
        childCount: items.length,
      ),
    );
  }
}

class _NotificationRow extends StatelessWidget {
  const _NotificationRow({required this.item, required this.onMarkRead});

  final NotificationItem item;
  final Future<void> Function(String) onMarkRead;

  @override
  Widget build(BuildContext context) {
    final isRead = item.isRead;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        leading: Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(
            color: isRead ? SreeponAdminTheme.slate300 : SreeponAdminTheme.flame600,
            shape: BoxShape.circle,
          ),
        ),
        title: Text(item.title,
            style: TextStyle(
              fontWeight: isRead ? FontWeight.normal : FontWeight.w700,
              color: isRead ? SreeponAdminTheme.slate600 : SreeponAdminTheme.slate900,
            )),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text(item.body ?? '', style: const TextStyle(fontSize: 13, color: Colors.grey)),
            const SizedBox(height: 4),
            Text(formatDate(item.createdAt), style: const TextStyle(fontSize: 11, color: Colors.grey)),
          ],
        ),
        trailing: isRead ? null : const Icon(Icons.mark_unread_chat_alt, color: Colors.grey),
        onTap: () => onMarkRead(item.id),
      ),
    );
  }
}
