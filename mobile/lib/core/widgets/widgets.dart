import 'package:flutter/material.dart';

/// Shared, dependency-free UI primitives for the SriPon Flutter shell.
/// Feature-specific components are added by the mobile phases.

/// SriPon brand palette.
abstract final class SriPonColors {
  static const saffron = Color(0xFFE65C00);
  static const saffron600 = Color(0xFFCC5300);
  static const gold = Color(0xFFD9A021);
  static const paper = Color(0xFFFFF8F0);
  static const ink = Color(0xFF241B16);
  static const inkMuted = Color(0xFF6F5A4C);
  static const line = Color(0xFFE8DDD0);
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