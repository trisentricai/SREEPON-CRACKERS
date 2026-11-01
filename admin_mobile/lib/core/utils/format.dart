import 'package:intl/intl.dart';

/// Money formatting consistent with the web storefront.
String formatMoney(String? amount) {
  if (amount == null || amount.isEmpty) return '₹0.00';
  try {
    final value = num.parse(amount);
    final f = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);
    return f.format(value);
  } catch (_) {
    return '₹$amount';
  }
}

/// Format a plain number with comma grouping.
String formatNumber(num value) {
  return NumberFormat.compact(locale: 'en_IN').format(value);
}

/// Format an ISO-8601 date/time string to a short display string.
String formatDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  try {
    final dt = DateTime.parse(iso).toLocal();
    final f = DateFormat('dd MMM yyyy, hh:mm a');
    return f.format(dt);
  } catch (_) {
    return iso;
  }
}

/// Format just the date portion.
String formatDate(String? iso) {
  if (iso == null || iso.isEmpty) return '—';
  try {
    return DateFormat('dd MMM yyyy').format(DateTime.parse(iso).toLocal());
  } catch (_) {
    return iso;
  }
}

/// Capitalize the first letter.
String capitalize(String text) {
  if (text.isEmpty) return text;
  return text[0].toUpperCase() + text.substring(1);
}

/// Title-case a status string like "PENDING" -> "Pending".
String titleCase(String text) {
  return text.split(' ').map((w) => w.isEmpty ? w : capitalize(w.toLowerCase())).join(' ');
}
