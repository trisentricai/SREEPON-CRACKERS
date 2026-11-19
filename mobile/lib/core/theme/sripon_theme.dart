import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/widgets.dart';

/// SriPon Material 3 themes — light and dark, both built from the Apple/Morrow
/// mockup tokens in [SriPonColors]. Inter is a clean, SF-like face shipped via
/// google_fonts; display styles carry the mockup's tight -0.015em tracking.
abstract final class SriPonTheme {
  /// Active customer theme (light).
  static ThemeData get light => _build(
        brightness: Brightness.light,
        primary: SriPonColors.accent,
        onPrimary: Colors.white,
        primaryContainer: SriPonColors.accentSoft,
        onPrimaryContainer: SriPonColors.accentDeep,
        surface: SriPonColors.bg,
        onSurface: SriPonColors.fg,
        surfaceContainerLow: SriPonColors.surfaceWarm,
        surfaceContainerHighest: SriPonColors.surface,
        onSurfaceVariant: SriPonColors.muted,
        outline: SriPonColors.line,
        error: SriPonColors.danger,
        onError: Colors.white,
        dark: false,
      );

  /// Dark theme — token-ready for an upcoming toggle; neutral Apple-like dark
  /// greys rather than the retired warm-brown palette.
  static ThemeData get dark => _build(
        brightness: Brightness.dark,
        primary: const Color(0xFF0A84FF),
        onPrimary: Colors.white,
        primaryContainer: const Color(0xFF12314B),
        onPrimaryContainer: const Color(0xFFA8D0FF),
        surface: const Color(0xFF1C1C1E),
        onSurface: const Color(0xFFF5F5F7),
        surfaceContainerLow: const Color(0xFF242426),
        surfaceContainerHighest: const Color(0xFF343436),
        onSurfaceVariant: const Color(0xFFA1A1A6),
        outline: const Color(0xFF48484A),
        error: const Color(0xFFFF6961),
        onError: Colors.black,
        dark: true,
      );

  static ThemeData _build({
    required Brightness brightness,
    required Color primary,
    required Color onPrimary,
    required Color primaryContainer,
    required Color onPrimaryContainer,
    required Color surface,
    required Color onSurface,
    required Color surfaceContainerLow,
    required Color surfaceContainerHighest,
    required Color onSurfaceVariant,
    required Color outline,
    required Color error,
    required Color onError,
    required bool dark,
  }) {
    final scheme = ColorScheme.fromSeed(
      seedColor: SriPonColors.accent,
      brightness: brightness,
    ).copyWith(
      brightness: brightness,
      primary: primary,
      onPrimary: onPrimary,
      primaryContainer: primaryContainer,
      onPrimaryContainer: onPrimaryContainer,
      secondary: primary,
      onSecondary: onPrimary,
      secondaryContainer: primaryContainer,
      onSecondaryContainer: onPrimaryContainer,
      tertiary: primary,
      onTertiary: onPrimary,
      tertiaryContainer: primaryContainer,
      onTertiaryContainer: onPrimaryContainer,
      surface: surface,
      onSurface: onSurface,
      surfaceContainerLowest: surface,
      surfaceContainerLow: surfaceContainerLow,
      surfaceContainer: surfaceContainerLow,
      surfaceContainerHigh: surfaceContainerHighest,
      surfaceContainerHighest: surfaceContainerHighest,
      onSurfaceVariant: onSurfaceVariant,
      outline: outline,
      outlineVariant: outline,
      error: error,
      onError: onError,
      surfaceTint: Colors.transparent,
    );

    const body = GoogleFonts.inter;
    const display = GoogleFonts.inter;
    TextStyle displayStyle(double size, FontWeight weight, Color color) => display(
          fontSize: size,
          fontWeight: weight,
          color: color,
          letterSpacing: size * SriPonMetrics.displayTracking,
        );

    final baseText = ThemeData(useMaterial3: true, colorScheme: scheme).textTheme;
    final textTheme = baseText.copyWith(
      displayLarge: displayStyle(40, FontWeight.w700, onSurface),
      displayMedium: displayStyle(32, FontWeight.w700, onSurface),
      displaySmall: displayStyle(29, FontWeight.w700, onSurface),
      headlineLarge: displayStyle(28, FontWeight.w700, onSurface),
      headlineMedium: displayStyle(24, FontWeight.w700, onSurface),
      headlineSmall: displayStyle(22, FontWeight.w700, onSurface),
      titleLarge: displayStyle(20, FontWeight.w700, onSurface),
      titleMedium: displayStyle(17, FontWeight.w700, onSurface),
      titleSmall: body(fontSize: 14, fontWeight: FontWeight.w700, color: onSurface),
      labelLarge: body(fontSize: 14, fontWeight: FontWeight.w700, color: onSurface),
      labelMedium: body(fontSize: 12, fontWeight: FontWeight.w600, color: onSurfaceVariant),
      labelSmall: body(fontSize: 11, fontWeight: FontWeight.w600, color: onSurfaceVariant),
      bodyLarge: body(fontSize: 17, fontWeight: FontWeight.w400, color: onSurface, height: 1.45),
      bodyMedium: body(fontSize: 14, fontWeight: FontWeight.w400, color: onSurface, height: 1.45),
      bodySmall: body(fontSize: 12.5, fontWeight: FontWeight.w400, color: onSurfaceVariant, height: 1.4),
    );

    final cardColor = dark ? const Color(0xFF1C1C1E) : SriPonColors.bg;
    final sheetColor = dark ? const Color(0xFF1C1C1E) : SriPonColors.bg;
    final fieldFill = dark ? const Color(0xFF242426) : SriPonColors.surface;
    final borderSide = BorderSide(color: dark ? const Color(0xFF48484A) : SriPonColors.line);

    ButtonStyle pillButton({
      required Color background,
      required Color foreground,
      Color? disabledBackground,
      Color? disabledForeground,
      BorderSide? side,
    }) =>
        ButtonStyle(
          minimumSize: WidgetStateProperty.all(const Size(0, 50)),
          padding: WidgetStateProperty.all(const EdgeInsets.symmetric(horizontal: 22)),
          shape: WidgetStateProperty.all(const StadiumBorder()),
          backgroundColor: WidgetStateProperty.resolveWith<Color>((states) {
            return states.contains(WidgetState.disabled)
                ? (disabledBackground ?? background)
                : background;
          }),
          foregroundColor: WidgetStateProperty.resolveWith<Color>((states) {
            return states.contains(WidgetState.disabled)
                ? (disabledForeground ?? foreground)
                : foreground;
          }),
          side: side == null ? null : WidgetStateProperty.all(side),
          elevation: WidgetStateProperty.all(0),
          shadowColor: WidgetStateProperty.all(Colors.transparent),
          textStyle: WidgetStateProperty.all(body(fontSize: 15, fontWeight: FontWeight.w700)),
        );

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: surface,
      canvasColor: surface,
      textTheme: textTheme,
      splashFactory: InkSparkle.splashFactory,
      appBarTheme: AppBarTheme(
        backgroundColor: dark ? const Color(0xDB1C1C1E) : SriPonColors.glass,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: onSurface, size: 22),
        titleTextStyle: displayStyle(20, FontWeight.w700, onSurface),
        toolbarHeight: 64,
      ),
      cardTheme: CardThemeData(
        color: cardColor,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: const EdgeInsets.all(12),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(SriPonMetrics.cardRadius),
          side: dark ? BorderSide.none : borderSide,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        height: SriPonMetrics.navHeight,
        backgroundColor: Colors.transparent,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shadowColor: Colors.transparent,
        indicatorColor: dark ? const Color(0xFF12314B) : SriPonColors.accentSoft,
        indicatorShape: const StadiumBorder(),
        labelTextStyle: WidgetStateProperty.resolveWith<TextStyle>((states) {
          final selected = states.contains(WidgetState.selected);
          return body(
            fontSize: 10.5,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w600,
            color: selected ? primary : onSurfaceVariant,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith<IconThemeData>((states) {
          final selected = states.contains(WidgetState.selected);
          return IconThemeData(
            color: selected ? primary : onSurfaceVariant,
            size: 22,
          );
        }),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: pillButton(
          background: primary,
          foreground: onPrimary,
          disabledBackground: dark ? const Color(0xFF3A3A3C) : SriPonColors.line,
          disabledForeground: onSurfaceVariant,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: pillButton(
          background: Colors.transparent,
          foreground: onSurface,
          disabledBackground: Colors.transparent,
          disabledForeground: onSurfaceVariant,
          side: borderSide,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: ButtonStyle(
          minimumSize: WidgetStateProperty.all(const Size(0, 44)),
          padding: WidgetStateProperty.all(const EdgeInsets.symmetric(horizontal: 12)),
          shape: WidgetStateProperty.all(const StadiumBorder()),
          foregroundColor: WidgetStateProperty.all(primary),
          textStyle: WidgetStateProperty.all(body(fontSize: 13, fontWeight: FontWeight.w700)),
        ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: ButtonStyle(
          minimumSize: WidgetStateProperty.all(
            const Size(SriPonMetrics.touchTarget, SriPonMetrics.touchTarget),
          ),
          foregroundColor: WidgetStateProperty.all(onSurfaceVariant),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: fieldFill,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: borderSide),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: borderSide),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: primary, width: 1.5),
        ),
        hintStyle: body(fontSize: 14, color: onSurfaceVariant),
        labelStyle: body(fontSize: 14, color: onSurfaceVariant),
        floatingLabelStyle: body(fontSize: 13, fontWeight: FontWeight.w600, color: primary),
        prefixIconColor: onSurfaceVariant,
      ),
      chipTheme: ChipThemeData(
        shape: const StadiumBorder(),
        side: borderSide,
        backgroundColor: fieldFill,
        selectedColor: dark ? const Color(0xFF12314B) : SriPonColors.accentSoft,
        checkmarkColor: primary,
        labelStyle: body(fontSize: 13, fontWeight: FontWeight.w600, color: onSurface),
        secondaryLabelStyle: body(fontSize: 13, fontWeight: FontWeight.w700, color: primary),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        showCheckmark: false,
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: sheetColor,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28)),
        titleTextStyle: displayStyle(24, FontWeight.w700, onSurface),
        contentTextStyle: body(fontSize: 14, color: onSurface),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: sheetColor,
        modalBackgroundColor: sheetColor,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        dragHandleColor: dark ? const Color(0xFF48484A) : SriPonColors.line,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: dark ? const Color(0xFF2C2C2E) : SriPonColors.fg,
        contentTextStyle: body(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        behavior: SnackBarBehavior.floating,
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: primary, linearTrackColor: primaryContainer),
      dividerTheme: DividerThemeData(color: dark ? const Color(0xFF3A3A3C) : SriPonColors.line, space: 24, thickness: 1),
    );
  }
}
