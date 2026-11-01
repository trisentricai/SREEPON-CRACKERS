import 'package:flutter/material.dart';

import '../theme/sreepon_admin_theme.dart';

/// Statistic card used on dashboard and analytics screens.
class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.label,
    required this.value,
    this.hint,
    this.accent,
    this.icon,
  });

  final String label;
  final String value;
  final String? hint;
  final Color? accent;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final accentColor = accent ?? SreeponAdminTheme.flame600;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                if (icon != null) ...[
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: accentColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(icon, size: 18, color: accentColor),
                  ),
                  const SizedBox(width: 10),
                ],
                const Spacer(),
              ],
            ),
            const SizedBox(height: 8),
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 6),
            Text(value, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w700)),
            if (hint != null && hint!.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(hint!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SreeponAdminTheme.slate500)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Generic empty state.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.title,
    this.subtitle,
    this.icon,
    this.action,
    this.actionLabel,
  });

  final String title;
  final String? subtitle;
  final IconData? icon;
  final VoidCallback? action;
  final String? actionLabel;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[
              Icon(icon, size: 64, color: SreeponAdminTheme.slate400),
              const SizedBox(height: 16),
            ],
            Text(title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(color: SreeponAdminTheme.slate700),
                textAlign: TextAlign.center),
            if (subtitle != null && subtitle!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(subtitle!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SreeponAdminTheme.slate500),
                  textAlign: TextAlign.center),
            ],
            if (action != null && actionLabel != null && actionLabel!.isNotEmpty) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                onPressed: action,
                label: Text(actionLabel!),
                icon: const Icon(Icons.refresh, size: 18),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Generic error state with retry.
class ErrorState extends StatelessWidget {
  const ErrorState({
    super.key,
    required this.message,
    this.onRetry,
  });

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 56, color: Colors.redAccent),
            const SizedBox(height: 12),
            Text(message,
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: SreeponAdminTheme.slate700),
                textAlign: TextAlign.center),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: onRetry,
                label: const Text('Try again'),
                icon: const Icon(Icons.refresh, size: 18),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Simple spinner overlay.
class Spinner extends StatelessWidget {
  const Spinner({super.key, this.label});

  final String? label;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const CircularProgressIndicator(),
          if (label != null && label!.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(label!, style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SreeponAdminTheme.slate600)),
          ],
        ],
      ),
    );
  }
}

/// Small status badge.
class Badge extends StatelessWidget {
  const Badge({
    super.key,
    required this.text,
    this.tone = 'slate',
  });

  final String text;
  final String tone;

  @override
  Widget build(BuildContext context) {
    final colors = {
      'green': SreeponAdminTheme.green600,
      'red': SreeponAdminTheme.red600,
      'amber': SreeponAdminTheme.amber600,
      'slate': SreeponAdminTheme.slate600,
      'indigo': SreeponAdminTheme.indigo600,
    };
    final color = colors[tone] ?? SreeponAdminTheme.slate600;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(text,
          style: TextStyle(
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w600,
          )),
    );
  }
}

/// Section header with title and optional trailing action.
class SectionHeader extends StatelessWidget {
  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.trailing,
  });

  final String title;
  final String? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: SreeponAdminTheme.slate900,
                          fontWeight: FontWeight.w700,
                        )),
                if (subtitle != null && subtitle!.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(subtitle!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SreeponAdminTheme.slate500)),
                ],
              ],
            ),
          ),
          if (trailing != null) trailing!,
        ],
      ),
    );
  }
}

/// Card wrapper around a list/screen section.
class SectionCard extends StatelessWidget {
  const SectionCard({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Card(child: child);
  }
}

/// Shimmer skeleton for list items.
class Skeleton extends StatelessWidget {
  const Skeleton({super.key, this.height = 16, this.width, this.radius = 6});

  final double height;
  final double? width;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: LinearProgressIndicator(
        minHeight: height,
        value: null,
        backgroundColor: SreeponAdminTheme.slate100,
        color: SreeponAdminTheme.slate200,
      ),
    );
  }
}

/// Shimmer block skeleton.
class SkeletonBlock extends StatelessWidget {
  const SkeletonBlock({super.key, this.height = 20, this.width});

  final double height;
  final double? width;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(6),
      child: LinearProgressIndicator(
        minHeight: height,
        value: null,
        backgroundColor: SreeponAdminTheme.slate100,
        color: SreeponAdminTheme.slate200,
      ),
    );
  }
}
