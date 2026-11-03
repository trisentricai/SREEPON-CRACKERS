import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/coupons.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';

final couponsProvider = FutureProvider.autoDispose<CouponListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/coupons',
    query: {'page': 1, 'limit': 100},
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
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SectionHeader(
              title: 'Coupons',
              subtitle: 'Promo codes and discounts',
              trailing: IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: () => ref.invalidate(couponsProvider),
              ),
            ),
            Expanded(
              child: async.when(
                data: (resp) {
                  if (resp.items.isEmpty) {
                    return const EmptyState(
                      title: 'No coupons yet.',
                      subtitle: 'Tap “Add coupon” to create one.',
                      icon: Icons.local_offer_outlined,
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: () async => ref.invalidate(couponsProvider),
                    child: ListView.builder(
                      padding: const EdgeInsets.only(bottom: 96),
                      itemCount: resp.items.length,
                      itemBuilder: (context, index) {
                        final coupon = resp.items[index];
                        return _CouponRow(
                          coupon: coupon,
                          onEdit: () => _openForm(context, ref, coupon: coupon),
                          onDelete: () => _delete(context, ref, coupon),
                          onToggle: () => _toggle(context, ref, coupon),
                        );
                      },
                    ),
                  );
                },
                loading: () => const Spinner(label: 'Loading coupons…'),
                error: (e, _) => ErrorState(
                  message: e is ApiException ? e.message : 'Failed to load coupons',
                  onRetry: () => ref.invalidate(couponsProvider),
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(context, ref),
        icon: const Icon(Icons.add),
        label: const Text('Add coupon'),
      ),
    );
  }

  Future<void> _toggle(BuildContext context, WidgetRef ref, Coupon coupon) async {
    try {
      await api.patch<Map<String, dynamic>>(
        path: '/admin/coupons/${coupon.id}',
        body: {'isActive': !coupon.isActive},
        fromJson: (json) => json as Map<String, dynamic>,
      );
      ref.invalidate(couponsProvider);
    } catch (e) {
      if (context.mounted) _snack(context, e is ApiException ? e.message : 'Update failed');
    }
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Coupon coupon) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete coupon ${coupon.code}?'),
        content: const Text('Customers will no longer be able to redeem it.'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete', style: TextStyle(color: SreeponAdminTheme.red600)),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await api.delete('/admin/coupons/${coupon.id}');
      ref.invalidate(couponsProvider);
    } catch (e) {
      if (context.mounted) _snack(context, e is ApiException ? e.message : 'Delete failed');
    }
  }

  Future<void> _openForm(BuildContext context, WidgetRef ref, {Coupon? coupon}) async {
    final saved = await showDialog<bool>(
      context: context,
      builder: (_) => _CouponDialog(coupon: coupon),
    );
    if (saved == true) ref.invalidate(couponsProvider);
  }

  void _snack(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: SreeponAdminTheme.red600),
    );
  }
}

class _CouponRow extends StatelessWidget {
  const _CouponRow({
    required this.coupon,
    required this.onEdit,
    required this.onDelete,
    required this.onToggle,
  });

  final Coupon coupon;
  final VoidCallback onEdit;
  final VoidCallback onDelete;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    final inactive = coupon.isExpired || !coupon.isActive;
    final discount = coupon.discountType == 'PERCENTAGE'
        ? '${coupon.discountValue}% off'
        : '${formatMoney(coupon.discountValue)} off';

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 10, 4, 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const CircleAvatar(
              radius: 20,
              backgroundColor: SreeponAdminTheme.flame50,
              child: Icon(Icons.local_offer, color: SreeponAdminTheme.flame600, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(coupon.code,
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15, letterSpacing: 0.5)),
                  const SizedBox(height: 2),
                  Text(
                    [
                      discount,
                      'min ${formatMoney(coupon.minOrderAmount)}',
                      'used ${coupon.usedCount}/${coupon.usageLimit}',
                      if (coupon.expiresAt != null) 'expires ${formatDate(coupon.expiresAt)}',
                    ].join(' · '),
                    style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500),
                  ),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    children: [
                      StatusChip(
                        text: inactive ? (coupon.isExpired ? 'Expired' : 'Inactive') : 'Active',
                        tone: inactive ? 'slate' : 'green',
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              children: [
                Switch(
                  value: coupon.isActive,
                  onChanged: (_) => onToggle(),
                  activeThumbColor: SreeponAdminTheme.flame600,
                ),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: const Icon(Icons.edit_outlined, size: 20),
                      tooltip: 'Edit',
                      onPressed: onEdit,
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, size: 20, color: SreeponAdminTheme.red600),
                      tooltip: 'Delete',
                      onPressed: onDelete,
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CouponDialog extends StatefulWidget {
  const _CouponDialog({this.coupon});

  final Coupon? coupon;

  @override
  State<_CouponDialog> createState() => _CouponDialogState();
}

class _CouponDialogState extends State<_CouponDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _code;
  late final TextEditingController _value;
  late final TextEditingController _minOrder;
  late final TextEditingController _usageLimit;
  late final TextEditingController _perUserLimit;

  String _type = 'PERCENTAGE';
  bool _isActive = true;
  DateTime? _startAt;
  DateTime? _endAt;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final coupon = widget.coupon;
    _code = TextEditingController(text: coupon?.code ?? '');
    _value = TextEditingController(text: coupon?.discountValue ?? '');
    _minOrder = TextEditingController(text: coupon?.minOrderAmount ?? '');
    _usageLimit = TextEditingController(text: coupon == null ? '' : coupon.usageLimit.toString());
    _perUserLimit = TextEditingController(text: '1');
    _type = coupon?.discountType ?? 'PERCENTAGE';
    _isActive = coupon?.isActive ?? true;
    _startAt = _parseDate(coupon?.startsAt);
    _endAt = _parseDate(coupon?.expiresAt);
  }

  static DateTime? _parseDate(String? iso) {
    if (iso == null || iso.isEmpty) return null;
    return DateTime.tryParse(iso)?.toLocal();
  }

  @override
  void dispose() {
    _code.dispose();
    _value.dispose();
    _minOrder.dispose();
    _usageLimit.dispose();
    _perUserLimit.dispose();
    super.dispose();
  }

  Future<void> _pickDate({required bool start}) async {
    final now = DateTime.now();
    final initial = (start ? _startAt : _endAt) ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
    );
    if (picked == null) return;
    setState(() {
      if (start) {
        _startAt = picked;
      } else {
        _endAt = picked;
      }
    });
  }

  Future<void> _save() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _saving = true;
      _error = null;
    });

    final payload = <String, dynamic>{
      'code': _code.text.trim().toUpperCase(),
      'type': _type,
      'value': double.tryParse(_value.text.trim()) ?? 0,
      'perUserLimit': int.tryParse(_perUserLimit.text.trim()) ?? 1,
      'isActive': _isActive,
      if (_minOrder.text.trim().isNotEmpty) 'minOrderValue': double.tryParse(_minOrder.text.trim()) ?? 0,
      if (_usageLimit.text.trim().isNotEmpty) 'usageLimit': int.tryParse(_usageLimit.text.trim()),
      if (_startAt != null) 'startAt': _startAt!.toUtc().toIso8601String(),
      if (_endAt != null) 'endAt': _endAt!.toUtc().toIso8601String(),
    };

    try {
      if (widget.coupon == null) {
        await api.post<Map<String, dynamic>>(
          path: '/admin/coupons',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      } else {
        await api.patch<Map<String, dynamic>>(
          path: '/admin/coupons/${widget.coupon!.id}',
          body: payload,
          fromJson: (json) => json as Map<String, dynamic>,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = e is ApiException ? e.message : 'Save failed';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.coupon == null ? 'Add coupon' : 'Edit coupon'),
      content: SizedBox(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _code,
                  autofocus: true,
                  textCapitalization: TextCapitalization.characters,
                  inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9_-]'))],
                  decoration: const InputDecoration(labelText: 'Code *', hintText: 'FESTIVE10'),
                  validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  initialValue: _type,
                  decoration: const InputDecoration(labelText: 'Discount type'),
                  items: const [
                    DropdownMenuItem(value: 'PERCENTAGE', child: Text('Percentage')),
                    DropdownMenuItem(value: 'FIXED_AMOUNT', child: Text('Fixed amount')),
                  ],
                  onChanged: (value) => setState(() => _type = value ?? 'PERCENTAGE'),
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _value,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: _type == 'PERCENTAGE' ? 'Percent off *' : 'Amount off (₹) *',
                  ),
                  validator: (v) {
                    final value = double.tryParse(v?.trim() ?? '');
                    return (value == null || value <= 0) ? 'Enter a value greater than 0' : null;
                  },
                ),
                const SizedBox(height: 10),
                TextFormField(
                  controller: _minOrder,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(labelText: 'Minimum order value (₹)'),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _usageLimit,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Total uses'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _perUserLimit,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Per customer'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _pickDate(start: true),
                        child: Text(_startAt == null ? 'Start date' : formatDate(_startAt!.toIso8601String())),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _pickDate(start: false),
                        child: Text(_endAt == null ? 'End date' : formatDate(_endAt!.toIso8601String())),
                      ),
                    ),
                  ],
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  value: _isActive,
                  onChanged: (v) => setState(() => _isActive = v),
                  activeThumbColor: SreeponAdminTheme.flame600,
                  title: const Text('Active'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(_error!, style: const TextStyle(color: SreeponAdminTheme.red600)),
                ],
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.of(context).pop(false),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(
                  width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text(widget.coupon == null ? 'Create' : 'Save'),
        ),
      ],
    );
  }
}
