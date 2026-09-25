import 'package:flutter/material.dart';

/// Shared, dependency-free UI primitives for the SriPon Flutter shell.
/// Feature-specific components are added by the mobile phases.

/// SriPon brand palette — single source of truth, byte-identical to the
/// web design tokens (web/src/index.css).
abstract final class SriPonColors {
  /// Vibrant brand ember (hero gradients, containers, festive accents).
  static const ember = Color(0xFFE65C00);
  static const ember100 = Color(0xFFFFE9D6);
  static const ember300 = Color(0xFFFFB77E);
  static const ember900 = Color(0xFF7A2D03);

  /// Action ember — filled buttons/selections (4.5:1 white text).
  static const emberDeep = Color(0xFFC2410C);

  /// Festive gold accent.
  static const gold = Color(0xFFD9A021);
  static const gold100 = Color(0xFFF9EFD4);
  static const gold900 = Color(0xFF5E3F00);

  /// Warm surfaces + ink.
  static const paper = Color(0xFFFFF8F0);
  static const paperStrong = Color(0xFFFFFDF8);
  static const ink = Color(0xFF241B16);
  static const inkMuted = Color(0xFF6F5A4C);
  static const line = Color(0xFFE8DDD0);

  /// Semantic status.
  static const success = Color(0xFF1B7A33);
  static const danger = Color(0xFFB3261E);

  /// Legacy aliases (kept for compatibility).
  static const saffron = ember;
  static const saffron600 = emberDeep;
}

/// Inline loading indicator used by buttons and refresh actions.
class SriPonSpinner extends StatelessWidget {
  const SriPonSpinner({super.key, this.size = 18, this.color = Colors.white});

  final double size;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(strokeWidth: 2.4, color: color),
    );
  }
}

/// Empty-state placeholder that keeps the shell usable before live data
/// arrives (browsing continues, cart/wishlist show honest empty content).
class SriPonEmptyState extends StatelessWidget {
  const SriPonEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: scheme.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 34, color: scheme.primary),
            ),
            const SizedBox(height: 18),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: SriPonColors.inkMuted),
            ),
            if (action != null) ...[const SizedBox(height: 20), action!],
          ],
        ),
      ),
    );
  }
}