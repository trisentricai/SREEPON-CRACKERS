import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/widgets.dart';

/// SriPon Material 3 themes — built from the same design tokens as the web
/// storefront (web/src/index.css) so both apps stay visually identical.
abstract final class SriPonTheme {
  /// Active customer theme (light).
  static ThemeData get light => _build(
        brightness: Brightness.light,
        primary: SriPonColors.emberDeep,
        onPrimary: Colors.white,
        primaryContainer: SriPonColors.ember100,
        onPrimaryContainer: SriPonColors.ember900,
        secondary: SriPonColors.gold,
        onSecondary: SriPonColors.ink,
        surface: SriPonColors.paper,
        onSurface: SriPonColors.ink,
        surfaceContainerLow: SriPonColors.paperStrong,
        surfaceContainerHighest: SriPonColors.ember100,
      );

  /// Dark theme — token-ready for the upcoming dark-mode toggle.
  static ThemeData get dark => _build(
        brightness: Brightness.dark,
        primary: SriPonColors.ember300,
        onPrimary: SriPonColors.ink,
        primaryContainer: SriPonColors.ember900,
        onPrimaryContainer: SriPonColors.ember100,
        secondary: const Color(0xFFE9CC72),
        onSecondary: SriPonColors.ink,
        surface: const Color(0xFF1C140F),
        onSurface: const Color(0xFFFFF6ED),
        surfaceContainerLow: const Color(0xFF241B16),
        surfaceContainerHighest: const Color(0xFF3B2E24),
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color primary,
    required Color onPrimary,
    required Color primaryContainer,
    required Color onPrimaryContainer,
    required Color secondary,
    required Color onSecondary,
    required Color surface,
    required Color onSurface,
    required Color surfaceContainerLow,
    required Color surfaceContainerHighest,
  }) {
    final seeded = ColorScheme.fromSeed(
      seedColor: SriPonColors.ember,
      brightness: brightness,
    );
    final scheme = seeded.copyWith(
      brightness: brightness,
      primary: primary,
      onPrimary: onPrimary,
      primaryContainer: primaryContainer,
      onPrimaryContainer: onPrimaryContainer,
      secondary: secondary,
      onSecondary: onSecondary,
      secondaryContainer: SriPonColors.gold100,
      onSecondaryContainer: SriPonColors.gold900,
      tertiary: SriPonColors.gold,
      onTertiary: SriPonColors.ink,
      tertiaryContainer: SriPonColors.gold100,
      onTertiaryContainer: SriPonColors.gold900,
      surface: surface,
      onSurface: onSurface,
      surfaceContainerLow: surfaceContainerLow,
      surfaceContainerHighest: surfaceContainerHighest,
    );

    final body = GoogleFonts.nunitoSans;
    final display = GoogleFonts.rubik;

    final baseText = ThemeData(useMaterial3: true, colorScheme: seeded).textTheme;
    final textTheme = baseText.copyWith(
      displayLarge: display(fontSize: 40, fontWeight: FontWeight.w800, color: onSurface),
      displayMedium: display(fontSize: 32, fontWeight: FontWeight.w800, color: onSurface),
      displaySmall: display(fontSize: 26, fontWeight: FontWeight.w700, color: onSurface),
      headlineLarge: display(fontSize: 28, fontWeight: FontWeight.w700, color: onSurface),
      headlineMedium: display(fontSize: 24, fontWeight: FontWeight.w700, color: onSurface),
      headlineSmall: display(fontSize: 20, fontWeight: FontWeight.w700, color: onSurface),
      titleLarge: display(fontSize: 20, fontWeight: FontWeight.w700, color: onSurface),
      titleMedium: display(fontSize: 16, fontWeight: FontWeight.w700, color: onSurface),
      titleSmall: display(fontSize: 14, fontWeight: FontWeight.w600, color: onSurface),
      labelLarge: body(fontSize: 14, fontWeight: FontWeight.w700, color: onSurface),
      labelMedium: body(fontSize: 12, fontWeight: FontWeight.w600, color: onSurface),
      labelSmall: body(fontSize: 11, fontWeight: FontWeight.w500, color: onSurface),
      bodyLarge: body(fontSize: 16, fontWeight: FontWeight.w400, color: onSurface, height: 1.4),
      bodyMedium: body(fontSize: 14, fontWeight: FontWeight.w400, color: onSurface, height: 1.4),
      bodySmall: body(fontSize: 12, fontWeight: FontWeight.w400, color: onSurface, height: 1.35),
    );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: surface,
      textTheme: textTheme,
      appBarTheme: AppBarTheme(
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        titleTextStyle: display(fontSize: 20, fontWeight: FontWeight.w700, color: onSurface),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: primaryContainer,
      ),
    );
  }
}