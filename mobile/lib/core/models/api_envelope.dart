/// API envelope + pagination mirroring the SriPon backend.
///
/// Source of truth is `backend/src/modules/*` (controllers/services) and the
/// contract in `docs/api.md`. Money is serialized as 2dp strings; IDs are
/// UUIDs. JSON body maps on the wire are `Map<String, dynamic>`.
library;

/// Standard SriPon API response envelope `{ success, message, data }`.
class ApiEnvelope<T> {
  const ApiEnvelope({
    required this.success,
    required this.message,
    required this.data,
    this.errors,
    this.code,
  });

  final bool success;
  final String message;
  final T data;
  final Map<String, List<String>>? errors;
  final String? code;

  static ApiEnvelope<T> fromJson<T>(
    Map<String, dynamic> json,
    T Function(Object? json) fromData,
  ) {
    return ApiEnvelope<T>(
      success: (json['success'] as bool?) ?? false,
      message: (json['message'] as String?) ?? '',
      data: fromData(json['data']),
      errors: (json['errors'] as Map<String, dynamic>?)
          ?.map((key, value) => MapEntry(
                key,
                (value as List<dynamic>).cast<String>(),
              )),
      code: json['code'] as String?,
    );
  }
}

/// Annotations/fields used while parsing dynamic JSON.
T asMap<T>(dynamic value, {required String field, T? fallback}) {
  if (value is Map<String, dynamic>) return value as T;
  if (value is Map) return Map<String, dynamic>.from(value) as T;
  if (fallback != null) return fallback;
  throw FormatException('Expected map for `$field`, got ${value.runtimeType}');
}

/// Nullable string with an explicit null pass-through.
String? optionalString(dynamic value) => value is String ? value : null;

/// Nullable double helper (money comes through as string or number).
double? optionalDouble(dynamic value) {
  if (value is num) return value.toDouble();
  if (value is String) return double.tryParse(value);
  return null;
}

/// Non-null double helper for required money/number fields.
double requiredDouble(dynamic value, String field) {
  final parsed = optionalDouble(value);
  if (parsed == null) throw FormatException('Expected number for `$field`');
  return parsed;
}

/// Non-null string helper for required text fields.
String requiredString(dynamic value, String field) {
  if (value is String) return value;
  throw FormatException('Expected string for `$field`');
}

/// Non-null integer helper for required integer fields.
int requiredInt(dynamic value, String field) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  throw FormatException('Expected integer for `$field`');
}

/// Pagination metadata on list endpoints.
class Pagination {
  const Pagination({required this.page, required this.limit, required this.total, required this.pages});

  final int page;
  final int limit;
  final int total;
  final int pages;

  factory Pagination.fromJson(dynamic json) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for pagination');
    }
    return Pagination(
      page: requiredInt(json['page'], 'pagination.page'),
      limit: requiredInt(json['limit'], 'pagination.limit'),
      total: requiredInt(json['total'], 'pagination.total'),
      pages: requiredInt(json['pages'], 'pagination.pages'),
    );
  }
}

/// List envelope with `{ items, pagination }`.
class PageResult<T> {
  const PageResult({required this.items, required this.pagination});

  final List<T> items;
  final Pagination pagination;

  static PageResult<T> fromJson<T>(
    dynamic json,
    T Function(dynamic json) fromItem,
  ) {
    if (json is! Map<String, dynamic>) {
      throw const FormatException('Expected map for page result');
    }
    final items = (json['items'] as List<dynamic>?)
            ?.map((item) => fromItem(item))
            .toList() ??
        <T>[];
    return PageResult<T>(
      items: items,
      pagination: json['pagination'] != null
          ? Pagination.fromJson(json['pagination'])
          : const Pagination(page: 1, limit: 0, total: 0, pages: 1),
    );
  }
}