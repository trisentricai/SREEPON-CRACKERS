/// Settings + customer commerce models (settings, cart, wishlist, addresses,
/// orders, payments, profile) matching the customer-facing API surface.
library;

import 'api_envelope.dart';
import 'catalog.dart';

class StoreSettings {
  const StoreSettings({
    required this.name,
    required this.tagline,
    required this.supportEmail,
    required this.supportPhone,
    required this.currency,
    required this.maintenanceMode,
  });

  final String name;
  final String tagline;
  final String supportEmail;
  final String supportPhone;
  final String currency;
  final bool maintenanceMode;

  factory StoreSettings.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for store settings');
    }
    return StoreSettings(
      name: requiredString(json['name'], 'store.name'),
      tagline: requiredString(json['tagline'], 'store.tagline'),
      supportEmail: requiredString(json['supportEmail'], 'store.supportEmail'),
      supportPhone: requiredString(json['supportPhone'], 'store.supportPhone'),
      currency: requiredString(json['currency'], 'store.currency'),
      maintenanceMode: json['maintenanceMode'] as bool? ?? false,
    );
  }
}

class DeliverySettings {
  const DeliverySettings({
    required this.enabled,
    required this.deliveryFee,
    required this.freeShippingAbove,
    required this.deliveryNote,
  });

  final bool enabled;
  final String deliveryFee;
  final String? freeShippingAbove;
  final String deliveryNote;

  factory DeliverySettings.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for delivery settings');
    }
    return DeliverySettings(
      enabled: json['enabled'] as bool? ?? false,
      deliveryFee: requiredString(json['deliveryFee'], 'delivery.deliveryFee'),
      freeShippingAbove: optionalString(json['freeShippingAbove']),
      deliveryNote: requiredString(json['deliveryNote'], 'delivery.deliveryNote'),
    );
  }
}

class TaxSettings {
  const TaxSettings({
    required this.enabled,
    required this.rate,
    required this.gstin,
    required this.taxInclusive,
  });

  final bool enabled;
  final double rate;
  final String gstin;
  final bool taxInclusive;

  factory TaxSettings.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for tax settings');
    }
    return TaxSettings(
      enabled: json['enabled'] as bool? ?? false,
      rate: requiredDouble(json['rate'], 'tax.rate'),
      gstin: requiredString(json['gstin'], 'tax.gstin'),
      taxInclusive: json['taxInclusive'] as bool? ?? false,
    );
  }
}

class SocialSettings {
  const SocialSettings({
    required this.facebookUrl,
    required this.instagramUrl,
    required this.youtubeUrl,
    required this.tiktokUrl,
    required this.whatsappNumber,
  });

  final String? facebookUrl;
  final String? instagramUrl;
  final String? youtubeUrl;
  final String? tiktokUrl;
  final String? whatsappNumber;

  factory SocialSettings.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for social settings');
    }
    return SocialSettings(
      facebookUrl: optionalString(json['facebookUrl']),
      instagramUrl: optionalString(json['instagramUrl']),
      youtubeUrl: optionalString(json['youtubeUrl']),
      tiktokUrl: optionalString(json['tiktokUrl']),
      whatsappNumber: optionalString(json['whatsappNumber']),
    );
  }
}

class PublicSettings {
  const PublicSettings({
    required this.store,
    required this.delivery,
    required this.tax,
    required this.social,
  });

  final StoreSettings store;
  final DeliverySettings delivery;
  final TaxSettings tax;
  final SocialSettings social;

  factory PublicSettings.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for public settings');
    }
    return PublicSettings(
      store: StoreSettings.fromJson(json['store']),
      delivery: DeliverySettings.fromJson(json['delivery']),
      tax: TaxSettings.fromJson(json['tax']),
      social: SocialSettings.fromJson(json['social']),
    );
  }
}

class CartItemProduct {
  const CartItemProduct({
    required this.id,
    required this.name,
    required this.slug,
    required this.unit,
    required this.piecesPerBox,
    required this.basePrice,
    required this.mrpPrice,
    required this.imageUrl,
  });

  final String id;
  final String name;
  final String slug;
  final ProductUnit unit;
  final int? piecesPerBox;
  final String basePrice;
  final String? mrpPrice;
  final String? imageUrl;

  factory CartItemProduct.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for cart item product');
    }
    return CartItemProduct(
      id: requiredString(json['id'], 'cartProduct.id'),
      name: requiredString(json['name'], 'cartProduct.name'),
      slug: requiredString(json['slug'], 'cartProduct.slug'),
      unit: ProductUnit.fromWire(json['unit'] as String? ?? 'OTHER'),
      piecesPerBox: (json['piecesPerBox'] as num?)?.toInt(),
      basePrice: requiredString(json['basePrice'], 'cartProduct.basePrice'),
      mrpPrice: optionalString(json['mrpPrice']),
      imageUrl: optionalString(json['imageUrl']),
    );
  }
}

class CartItem {
  const CartItem({
    required this.id,
    required this.quantity,
    required this.unit,
    required this.availableStock,
    required this.isOutOfStock,
    required this.lineTotal,
    required this.product,
  });

  final String id;
  final int quantity;
  final CartUnit unit;
  final int availableStock;
  final bool isOutOfStock;
  final String lineTotal;
  final CartItemProduct product;

  factory CartItem.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for cart item');
    }
    return CartItem(
      id: requiredString(json['id'], 'cartItem.id'),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      unit: CartUnit.fromWire(json['unit'] as String? ?? 'BOX'),
      availableStock: (json['availableStock'] as num?)?.toInt() ?? 0,
      isOutOfStock: json['isOutOfStock'] as bool? ?? false,
      lineTotal: requiredString(json['lineTotal'], 'cartItem.lineTotal'),
      product: CartItemProduct.fromJson(json['product']),
    );
  }
}

class Cart {
  const Cart({
    required this.id,
    required this.items,
    required this.subtotal,
    required this.totalQuantity,
    required this.itemCount,
    required this.outOfStockCount,
  });

  final String id;
  final List<CartItem> items;
  final String subtotal;
  final int totalQuantity;
  final int itemCount;
  final int outOfStockCount;

  factory Cart.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for cart');
    }
    return Cart(
      id: requiredString(json['id'], 'cart.id'),
      items: (json['items'] as List<dynamic>?)
              ?.map((item) => CartItem.fromJson(item))
              .toList() ??
          const [],
      subtotal: requiredString(json['subtotal'], 'cart.subtotal'),
      totalQuantity: (json['totalQuantity'] as num?)?.toInt() ?? 0,
      itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
      outOfStockCount: (json['outOfStockCount'] as num?)?.toInt() ?? 0,
    );
  }
}

class WishlistItem {
  const WishlistItem({
    required this.id,
    required this.addedAt,
    required this.isAvailable,
    required this.availableStock,
    required this.product,
  });

  final String id;
  final String addedAt;
  final bool isAvailable;
  final int availableStock;
  final CartItemProduct product;

  factory WishlistItem.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for wishlist item');
    }
    return WishlistItem(
      id: requiredString(json['id'], 'wishlistItem.id'),
      addedAt: requiredString(json['addedAt'], 'wishlistItem.addedAt'),
      isAvailable: json['isAvailable'] as bool? ?? false,
      availableStock: (json['availableStock'] as num?)?.toInt() ?? 0,
      product: CartItemProduct.fromJson(json['product']),
    );
  }
}

class Address {
  const Address({
    required this.id,
    required this.label,
    required this.fullName,
    required this.phone,
    required this.line1,
    required this.line2,
    required this.city,
    required this.state,
    required this.pincode,
    required this.country,
    required this.isDefault,
  });

  final String id;
  final String label;
  final String fullName;
  final String phone;
  final String line1;
  final String? line2;
  final String city;
  final String state;
  final String pincode;
  final String country;
  final bool isDefault;

  factory Address.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for address');
    }
    return Address(
      id: requiredString(json['id'], 'address.id'),
      label: requiredString(json['label'], 'address.label'),
      fullName: requiredString(json['fullName'], 'address.fullName'),
      phone: requiredString(json['phone'], 'address.phone'),
      line1: requiredString(json['line1'], 'address.line1'),
      line2: optionalString(json['line2']),
      city: requiredString(json['city'], 'address.city'),
      state: requiredString(json['state'], 'address.state'),
      pincode: requiredString(json['pincode'], 'address.pincode'),
      country: requiredString(json['country'], 'address.country'),
      isDefault: json['isDefault'] as bool? ?? false,
    );
  }
}

/// Auth-gated orders door/order response.
class OrderSummary {
  const OrderSummary({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.paymentStatus,
    required this.grandTotal,
    required this.currency,
    required this.createdAt,
  });

  final String id;
  final String orderNumber;
  final String status;
  final String paymentStatus;
  final String grandTotal;
  final String currency;
  final String createdAt;

  factory OrderSummary.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for order summary');
    }
    return OrderSummary(
      id: requiredString(json['id'], 'order.id'),
      orderNumber: requiredString(json['orderNumber'], 'order.orderNumber'),
      status: requiredString(json['status'], 'order.status'),
      paymentStatus: requiredString(json['paymentStatus'], 'order.paymentStatus'),
      grandTotal: requiredString(json['grandTotal'], 'order.grandTotal'),
      currency: requiredString(json['currency'], 'order.currency'),
      createdAt: requiredString(json['createdAt'], 'order.createdAt'),
    );
  }
}

/// Salient fields of the authenticated customer profile.
class PublicProfile {
  const PublicProfile({
    required this.id,
    required this.email,
    required this.name,
    required this.phone,
    required this.avatarUrl,
    required this.isActive,
    required this.createdAt,
  });

  final String id;
  final String email;
  final String? name;
  final String? phone;
  final String? avatarUrl;
  final bool isActive;
  final String createdAt;

  factory PublicProfile.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for profile');
    }
    return PublicProfile(
      id: requiredString(json['id'], 'profile.id'),
      email: requiredString(json['email'], 'profile.email'),
      name: optionalString(json['name']),
      phone: optionalString(json['phone']),
      avatarUrl: optionalString(json['avatarUrl']),
      isActive: json['isActive'] as bool? ?? false,
      createdAt: requiredString(json['createdAt'], 'profile.createdAt'),
    );
  }
}
