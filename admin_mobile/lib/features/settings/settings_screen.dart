import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/settings.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/settings/settings_provider.dart';

/// Store configuration served to the storefront — mirror of the web admin
/// settings page (store, delivery, tax, social links and legal policies).
class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _storeName = TextEditingController();
  final _currency = TextEditingController();
  final _tagline = TextEditingController();
  final _supportEmail = TextEditingController();
  final _supportPhone = TextEditingController();

  final _deliveryFee = TextEditingController();
  final _freeShippingAbove = TextEditingController();
  final _deliveryNote = TextEditingController();

  final _taxRate = TextEditingController();
  final _gstin = TextEditingController();

  final _facebook = TextEditingController();
  final _instagram = TextEditingController();
  final _youtube = TextEditingController();
  final _tiktok = TextEditingController();
  final _whatsapp = TextEditingController();

  final _policyTitle = TextEditingController();
  final _policyBody = TextEditingController();

  bool _maintenanceMode = false;
  bool _deliveryEnabled = true;
  bool _taxEnabled = false;
  bool _taxInclusive = false;
  bool _hydrated = false;
  bool _saving = false;

  String _activePolicy = 'privacy';
  final Map<String, LegalPolicy> _policies = {
    for (final key in legalPolicyKeys) key: LegalPolicy(title: legalPolicyLabels[key]!, body: ''),
  };

  @override
  void dispose() {
    for (final controller in [
      _storeName,
      _currency,
      _tagline,
      _supportEmail,
      _supportPhone,
      _deliveryFee,
      _freeShippingAbove,
      _deliveryNote,
      _taxRate,
      _gstin,
      _facebook,
      _instagram,
      _youtube,
      _tiktok,
      _whatsapp,
      _policyTitle,
      _policyBody,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  void _hydrate(SettingsView settings) {
    if (_hydrated) return;
    _storeName.text = settings.store.name;
    _currency.text = settings.store.currency;
    _tagline.text = settings.store.tagline;
    _supportEmail.text = settings.store.supportEmail;
    _supportPhone.text = settings.store.supportPhone;
    _maintenanceMode = settings.store.maintenanceMode;

    _deliveryEnabled = settings.delivery.enabled;
    _deliveryFee.text = settings.delivery.deliveryFee;
    _freeShippingAbove.text = settings.delivery.freeShippingAbove ?? '';
    _deliveryNote.text = settings.delivery.deliveryNote;

    _taxEnabled = settings.tax.enabled;
    _taxInclusive = settings.tax.taxInclusive;
    _taxRate.text = settings.tax.rate == settings.tax.rate.roundToDouble()
        ? settings.tax.rate.toInt().toString()
        : settings.tax.rate.toString();
    _gstin.text = settings.tax.gstin;

    _facebook.text = settings.social.facebookUrl;
    _instagram.text = settings.social.instagramUrl;
    _youtube.text = settings.social.youtubeUrl;
    _tiktok.text = settings.social.tiktokUrl;
    _whatsapp.text = settings.social.whatsappNumber;

    for (final key in legalPolicyKeys) {
      final policy = settings.legal.policies[key];
      _policies[key] = policy ?? LegalPolicy(title: legalPolicyLabels[key]!, body: '');
    }
    _showPolicy(_activePolicy);
    _hydrated = true;
  }

  void _showPolicy(String key) {
    final policy = _policies[key] ?? LegalPolicy(title: legalPolicyLabels[key]!, body: '');
    _policyTitle.text = policy.title;
    _policyBody.text = policy.body;
  }

  void _storePolicyDraft() {
    _policies[_activePolicy] = LegalPolicy(
      title: _policyTitle.text,
      body: _policyBody.text,
    );
  }

  Future<void> _save(Map<String, dynamic> body, String label) async {
    setState(() => _saving = true);
    try {
      await api.patch<Map<String, dynamic>>(
        path: '/admin/settings',
        body: body,
        fromJson: (json) => json as Map<String, dynamic>,
      );
      ref.invalidate(settingsProvider);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$label saved'), backgroundColor: SreeponAdminTheme.green600),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e is ApiException ? e.message : 'Save failed'),
          backgroundColor: SreeponAdminTheme.red600,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _saveStore() {
    return _save({
      'store': {
        'name': _storeName.text.trim(),
        'tagline': _tagline.text.trim(),
        'supportEmail': _supportEmail.text.trim(),
        'supportPhone': _supportPhone.text.trim(),
        'currency': _currency.text.trim().toUpperCase(),
        'maintenanceMode': _maintenanceMode,
      },
    }, 'Store settings');
  }

  Future<void> _saveDelivery() {
    final freeShipping = _freeShippingAbove.text.trim();
    return _save({
      'delivery': {
        'enabled': _deliveryEnabled,
        'deliveryFee': double.tryParse(_deliveryFee.text.trim()) ?? 0,
        'freeShippingAbove': freeShipping.isEmpty ? null : double.tryParse(freeShipping) ?? 0,
        'deliveryNote': _deliveryNote.text.trim(),
      },
    }, 'Delivery settings');
  }

  Future<void> _saveTax() {
    return _save({
      'tax': {
        'enabled': _taxEnabled,
        'rate': double.tryParse(_taxRate.text.trim()) ?? 0,
        'gstin': _gstin.text.trim().toUpperCase(),
        'taxInclusive': _taxInclusive,
      },
    }, 'Tax settings');
  }

  Future<void> _saveSocial() {
    String? value(TextEditingController controller) {
      final text = controller.text.trim();
      return text.isEmpty ? null : text;
    }

    return _save({
      'social': {
        'facebookUrl': value(_facebook),
        'instagramUrl': value(_instagram),
        'youtubeUrl': value(_youtube),
        'tiktokUrl': value(_tiktok),
        'whatsappNumber': value(_whatsapp),
      },
    }, 'Social links');
  }

  Future<void> _savePolicies() {
    _storePolicyDraft();
    return _save({
      'legal': {
        'policies': {
          for (final key in legalPolicyKeys)
            key: (_policies[key] ?? const LegalPolicy(title: '', body: '')).toJson(),
        },
      },
    }, 'Legal policies');
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(settingsProvider);

    return Scaffold(
      body: SafeArea(
        child: async.when(
          data: (settings) {
            _hydrate(settings);
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(settingsProvider),
              child: ListView(
                padding: const EdgeInsets.only(bottom: 96),
                children: [
                  SectionHeader(
                    title: 'Settings',
                    subtitle: 'Store, delivery, tax, social and legal configuration',
                    trailing: IconButton(
                      icon: const Icon(Icons.refresh),
                      tooltip: 'Refresh',
                      onPressed: () => ref.invalidate(settingsProvider),
                    ),
                  ),
                  _card('Store', [
                    _text(_storeName, 'Store name'),
                    _text(_currency, 'Currency', maxLength: 3, uppercase: true),
                    _text(_tagline, 'Tagline'),
                    _text(_supportEmail, 'Support email', keyboardType: TextInputType.emailAddress),
                    _text(_supportPhone, 'Support phone', keyboardType: TextInputType.phone),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _maintenanceMode,
                      onChanged: (v) => setState(() => _maintenanceMode = v),
                      activeThumbColor: SreeponAdminTheme.flame600,
                      title: const Text('Maintenance mode'),
                      subtitle: const Text('Temporarily hide the storefront'),
                    ),
                    _saveButton('Save store', _saveStore),
                  ]),
                  _card('Delivery', [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _deliveryEnabled,
                      onChanged: (v) => setState(() => _deliveryEnabled = v),
                      activeThumbColor: SreeponAdminTheme.flame600,
                      title: const Text('Delivery enabled'),
                    ),
                    _text(_deliveryFee, 'Delivery fee (₹)', keyboardType: const TextInputType.numberWithOptions(decimal: true)),
                    _text(
                      _freeShippingAbove,
                      'Free shipping above (₹)',
                      helper: 'Leave empty to disable',
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                    _text(_deliveryNote, 'Delivery note'),
                    _saveButton('Save delivery', _saveDelivery),
                  ]),
                  _card('Tax', [
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _taxEnabled,
                      onChanged: (v) => setState(() => _taxEnabled = v),
                      activeThumbColor: SreeponAdminTheme.flame600,
                      title: const Text('Tax enabled'),
                    ),
                    SwitchListTile(
                      contentPadding: EdgeInsets.zero,
                      value: _taxInclusive,
                      onChanged: (v) => setState(() => _taxInclusive = v),
                      activeThumbColor: SreeponAdminTheme.flame600,
                      title: const Text('Prices include tax'),
                    ),
                    _text(_taxRate, 'Rate (%)', keyboardType: const TextInputType.numberWithOptions(decimal: true)),
                    _text(
                      _gstin,
                      'GSTIN',
                      maxLength: 15,
                      uppercase: true,
                      helper: '15-character GST registration number',
                    ),
                    _saveButton('Save tax', _saveTax),
                  ]),
                  _card('Social links', [
                    _text(_facebook, 'Facebook URL', keyboardType: TextInputType.url),
                    _text(_instagram, 'Instagram URL', keyboardType: TextInputType.url),
                    _text(_youtube, 'YouTube URL', keyboardType: TextInputType.url),
                    _text(_tiktok, 'TikTok URL', keyboardType: TextInputType.url),
                    _text(_whatsapp, 'WhatsApp number', keyboardType: TextInputType.phone),
                    _saveButton('Save social', _saveSocial),
                  ]),
                  _legalCard(),
                ],
              ),
            );
          },
          loading: () => const Spinner(label: 'Loading settings…'),
          error: (e, _) => ErrorState(
            message: e is ApiException ? e.message : 'Failed to load settings',
            onRetry: () => ref.invalidate(settingsProvider),
          ),
        ),
      ),
    );
  }

  Widget _card(String title, List<Widget> children) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _text(
    TextEditingController controller,
    String label, {
    String? helper,
    int? maxLength,
    bool uppercase = false,
    TextInputType? keyboardType,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: TextField(
        controller: controller,
        keyboardType: keyboardType,
        maxLength: maxLength,
        inputFormatters: uppercase ? [UpperCaseTextFormatter()] : null,
        decoration: InputDecoration(
          labelText: label,
          helperText: helper,
          counterText: '',
        ),
      ),
    );
  }

  Widget _saveButton(String label, Future<void> Function() onPressed) {
    return Align(
      alignment: Alignment.centerRight,
      child: FilledButton(
        onPressed: _saving ? null : onPressed,
        child: _saving
            ? const SizedBox(
                width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(label),
      ),
    );
  }

  Widget _legalCard() {
    final policies = _policies;
    return _card('Legal policies', [
      const Text(
        'Published at /policies/<slug> and linked from the storefront footer. Write each page before taking live payments.',
        style: TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500),
      ),
      const SizedBox(height: 10),
      DropdownButtonFormField<String>(
        initialValue: _activePolicy,
        isExpanded: true,
        decoration: const InputDecoration(labelText: 'Policy'),
        items: legalPolicyKeys
            .map((key) => DropdownMenuItem(
                  value: key,
                  child: Text(policies[key]?.title.isNotEmpty == true
                      ? policies[key]!.title
                      : legalPolicyLabels[key]!),
                ))
            .toList(),
        onChanged: (value) {
          if (value == null || value == _activePolicy) return;
          _storePolicyDraft();
          setState(() {
            _activePolicy = value;
            _showPolicy(value);
          });
        },
      ),
      const SizedBox(height: 10),
      TextField(
        controller: _policyTitle,
        decoration: const InputDecoration(labelText: 'Page title'),
        onChanged: (_) => _storePolicyDraft(),
      ),
      const SizedBox(height: 10),
      TextField(
        controller: _policyBody,
        minLines: 8,
        maxLines: 16,
        textAlignVertical: TextAlignVertical.top,
        decoration: const InputDecoration(
          labelText: 'Body',
          alignLabelWithHint: true,
          helperText: 'Plain text. Blank line between paragraphs.',
        ),
        onChanged: (_) => _storePolicyDraft(),
      ),
      const SizedBox(height: 8),
      _saveButton('Save policies', _savePolicies),
    ]);
  }
}

/// Uppercases input as it is typed (currency codes, GSTIN).
class UpperCaseTextFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    return newValue.copyWith(text: newValue.text.toUpperCase());
  }
}
