/// Order + payment models from `backend/src/modules/orders` + payments.
library;

import 'api_envelope.dart';
import 'commerce.dart';

enum OrderStatus {
  pending('PENDING'),
  confirmed('CONFIRMED'),
  processing('PROCESSING'),
  packed('PACKED'),
  shipped('SHIPPED'),
  outForDelivery('OUT_FOR_DELIVERY'),
  delivered('DELIVERED'),
  cancelled('CANCELLED'),
  returnRequested('RETURN_REQUESTED'),
  returned('RETURNED');

  const OrderStatus(this.wire);
  final String wire;

  static OrderStatus fromWire(String value) =>
      OrderStatus.values.firstWhere((s) => s.wire == value, orElse: () => OrderStatus.pending);
}

enum PaymentStatus {
  pending('PENDING'),
  paid('PAID'),
  failed('FAILED'),
  refunded('REFUNDED'),
  partiallyRefunded('PARTIALLY_REFUNDED');

  const PaymentStatus(this.wire);
  final String wire;

  static PaymentStatus fromWire(String value) =>
      PaymentStatus.values.firstWhere((s) => s.wire == value, orElse: () => PaymentStatus.pending);
}

class OrderItem {
  const OrderItem({
    required this.id,
    required this.productId,
    required this.productName,
    required this.productSlug,
    required this.sku,
    required this.unit,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
    required this.imageUrl,
  });

  final String id;
  final String? productId;
  final String productName;
  final String productSlug;
  final String sku;
  final String unit;
  final int quantity;
  final String unitPrice;
  final String lineTotal;
  final String? imageUrl;

  factory OrderItem.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for order item');
    }
    return OrderItem(
      id: requiredString(json['id'], 'orderItem.id'),
      productId: optionalString(json['productId']),
      productName: requiredString(json['productName'], 'orderItem.productName'),
      productSlug: requiredString(json['productSlug'], 'orderItem.productSlug'),
      sku: requiredString(json['sku'], 'orderItem.sku'),
      unit: requiredString(json['unit'], 'orderItem.unit'),
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      unitPrice: requiredString(json['unitPrice'], 'orderItem.unitPrice'),
      lineTotal: requiredString(json['lineTotal'], 'orderItem.lineTotal'),
      imageUrl: optionalString(json['imageUrl']),
    );
  }
}

class OrderPayment {
  const OrderPayment({
    required this.id,
    required this.provider,
    required this.amount,
    required this.status,
    required this.providerRefId,
    required this.paidAt,
    required this.createdAt,
  });

  final String id;
  final String provider;
  final String amount;
  final PaymentStatus status;
  final String? providerRefId;
  final String? paidAt;
  final String createdAt;

  factory OrderPayment.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for payment');
    }
    return OrderPayment(
      id: requiredString(json['id'], 'payment.id'),
      provider: requiredString(json['provider'], 'payment.provider'),
      amount: requiredString(json['amount'], 'payment.amount'),
      status: PaymentStatus.fromWire(json['status'] as String? ?? ''),
      providerRefId: optionalString(json['providerRefId']),
      paidAt: optionalString(json['paidAt']),
      createdAt: requiredString(json['createdAt'], 'payment.createdAt'),
    );
  }
}

class OrderReturnRequest {
  const OrderReturnRequest({
    required this.id,
    required this.productId,
    required this.reason,
    required this.status,
    required this.refundAmount,
    required this.resolvedAt,
    required this.createdAt,
  });

  final String id;
  final String? productId;
  final String reason;
  final String status;
  final String? refundAmount;
  final String? resolvedAt;
  final String createdAt;

  factory OrderReturnRequest.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for return request');
    }
    return OrderReturnRequest(
      id: requiredString(json['id'], 'returnRequest.id'),
      productId: optionalString(json['productId']),
      reason: requiredString(json['reason'], 'returnRequest.reason'),
      status: requiredString(json['status'], 'returnRequest.status'),
      refundAmount: optionalString(json['refundAmount']),
      resolvedAt: optionalString(json['resolvedAt']),
      createdAt: requiredString(json['createdAt'], 'returnRequest.createdAt'),
    );
  }
}

class OrderCoupon {
  const OrderCoupon({required this.id, required this.code});

  final String id;
  final String code;

  factory OrderCoupon.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for coupon');
    }
    return OrderCoupon(
      id: requiredString(json['id'], 'coupon.id'),
      code: requiredString(json['code'], 'coupon.code'),
    );
  }
}

/// Delivery address as stored on the order (inline summary).
class OrderAddress {
  const OrderAddress({
    required this.fullName,
    required this.phone,
    required this.line1,
    required this.line2,
    required this.city,
    required this.state,
    required this.pincode,
    required this.country,
  });

  final String fullName;
  final String phone;
  final String line1;
  final String? line2;
  final String city;
  final String state;
  final String pincode;
  final String country;

  factory OrderAddress.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for order address');
    }
    return OrderAddress(
      fullName: requiredString(json['fullName'], 'orderAddress.fullName'),
      phone: requiredString(json['phone'], 'orderAddress.phone'),
      line1: requiredString(json['line1'], 'orderAddress.line1'),
      line2: optionalString(json['line2']),
      city: requiredString(json['city'], 'orderAddress.city'),
      state: requiredString(json['state'], 'orderAddress.state'),
      pincode: requiredString(json['pincode'], 'orderAddress.pincode'),
      country: requiredString(json['country'], 'orderAddress.country'),
    );
  }
}

class Order {
  const Order({
    required this.id,
    required this.orderNumber,
    required this.status,
    required this.paymentStatus,
    required this.currency,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.deliveryFee,
    required this.grandTotal,
    required this.coupon,
    required this.address,
    required this.notes,
    required this.cancelReason,
    required this.cancelledAt,
    required this.deliveredAt,
    required this.createdAt,
    required this.updatedAt,
    required this.customer,
    required this.items,
    required this.payments,
    required this.returnRequests,
  });

  final String id;
  final String orderNumber;
  final OrderStatus status;
  final PaymentStatus paymentStatus;
  final String currency;
  final String subtotal;
  final String discount;
  final String tax;
  final String deliveryFee;
  final String grandTotal;
  final OrderCoupon? coupon;
  final OrderAddress? address;
  final String? notes;
  final String? cancelReason;
  final String? cancelledAt;
  final String? deliveredAt;
  final String createdAt;
  final String updatedAt;
  final PublicProfile? customer;
  final List<OrderItem> items;
  final List<OrderPayment> payments;
  final List<OrderReturnRequest> returnRequests;

  factory Order.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for order');
    }
    return Order(
      id: requiredString(json['id'], 'order.id'),
      orderNumber: requiredString(json['orderNumber'], 'order.orderNumber'),
      status: OrderStatus.fromWire(json['status'] as String? ?? ''),
      paymentStatus: PaymentStatus.fromWire(json['paymentStatus'] as String? ?? ''),
      currency: requiredString(json['currency'], 'order.currency'),
      subtotal: requiredString(json['subtotal'], 'order.subtotal'),
      discount: requiredString(json['discount'], 'order.discount'),
      tax: requiredString(json['tax'], 'order.tax'),
      deliveryFee: requiredString(json['deliveryFee'], 'order.deliveryFee'),
      grandTotal: requiredString(json['grandTotal'], 'order.grandTotal'),
      coupon: json['coupon'] != null ? OrderCoupon.fromJson(json['coupon']) : null,
      address: json['address'] != null ? OrderAddress.fromJson(json['address']) : null,
      notes: optionalString(json['notes']),
      cancelReason: optionalString(json['cancelReason']),
      cancelledAt: optionalString(json['cancelledAt']),
      deliveredAt: optionalString(json['deliveredAt']),
      createdAt: requiredString(json['createdAt'], 'order.createdAt'),
      updatedAt: requiredString(json['updatedAt'], 'order.updatedAt'),
      customer: json['customer'] != null ? PublicProfile.fromJson(json['customer']) : null,
      items: (json['items'] as List<dynamic>?)
              ?.map((item) => OrderItem.fromJson(item))
              .toList() ??
          const [],
      payments: (json['payments'] as List<dynamic>?)
              ?.map((payment) => OrderPayment.fromJson(payment))
              .toList() ??
          const [],
      returnRequests: (json['returnRequests'] as List<dynamic>?)
              ?.map((request) => OrderReturnRequest.fromJson(request))
              .toList() ??
          const [],
    );
  }
}

/// Order list response `{ items, pagination }`.
class OrderListResponse {
  const OrderListResponse({required this.result});

  final PageResult<Order> result;

  List<Order> get items => result.items;
  Pagination get pagination => result.pagination;

  factory OrderListResponse.fromJson(dynamic json) =>
      OrderListResponse(result: PageResult.fromJson<Order>(json, Order.fromJson));
}

/// Payment record with an optional gateway client payload.
class Payment {
  const Payment({
    required this.id,
    required this.orderId,
    required this.provider,
    required this.amount,
    required this.status,
    required this.providerRefId,
    required this.paidAt,
    required this.createdAt,
    required this.clientPayload,
  });

  final String id;
  final String orderId;
  final String provider;
  final String amount;
  final PaymentStatus status;
  final String? providerRefId;
  final String? paidAt;
  final String createdAt;
  final Map<String, dynamic>? clientPayload;

  bool get isCash => provider == 'cash';
  bool get isMock => provider == 'mock';

  factory Payment.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for payment');
    }
    final payload = json['clientPayload'];
    return Payment(
      id: requiredString(json['id'], 'payment.id'),
      orderId: requiredString(json['orderId'], 'payment.orderId'),
      provider: requiredString(json['provider'], 'payment.provider'),
      amount: requiredString(json['amount'], 'payment.amount'),
      status: PaymentStatus.fromWire(json['status'] as String? ?? ''),
      providerRefId: optionalString(json['providerRefId']),
      paidAt: optionalString(json['paidAt']),
      createdAt: requiredString(json['createdAt'], 'payment.createdAt'),
      clientPayload: payload is Map<String, dynamic>
          ? payload
          : null,
    );
  }
}

/// Invoice payload `{ invoiceNumber, issuedAt, order }` from `/orders/:id/invoice`.
class InvoiceData {
  const InvoiceData({required this.invoiceNumber, required this.issuedAt, required this.order});

  final String invoiceNumber;
  final String issuedAt;
  final Order order;

  factory InvoiceData.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for invoice');
    }
    return InvoiceData(
      invoiceNumber: requiredString(json['invoiceNumber'], 'invoice.invoiceNumber'),
      issuedAt: requiredString(json['issuedAt'], 'invoice.issuedAt'),
      order: Order.fromJson(json['order']),
    );
  }
}