/// Admin settings payload (`GET /admin/settings`).
///
/// Mirrors `backend/src/modules/settings/service.ts` — notably legal pages are
/// nested `legal.policies.<key>.{title,body}`, not flat fields.
class StoreSettings {
  const StoreSettings({
    required this.name,
    required this.tagline,
    required this.supportEmail,
    required this.supportPhone,
    required this.currency,
    required this.maintenanceMode,
  });

  factory StoreSettings.fromJson(Map<String, dynamic> json) {
    return StoreSettings(
      name: (json['name'] ?? '') as String,
      tagline: (json['tagline'] ?? '') as String,
      supportEmail: (json['supportEmail'] ?? '') as String,
      supportPhone: (json['supportPhone'] ?? '') as String,
      currency: (json['currency'] ?? 'INR') as String,
      maintenanceMode: json['maintenanceMode'] == true,
    );
  }

  final String name;
  final String tagline;
  final String supportEmail;
  final String supportPhone;
  final String currency;
  final bool maintenanceMode;
}

class DeliverySettings {
  const DeliverySettings({
    required this.enabled,
    required this.deliveryFee,
    required this.freeShippingAbove,
    required this.deliveryNote,
  });

  factory DeliverySettings.fromJson(Map<String, dynamic> json) {
    return DeliverySettings(
      enabled: json['enabled'] != false,
      deliveryFee: (json['deliveryFee'] ?? '0.00').toString(),
      freeShippingAbove: json['freeShippingAbove']?.toString(),
      deliveryNote: (json['deliveryNote'] ?? '') as String,
    );
  }

  final bool enabled;
  final String deliveryFee;
  final String? freeShippingAbove;
  final String deliveryNote;
}

class TaxSettings {
  const TaxSettings({
    required this.enabled,
    required this.rate,
    required this.gstin,
    required this.taxInclusive,
  });

  factory TaxSettings.fromJson(Map<String, dynamic> json) {
    return TaxSettings(
      enabled: json['enabled'] == true,
      rate: (json['rate'] as num?)?.toDouble() ?? 0,
      gstin: (json['gstin'] ?? '') as String,
      taxInclusive: json['taxInclusive'] == true,
    );
  }

  final bool enabled;
  final double rate;
  final String gstin;
  final bool taxInclusive;
}

class SocialSettings {
  const SocialSettings({
    required this.facebookUrl,
    required this.instagramUrl,
    required this.youtubeUrl,
    required this.tiktokUrl,
    required this.whatsappNumber,
  });

  factory SocialSettings.fromJson(Map<String, dynamic> json) {
    return SocialSettings(
      facebookUrl: (json['facebookUrl'] ?? '') as String,
      instagramUrl: (json['instagramUrl'] ?? '') as String,
      youtubeUrl: (json['youtubeUrl'] ?? '') as String,
      tiktokUrl: (json['tiktokUrl'] ?? '') as String,
      whatsappNumber: (json['whatsappNumber'] ?? '') as String,
    );
  }

  final String facebookUrl;
  final String instagramUrl;
  final String youtubeUrl;
  final String tiktokUrl;
  final String whatsappNumber;
}

class LegalPolicy {
  const LegalPolicy({required this.title, required this.body});

  factory LegalPolicy.fromJson(Map<String, dynamic> json) {
    return LegalPolicy(
      title: (json['title'] ?? '') as String,
      body: (json['body'] ?? '') as String,
    );
  }

  final String title;
  final String body;

  Map<String, dynamic> toJson() => {'title': title, 'body': body};
}

class LegalSettings {
  const LegalSettings({required this.policies});

  factory LegalSettings.fromJson(Map<String, dynamic> json) {
    final policies = json['policies'] is Map<String, dynamic>
        ? json['policies'] as Map<String, dynamic>
        : <String, dynamic>{};
    return LegalSettings(
      policies: {
        for (final entry in policies.entries)
          if (entry.value is Map<String, dynamic>)
            entry.key: LegalPolicy.fromJson(entry.value as Map<String, dynamic>),
      },
    );
  }

  final Map<String, LegalPolicy> policies;
}

class SettingsView {
  const SettingsView({
    required this.store,
    required this.delivery,
    required this.tax,
    required this.social,
    required this.legal,
  });

  factory SettingsView.fromJson(Map<String, dynamic> json) {
    Map<String, dynamic> group(String key) =>
        json[key] is Map<String, dynamic> ? json[key] as Map<String, dynamic> : <String, dynamic>{};
    return SettingsView(
      store: StoreSettings.fromJson(group('store')),
      delivery: DeliverySettings.fromJson(group('delivery')),
      tax: TaxSettings.fromJson(group('tax')),
      social: SocialSettings.fromJson(group('social')),
      legal: LegalSettings.fromJson(group('legal')),
    );
  }

  final StoreSettings store;
  final DeliverySettings delivery;
  final TaxSettings tax;
  final SocialSettings social;
  final LegalSettings legal;
}

/// Display order and labels for the legal policy editor, matching the web admin.
const legalPolicyKeys = <String>[
  'privacy',
  'terms',
  'shipping',
  'returns',
  'refund',
  'cancellation',
];

const legalPolicyLabels = <String, String>{
  'privacy': 'Privacy Policy',
  'terms': 'Terms of Service',
  'shipping': 'Shipping Policy',
  'returns': 'Returns Policy',
  'refund': 'Refund Policy',
  'cancellation': 'Cancellation Policy',
};
