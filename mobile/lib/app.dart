import 'package:flutter/material.dart';

import '../features/shell/presentation/shell_screen.dart';

/// SriPon customer app — root widget.
///
/// The [ShellScreen] owns the MaterialApp, theme, and routes so pushed detail
/// screens (product, wishlist, checkout, order) share the whole navigator.
class SriPonApp extends StatelessWidget {
  const SriPonApp({super.key});

  /// Single source of truth for the customer-facing brand name.
  static const String displayName = 'SriPon';

  @override
  Widget build(BuildContext context) {
    return const ShellScreen();
  }
}