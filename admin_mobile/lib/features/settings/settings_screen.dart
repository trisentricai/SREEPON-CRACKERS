import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/settings.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/settings/settings_provider.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final TextEditingController _storeNameController;
  late final TextEditingController _taglineController;
  late final TextEditingController _supportPhoneController;
  late final TextEditingController _whatsappController;
  late final TextEditingController _deliveryFeeController;
  late final TextEditingController _freeThresholdController;
  late final TextEditingController _estDaysController;
  late final TextEditingController _taxRateController;
  late final TextEditingController _gstinController;

  @override
  void initState() {
    super.initState();
    _storeNameController = TextEditingController();
    _taglineController = TextEditingController();
    _supportPhoneController = TextEditingController();
    _whatsappController = TextEditingController();
    _deliveryFeeController = TextEditingController();
    _freeThresholdController = TextEditingController();
    _estDaysController = TextEditingController();
    _taxRateController = TextEditingController();
    _gstinController = TextEditingController();
  }

  @override
  void dispose() {
    _storeNameController.dispose();
    _taglineController.dispose();
    _supportPhoneController.dispose();
    _whatsappController.dispose();
    _deliveryFeeController.dispose();
    _freeThresholdController.dispose();
    _estDaysController.dispose();
    _taxRateController.dispose();
    _gstinController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, _) {
        final async = ref.watch(settingsProvider);

        return Scaffold(
          body: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Settings',
                          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color: SreeponAdminTheme.slate900,
                              )),
                      const SizedBox(height: 4),
                      Text('Store, delivery, tax, social, and legal configuration.',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SreeponAdminTheme.slate600)),
                    ],
                  ),
                ),
              ),
              async.when(
                data: (settings) {
                  _storeNameController.text = settings.store.name ?? '';
                  _taglineController.text = settings.store.tagline ?? '';
                  _supportPhoneController.text = settings.store.supportPhone ?? '';
                  _whatsappController.text = settings.store.whatsappNumber ?? '';
                  _deliveryFeeController.text = settings.delivery.deliveryFee;
                  _freeThresholdController.text = settings.delivery.freeDeliveryThreshold ?? '';
                  _estDaysController.text = settings.delivery.estimatedDays ?? '';
                  _taxRateController.text = settings.tax.rate.toString();
                  _gstinController.text = settings.tax.gstin ?? '';
                  return _buildContent(context, settings, ref);
                },
                loading: () => const SliverFillRemaining(child: Spinner()),
                error: (e, _) => SliverFillRemaining(
                  child: ErrorState(
                    message: e is ApiException ? e.message : 'Failed to load settings',
                    onRetry: () => ref.refresh(settingsProvider),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildContent(BuildContext context, SettingsView s, WidgetRef ref) {
    return SliverPadding(
      padding: const EdgeInsets.all(16),
      sliver: SliverList(
        delegate: SliverChildListDelegate([
          _card(context, 'Store', [
            TextField(
              controller: _storeNameController,
              decoration: const InputDecoration(labelText: 'Store name'),
            ),
            TextField(
              controller: _taglineController,
              decoration: const InputDecoration(labelText: 'Tagline'),
            ),
            TextField(
              controller: _supportPhoneController,
              decoration: const InputDecoration(labelText: 'Support phone'),
            ),
            TextField(
              controller: _whatsappController,
              decoration: const InputDecoration(labelText: 'WhatsApp number'),
            ),
          ]),
          const SizedBox(height: 16),
          _card(context, 'Delivery', [
            TextField(
              controller: _deliveryFeeController,
              decoration: const InputDecoration(labelText: 'Delivery fee'),
              keyboardType: TextInputType.number,
            ),
            TextField(
              controller: _freeThresholdController,
              decoration: const InputDecoration(labelText: 'Free delivery threshold'),
              keyboardType: TextInputType.number,
            ),
            TextField(
              controller: _estDaysController,
              decoration: const InputDecoration(labelText: 'Est. delivery days'),
              keyboardType: TextInputType.number,
            ),
          ]),
          const SizedBox(height: 16),
          _card(context, 'Tax', [
            SwitchListTile(
              title: const Text('Tax enabled'),
              value: s.tax.enabled,
              onChanged: (_) {},
              activeColor: SreeponAdminTheme.flame600,
            ),
            TextField(
              controller: _taxRateController,
              decoration: const InputDecoration(labelText: 'Tax rate (%)'),
              keyboardType: TextInputType.number,
            ),
            TextField(
              controller: _gstinController,
              decoration: const InputDecoration(labelText: 'GSTIN'),
            ),
          ]),
          const SizedBox(height: 16),
          _card(context, 'Social', [
            TextField(
              controller: TextEditingController(text: s.social.facebookUrl ?? ''),
              decoration: const InputDecoration(labelText: 'Facebook URL'),
            ),
            TextField(
              controller: TextEditingController(text: s.social.instagramUrl ?? ''),
              decoration: const InputDecoration(labelText: 'Instagram URL'),
            ),
            TextField(
              controller: TextEditingController(text: s.social.whatsappNumber ?? ''),
              decoration: const InputDecoration(labelText: 'WhatsApp number'),
            ),
          ]),
          const SizedBox(height: 16),
          _card(context, 'Legal policies', [
            ListTile(
              title: const Text('Privacy Policy'),
              subtitle: Text(s.legal.privacyPolicy ?? 'Not set'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              title: const Text('Terms of Service'),
              subtitle: Text(s.legal.termsOfService ?? 'Not set'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              title: const Text('Shipping Policy'),
              subtitle: Text(s.legal.shippingPolicy ?? 'Not set'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              title: const Text('Returns Policy'),
              subtitle: Text(s.legal.returnsPolicy ?? 'Not set'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              title: const Text('Refund Policy'),
              subtitle: Text(s.legal.refundPolicy ?? 'Not set'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
            ListTile(
              title: const Text('Cancellation Policy'),
              subtitle: Text(s.legal.cancellationPolicy ?? 'Not set'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () {},
            ),
          ]),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              onPressed: () async {
                final input = {
                  'store': {
                    'name': _storeNameController.text,
                    'tagline': _taglineController.text.isEmpty ? null : _taglineController.text,
                    'supportPhone': _supportPhoneController.text.isEmpty ? null : _supportPhoneController.text,
                  },
                  'delivery': {
                    'deliveryFee': _deliveryFeeController.text,
                  },
                  'tax': {
                    'enabled': s.tax.enabled,
                    'rate': int.tryParse(_taxRateController.text) ?? s.tax.rate,
                  },
                };
                try {
                  await ref.read(settingsUpdateProvider(input).future);
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Settings saved'), backgroundColor: SreeponAdminTheme.green600),
                    );
                    ref.refresh(settingsProvider);
                  }
                } catch (e) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Save failed: $e'), backgroundColor: SreeponAdminTheme.red600),
                    );
                  }
                }
              },
              child: const Text('Save settings'),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _card(BuildContext context, String title, List<Widget> children) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}
