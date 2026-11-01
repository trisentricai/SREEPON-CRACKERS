import 'package:sreepon_admin/core/utils/format.dart';
import 'orders.dart';

class Customer {
  const Customer({
    required this.id,
    required this.email,
    this.name,
    this.phone,
    required this.status,
    required this.isActive,
    required this.createdAt,
    this.orderCount,
    this.addressCount,
  });

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as String,
      email: json['email'] as String?,
      name: json['name'] as String?,
      phone: json['phone'] as String?,
      status: json['status'] as String?,
      isActive: (json['isActive'] ?? false) as bool,
      createdAt: json['createdAt'] as String?,
      orderCount: json['orderCount'] as int?,
      addressCount: json['addressCount'] as int?,
    );
  }

  final String id;
  final String? email;
  final String? name;
  final String? phone;
  final String? status;
  final bool isActive;
  final String? createdAt;
  final int? orderCount;
  final int? addressCount;
}

class CustomerListResponse {
  const CustomerListResponse({required this.items, required this.pagination});

  factory CustomerListResponse.fromJson(Map<String, dynamic> json) {
    return CustomerListResponse(
      items: (json['items'] as List<dynamic>)
          .map((e) => Customer.fromJson(e as Map<String, dynamic>))
          .toList(),
      pagination: Pagination.fromJson(json['pagination'] as Map<String, dynamic>),
    );
  }

  final List<Customer> items;
  final Pagination pagination;
}
