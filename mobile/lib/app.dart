import 'package:flutter/material.dart';

import '../features/shell/presentation/shell_screen.dart';

/// Sreepon customer app — root widget.
///
/// The [ShellScreen] owns the MaterialApp, theme, and routes so pushed detail
/// screens (product, wishlist, checkout, order) share the whole navigator.
class SreeponApp extends StatelessWidget {
  const SreeponApp({super.key});

  /// Single source of truth for the customer-facing brand name.
  static const String displayName = 'Sreepon';

  @override
  Widget build(BuildContext context) {
    return const ShellScreen();
  }
}