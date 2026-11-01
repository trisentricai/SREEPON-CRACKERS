import 'package:sreepon_admin/core/utils/format.dart';

class StoreSettings {
  const StoreSettings({
    required this.name,
    this.tagline,
    this.supportPhone,
    this.whatsappNumber,
  });

  factory StoreSettings.fromJson(Map<String, dynamic> json) {
    return StoreSettings(
      name: json['name'] as String?,
      tagline: json['tagline'] as String?,
      supportPhone: json['supportPhone'] as String?,
      whatsappNumber: json['whatsappNumber'] as String?,
    );
  }

  final String? name;
  final String? tagline;
  final String? supportPhone;
  final String? whatsappNumber;
}

class DeliverySettings {
  const DeliverySettings({
    required this.deliveryFee,
    this.freeDeliveryThreshold,
    this.estimatedDays,
  });

  factory DeliverySettings.fromJson(Map<String, dynamic> json) {
    return DeliverySettings(
      deliveryFee: (json['deliveryFee'] ?? '0.00').toString(),
      freeDeliveryThreshold: (json['freeDeliveryThreshold'] ?? '0.00').toString(),
      estimatedDays: json['estimatedDays'] as String?,
    );
  }

  final String deliveryFee;
  final String? freeDeliveryThreshold;
  final String? estimatedDays;
}

class TaxSettings {
  const TaxSettings({
    required this.enabled,
    required this.rate,
    this.gstin,
  });

  factory TaxSettings.fromJson(Map<String, dynamic> json) {
    return TaxSettings(
      enabled: (json['enabled'] ?? false) as bool,
      rate: (json['rate'] ?? 0) as int,
      gstin: json['gstin'] as String?,
    );
  }

  final bool enabled;
  final int rate;
  final String? gstin;
}

class SocialSettings {
  const SocialSettings({
    this.facebookUrl,
    this.instagramUrl,
    this.whatsappNumber,
  });

  factory SocialSettings.fromJson(Map<String, dynamic> json) {
    return SocialSettings(
      facebookUrl: json['facebookUrl'] as String?,
      instagramUrl: json['instagramUrl'] as String?,
      whatsappNumber: json['whatsappNumber'] as String?,
    );
  }

  final String? facebookUrl;
  final String? instagramUrl;
  final String? whatsappNumber;
}

class LegalSettings {
  const LegalSettings({
    this.privacyPolicy,
    this.termsOfService,
    this.shippingPolicy,
    this.returnsPolicy,
    this.refundPolicy,
    this.cancellationPolicy,
  });

  factory LegalSettings.fromJson(Map<String, dynamic> json) {
    return LegalSettings(
      privacyPolicy: json['privacyPolicy'] as String?,
      termsOfService: json['termsOfService'] as String?,
      shippingPolicy: json['shippingPolicy'] as String?,
      returnsPolicy: json['returnsPolicy'] as String?,
      refundPolicy: json['refundPolicy'] as String?,
      cancellationPolicy: json['cancellationPolicy'] as String?,
    );
  }

  final String? privacyPolicy;
  final String? termsOfService;
  final String? shippingPolicy;
  final String? returnsPolicy;
  final String? refundPolicy;
  final String? cancellationPolicy;
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
    return SettingsView(
      store: StoreSettings.fromJson(json['store'] as Map<String, dynamic>),
      delivery: DeliverySettings.fromJson(json['delivery'] as Map<String, dynamic>),
      tax: TaxSettings.fromJson(json['tax'] as Map<String, dynamic>),
      social: SocialSettings.fromJson(json['social'] as Map<String, dynamic>),
      legal: LegalSettings.fromJson(json['legal'] as Map<String, dynamic>),
    );
  }

  final StoreSettings store;
  final DeliverySettings delivery;
  final TaxSettings tax;
  final SocialSettings social;
  final LegalSettings legal;
}
