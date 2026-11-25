import 'package:flutter/material.dart';

/// Shared, dependency-free UI primitives for the SriPon Flutter shell.
/// Feature-specific components are added by the mobile phases.

/// SriPon brand palette — single source of truth for the customer app.
///
/// The values below are the Apple/Morrow-style mockup tokens chosen for the
/// mobile redesign. Legacy static names are intentionally retained so every
/// existing call site keeps compiling; the new semantic aliases are preferred
/// in new code.
abstract final class SriPonColors {
  // ── Mockup core tokens ────────────────────────────────────────────────────
  /// Page background.
  static const bg = Color(0xFFFFFFFF);
  static const surface = Color(0xFFF5F5F7);
  static const surfaceWarm = Color(0xFFFBFBFD);
  static const fg = Color(0xFF1D1D1F);
  static const muted = Color(0xFF6E6E73);
  static const line = Color(0xFFD2D2D7);
  static const accent = Color(0xFF0071E3);
  static const accentSoft = Color(0xFFEAF3FF);
  static const accentDeep = Color(0xFF005BBB);
  static const successSoft = Color(0xFFE7F6EE);
  static const warning = Color(0xFFB45309);

  /// Translucent "glass" white used by the sticky header and bottom nav.
  static const glass = Color(0xDBFFFFFF); // white @ .86

  // ── Legacy names (remapped to the mockup palette) ────────────────────────
  /// Neutral raised surface (legacy ember name).
  static const ember = Color(0xFFF5F5F7);
  static const ember100 = Color(0xFFFBFBFD);
  static const ember300 = Color(0xFFD2D2D7);
  static const ember900 = Color(0xFF1D1D1F);

  /// Secondary text / quiet actions.
  static const emberDeep = Color(0xFF6E6E73);

  /// Blue accent (legacy gold name).
  static const gold = Color(0xFF0071E3);
  static const gold100 = Color(0xFFEAF3FF);
  static const gold900 = Color(0xFF005BBB);

  /// White paper + ink.
  static const paper = Color(0xFFFFFFFF);
  static const paperStrong = Color(0xFFFFFFFF);
  static const ink = Color(0xFF1D1D1F);
  static const inkMuted = Color(0xFF6E6E73);

  /// Primary blue family.
  static const flame100 = Color(0xFFEAF3FF);
  static const flame300 = Color(0xFFA8D0FF);
  static const flame500 = Color(0xFF0071E3);
  static const flame600 = Color(0xFF0071E3);
  static const flame700 = Color(0xFF005BBB);

  /// Secondary blue family.
  static const indigo100 = Color(0xFFEAF3FF);
  static const indigo400 = Color(0xFF6FB3FF);
  static const indigo500 = Color(0xFF0071E3);
  static const indigo600 = Color(0xFF0071E3);
  static const indigo700 = Color(0xFF005BBB);

  /// Semantic status.
  static const success = Color(0xFF0B7D4B);
  static const danger = Color(0xFFB42318);

  /// Legacy aliases (kept for compatibility).
  static const saffron = ember;
  static const saffron600 = emberDeep;
}

/// Mockup shape + layout tokens for shared use across feature screens.
abstract final class SriPonMetrics {
  static const double appPadding = 18;
  static const double navHeight = 72;
  static const double cardRadius = 24;
  static const double rowRadius = 16;
  static const double touchTarget = 44;
  static const double displayTracking = -0.015;
}

/// Inline loading indicator used by buttons and refresh actions.
class SriPonSpinner extends StatelessWidget {
  const SriPonSpinner({super.key, this.size = 18, this.color = SriPonColors.muted});

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

/// Neutral shimmer placeholder for skeletons (loading cards, image wells).
/// A soft white highlight sweeps left→right over [SriPonColors.surface].
/// The sweep is disabled when the user has requested reduced motion.
class SriPonShimmer extends StatefulWidget {
  const SriPonShimmer({super.key, this.borderRadius = 8});

  final double borderRadius;

  @override
  State<SriPonShimmer> createState() => _SriPonShimmerState();
}

class _SriPonShimmerState extends State<SriPonShimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1300),
  );
  bool _reduceMotion = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _reduceMotion = MediaQuery.disableAnimationsOf(context);
    if (_reduceMotion) {
      if (_controller.isAnimating) _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const base = SriPonColors.surface;
    if (_reduceMotion) {
      return Container(
        decoration: BoxDecoration(
          color: base,
          borderRadius: BorderRadius.circular(widget.borderRadius),
        ),
      );
    }
    final glow = Colors.white.withValues(alpha: 0.9);
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
/// Rendered as a neutral card with a small blue icon tile.
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
    return Center(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 24, 18, 32),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(20, 22, 20, 22),
          decoration: BoxDecoration(
            color: SriPonColors.surfaceWarm,
            borderRadius: BorderRadius.circular(SriPonMetrics.cardRadius),
            border: Border.all(color: SriPonColors.line),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: SriPonColors.accentSoft,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, size: 22, color: SriPonColors.accent),
              ),
              const SizedBox(height: 14),
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(fontSize: 18),
              ),
              const SizedBox(height: 6),
              Text(
                message,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: SriPonColors.muted, fontSize: 13),
              ),
              if (action != null) ...[const SizedBox(height: 18), action!],
            ],
          ),
        ),
      ),
    );
  }
}

/// Iconly ships no minus/remove glyph, so quantity steppers draw this single
/// dash instead. It inherits the ambient [IconTheme] colour and occupies the
/// same square box as a Material [Icon] so it drops into stepper buttons.
class SriPonMinusIcon extends StatelessWidget {
  const SriPonMinusIcon({super.key, this.size = 24});

  final double size;

  @override
  Widget build(BuildContext context) {
    final color = IconTheme.of(context).color ?? Theme.of(context).colorScheme.onSurface;
    return SizedBox(
      width: size,
      height: size,
      child: Center(
        child: Container(
          width: size * 0.5,
          height: 1.6,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(1),
          ),
        ),
      ),
    );
  }
}
