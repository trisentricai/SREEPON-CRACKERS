/// Sticker-book primitives — playful family-friendly design system for the
/// Flutter app. Mirrors web/src/components/sticker-ui.tsx: chunky 2px ink
/// borders, hard offset shadows, candy fills, Baloo 2 display type.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'widgets.dart';

/// Hard offset shadow used by every sticker surface (zero blur).
List<BoxShadow> stickerShadow({double dx = 4, double dy = 4}) => [
      BoxShadow(color: SriPonColors.ink, offset: Offset(dx, dy)),
    ];

/// Sticker card shell — white, ink border, hard shadow, bubble radius.
class StickerCard extends StatelessWidget {
  const StickerCard({super.key, required this.child, this.padding, this.color});

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color ?? Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: SriPonColors.ink, width: 2),
        boxShadow: stickerShadow(),
      ),
      child: child,
    );
  }
}

/// Chunky pill button with ink border + hard shadow + squish press.
class ChunkyButton extends StatelessWidget {
  const ChunkyButton({
    super.key,
    required this.label,
    this.onPressed,
    this.icon,
    this.color = SriPonColors.sunny,
    this.foreground = SriPonColors.ink,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final Color color;
  final Color foreground;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(999),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 13),
          decoration: BoxDecoration(
            color: onPressed == null ? color.withValues(alpha: 0.55) : color,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: SriPonColors.ink, width: 2),
            boxShadow: stickerShadow(),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 18, color: foreground),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(color: foreground, fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// 12-point starburst badge for discounts and callouts.
class Starburst extends StatelessWidget {
  const Starburst({super.key, required this.label, this.sub, this.size = 88});

  final String label;
  final String? sub;
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Padding(
            padding: const EdgeInsets.all(3),
            child: CustomPaint(painter: _BurstPainter()),
          ),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  label,
                  textAlign: TextAlign.center,
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(color: SriPonColors.ink, fontWeight: FontWeight.w800, height: 1),
                ),
                if (sub != null)
                  Text(
                    sub!,
                    style: Theme.of(context)
                        .textTheme
                        .labelSmall
                        ?.copyWith(color: SriPonColors.ink, fontWeight: FontWeight.w700),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _BurstPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final path = Path();
    final cx = size.width / 2;
    final cy = size.height / 2;
    final outer = size.width / 2;
    final inner = outer * 0.77;
    for (var i = 0; i < 24; i++) {
      final angle = -math.pi / 2 + i * math.pi / 12;
      final r = i.isEven ? outer : inner;
      final x = cx + r * math.cos(angle);
      final y = cy + r * math.sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    canvas.drawPath(
      path,
      Paint()
        ..color = SriPonColors.ink
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..strokeJoin = StrokeJoin.round,
    );
    canvas.drawPath(path, Paint()..color = SriPonColors.sunny);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Wavy section divider (fill any candy tint).
class WaveDivider extends StatelessWidget {
  const WaveDivider({super.key, this.fill = SriPonColors.sunny100, this.height = 34});

  final Color fill;
  final double height;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: height,
      child: CustomPaint(painter: _WavePainter(fill)),
    );
  }
}

class _WavePainter extends CustomPainter {
  _WavePainter(this.fill);

  final Color fill;

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final path = Path()
      ..moveTo(0, h * 0.53)
      ..cubicTo(w * 0.17, h * 1.0, w * 0.33, 0, w * 0.5, h * 0.53)
      ..cubicTo(w * 0.67, h * 1.06, w * 0.83, h * 0.13, w, h * 0.53)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
    canvas.drawPath(path, Paint()..color = fill);
  }

  @override
  bool shouldRepaint(covariant _WavePainter oldDelegate) => oldDelegate.fill != fill;
}

/// Poppy the rocket — widget-composed mascot for heroes and empty states.
class Mascot extends StatelessWidget {
  const Mascot({super.key, this.size = 120});

  final double size;

  @override
  Widget build(BuildContext context) {
    final w = size;
    final h = size * 1.15;
    return SizedBox(
      width: w,
      height: h,
      child: Stack(
        children: [
          // flame
          Positioned(
            left: w / 2 - 11,
            bottom: 0,
            child: Container(
              width: 22,
              height: 22,
              decoration: BoxDecoration(
                color: SriPonColors.sunny,
                shape: BoxShape.circle,
                border: Border.all(color: SriPonColors.ink, width: 3),
              ),
            ),
          ),
          // fins
          Positioned(
            left: w * 0.13,
            top: h * 0.5,
            child: Transform.rotate(
              angle: 0.5,
              child: Container(
                width: 20,
                height: 30,
                decoration: BoxDecoration(
                  color: SriPonColors.sunny,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: SriPonColors.ink, width: 3),
                ),
              ),
            ),
          ),
          Positioned(
            right: w * 0.13,
            top: h * 0.5,
            child: Transform.rotate(
              angle: -0.5,
              child: Container(
                width: 20,
                height: 30,
                decoration: BoxDecoration(
                  color: SriPonColors.sunny,
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: SriPonColors.ink, width: 3),
                ),
              ),
            ),
          ),
          // body
          Positioned(
            left: w * 0.275,
            top: h * 0.06,
            child: Container(
              width: w * 0.45,
              height: h * 0.68,
              decoration: BoxDecoration(
                color: SriPonColors.coral500,
                borderRadius: BorderRadius.vertical(
                  top: Radius.circular(w * 0.225),
                  bottom: const Radius.circular(10),
                ),
                border: Border.all(color: SriPonColors.ink, width: 3),
              ),
              child: Center(
                child: Container(
                  width: 26,
                  height: 26,
                  decoration: BoxDecoration(
                    color: SriPonColors.bubble100,
                    shape: BoxShape.circle,
                    border: Border.all(color: SriPonColors.ink, width: 3),
                  ),
                  alignment: Alignment.topLeft,
                  padding: const EdgeInsets.all(4),
                  child: Container(
                    width: 7,
                    height: 7,
                    decoration: const BoxDecoration(
                      color: SriPonColors.bubble,
                      shape: BoxShape.circle,
                    ),
                  ),
                ),
              ),
            ),
          ),
          // sparkles
          const Positioned(
            left: 2,
            top: 14,
            child: Icon(Icons.auto_awesome, size: 18, color: SriPonColors.sunny),
          ),
          const Positioned(
            right: 4,
            top: 34,
            child: Icon(Icons.auto_awesome, size: 14, color: SriPonColors.grape),
          ),
        ],
      ),
    );
  }
}

/// Pastel sticker chip with ink border (trust chips, category bubbles).
class FunChip extends StatelessWidget {
  const FunChip({super.key, required this.icon, required this.label, this.color = SriPonColors.sunny100});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: SriPonColors.ink, width: 2),
        boxShadow: stickerShadow(dx: 2, dy: 2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: SriPonColors.ink),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context)
                .textTheme
                .labelMedium
                ?.copyWith(color: SriPonColors.ink, fontWeight: FontWeight.w800),
          ),
        ],
      ),
    );
  }
}

/// Playful section heading — rotated sticker overline + Baloo 2 title.
class FunHeading extends StatelessWidget {
  const FunHeading({super.key, required this.title, this.subtitle, this.overline});

  final String title;
  final String? subtitle;
  final String? overline;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (overline != null) ...[
          Transform.rotate(
            angle: -0.02,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: SriPonColors.sunny,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: SriPonColors.ink, width: 2),
                boxShadow: stickerShadow(dx: 2, dy: 2),
              ),
              child: Text(
                overline!.toUpperCase(),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: SriPonColors.ink,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.4,
                    ),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
        Text(
          title,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(
            subtitle!,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(color: SriPonColors.inkMuted, fontWeight: FontWeight.w600),
          ),
        ],
      ],
    );
  }
}
