/// Formatting helpers shared across the SriPon Flutter app.
///
/// Money arrives from the backend as 2dp strings; parsing is tolerant of both
/// strings and numbers. Kept dependency-free so the mobile app stays lean.
library;

const List<String> _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/// Format an amount (string "199.00", double, or int) as INR, e.g. ₹199.00.
String formatMoney(dynamic value) {
  if (value == null) return '—';
  final amount = double.tryParse(value.toString());
  if (amount == null) return '—';
  final formatted = amount.toStringAsFixed(2);
  return '₹$formatted';
}

/// Format an ISO-8601 timestamp to `dd MMM yyyy, hh:mm a`.
String formatDateTime(String? value) {
  final date = _parseDate(value);
  if (date == null) return '—';
  final hour12 = date.hour % 12 == 0 ? 12 : date.hour % 12;
  final minute = date.minute.toString().padLeft(2, '0');
  final period = date.hour < 12 ? 'am' : 'pm';
  return '${date.day.toString().padLeft(2, '0')} ${_months[date.month - 1]} '
      '${date.year}, $hour12:$minute $period';
}

/// Format an ISO-8601 timestamp to `dd MMM yyyy`.
String formatDate(String? value) {
  final date = _parseDate(value);
  if (date == null) return '—';
  return '${date.day.toString().padLeft(2, '0')} ${_months[date.month - 1]} ${date.year}';
}

/// Human label for a product unit enum value.
String formatUnit(String? unit) {
  if (unit == null || unit.isEmpty) return '—';
  final lower = unit.toLowerCase();
  return lower[0].toUpperCase() + lower.substring(1);
}

/// Discount-from-MRP percentage, or null when there is no viable MRP.
int? discountPercent(String? basePrice, String? mrpPrice) {
  final base = double.tryParse(basePrice ?? '');
  final mrp = double.tryParse(mrpPrice ?? '');
  if (base == null || mrp == null || base <= 0 || base >= mrp) return null;
  return (((mrp - base) / mrp) * 100).round();
}

DateTime? _parseDate(String? value) {
  if (value == null || value.isEmpty) return null;
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return null;
  return parsed.toLocal();
}