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

  /// Festive coral accent (deep variants keep text/buttons AA) and its
  /// complementary teal — mirrored from web/src/index.css.
  static const coral100 = Color(0xFFFFE3DF);
  static const coral300 = Color(0xFFFF9D8F);
  static const coral500 = Color(0xFFFF6B5A);
  static const coral600 = Color(0xFFE8513F);
  static const coral700 = Color(0xFFC93A29);
  static const teal100 = Color(0xFFCCFBF1);
  static const teal400 = Color(0xFF2DD4BF);
  static const teal500 = Color(0xFF14B8A6);
  static const teal600 = Color(0xFF0D9488);
  static const teal700 = Color(0xFF0F766E);

  /// Candy — playful sticker-book secondaries, byte-mirrored from
  /// web/src/index.css. Sticker style pairs pastel fills with ink
  /// text + ink borders.
  static const sunny100 = Color(0xFFFFF3D1);
  static const sunny = Color(0xFFFFC531);
  static const bubble100 = Color(0xFFDDF0FF);
  static const bubble = Color(0xFF4AA8FF);
  static const grape100 = Color(0xFFEAE2FF);
  static const grape = Color(0xFF9B6BF3);
  static const mint100 = Color(0xFFD9F5E7);
  static const mint = Color(0xFF2FBF71);
  static const candy100 = Color(0xFFFFE3EE);
  static const candy = Color(0xFFFF7BAC);

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

/// Shimmering placeholder surface for skeletons (loading cards, image wells).
/// A soft ember highlight sweeps left→right over [SriPonColors.paperStrong].
class SriPonShimmer extends StatefulWidget {
  const SriPonShimmer({super.key, this.borderRadius = 8});

  final double borderRadius;

  @override
  State<SriPonShimmer> createState() => _SriPonShimmerState();
}

class _SriPonShimmerState extends State<SriPonShimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(milliseconds: 1300))..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = SriPonColors.line.withValues(alpha: 0.55);
    final glow = Colors.white.withValues(alpha: 0.85);
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return ShaderMask(
          blendMode: BlendMode.srcATop,
          shaderCallback: (bounds) => LinearGradient(
            colors: [base, glow, base],
            stops: const [0.35, 0.5, 0.65],
            transform: _SweepGradientTransform(index: _controller.value * 2),
          ).createShader(bounds),
          child: child,
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: base,
          borderRadius: BorderRadius.circular(widget.borderRadius),
        ),
      ),
    );
  }
}

class _SweepGradientTransform extends GradientTransform {
  const _SweepGradientTransform({required this.index});

  final double index;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) {
    return Matrix4.translationValues(bounds.width * (index - 1), 0, 0);
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