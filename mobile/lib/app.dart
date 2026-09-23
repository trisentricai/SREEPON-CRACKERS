import 'package:flutter/material.dart';

import '../features/shell/presentation/shell_screen.dart';

/// SriPon customer app — root widget.
///
/// Phase 1 ships a navigable shell with placeholder destinations; real feature
/// screens replace the placeholders as later phases land. Theming is Material 3
/// with a warm brand seed; the full brand/design system ships with the design
/// phase.
class SriPonApp extends StatelessWidget {
  const SriPonApp({super.key});

  /// Single source of truth for the customer-facing brand name.
  static const String displayName = 'SriPon';

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: displayName,
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFE65C00),
          brightness: Brightness.light,
        ),
      ),
      home: const ShellScreen(),
    );
  }
}