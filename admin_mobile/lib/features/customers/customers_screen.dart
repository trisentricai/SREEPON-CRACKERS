import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/customers.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

final customersProvider = FutureProvider<CustomerListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/customers',
    query: {'page': 1, 'limit': 20},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return CustomerListResponse.fromJson(data);
});

class CustomersScreen extends ConsumerWidget {
  const CustomersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(customersProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: SectionHeader(
              title: 'Customers',
              subtitle: 'Store accounts and order history',
              trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.refresh(customersProvider)),
            ),
          ),
          async.when(
            data: (resp) => _buildList(context, resp),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load customers',
                onRetry: () => ref.refresh(customersProvider),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList(BuildContext context, CustomerListResponse resp) {
    if (resp.items.isEmpty) {
      return const SliverFillRemaining(
        child: EmptyState(title: 'No customers yet.', icon: Icons.people_outlined),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final customer = resp.items[index];
          return _CustomerRow(customer: customer);
        },
        childCount: resp.items.length,
      ),
    );
  }
}

class _CustomerRow extends StatelessWidget {
  const _CustomerRow({required this.customer});

  final Customer customer;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ListTile(
        leading: const CircleAvatar(child: Icon(Icons.person_outlined)),
        title: Text(customer.name ?? customer.email ?? 'Unnamed', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(customer.email ?? '', style: const TextStyle(fontSize: 12, color: Colors.grey)),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text('${customer.orderCount ?? 0} orders', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            StatusChip(text: titleCase(customer.status ?? ''), tone: 'slate'),
          ],
        ),
      ),
    );
  }
}
