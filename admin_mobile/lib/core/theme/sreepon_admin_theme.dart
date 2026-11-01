import 'package:flutter/material.dart';

/// Sreepon admin theme — matches the admin web dashboard design tokens:
/// slate-900 sidebar, flame-600 active, indigo-400 accents on a clean light surface.
abstract final class SreeponAdminTheme {
  static const Color flame600 = Color(0xFFff8a3d);
  static const Color flame50 = Color(0xFFFDF0E8);
  static const Color indigo600 = Color(0xFF4338ca);
  static const Color indigo50 = Color(0xFFEEF2FF);
  static const Color slate900 = Color(0xFF0F172A);
  static const Color slate800 = Color(0xFF1E293B);
  static const Color slate700 = Color(0xFF334155);
  static const Color slate600 = Color(0xFF475569);
  static const Color slate500 = Color(0xFF64748B);
  static const Color slate400 = Color(0xFF94A3B8);
  static const Color slate300 = Color(0xFFCBD5E1);
  static const Color slate200 = Color(0xFFE2E8F0);
  static const Color slate50 = Color(0xFFF8FAFC);
  static const Color slate100 = Color(0xFFF1F5F9);
  static const Color white = Color(0xFFFFFFFF);
  static const Color red600 = Color(0xFFDC2626);
  static const Color green600 = Color(0xFF059669);
  static const Color amber600 = Color(0xFFD97706);

  static ThemeData get light => ThemeData(
        useMaterial3: true,
        brightness: Brightness.light,
        colorScheme: const ColorScheme.light(
          primary: flame600,
          secondary: indigo600,
          surface: white,
          error: red600,
          onPrimary: white,
          onSecondary: white,
          onSurface: slate900,
        ),
        scaffoldBackgroundColor: white,
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          elevation: 0,
          backgroundColor: white,
          foregroundColor: slate900,
          titleTextStyle: TextStyle(
            color: slate900,
            fontSize: 18,
            fontWeight: FontWeight.w700,
          ),
          iconTheme: IconThemeData(color: slate600),
        ),
        cardTheme: const CardThemeData(
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(12))),
          color: white,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: slate50,
          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(10)),
            borderSide: BorderSide(color: slate200, width: 1),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(10)),
            borderSide: BorderSide(color: slate200, width: 1),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.all(Radius.circular(10)),
            borderSide: BorderSide(color: flame600, width: 1.5),
          ),
          hintStyle: TextStyle(color: slate500, fontSize: 14),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: flame600,
            foregroundColor: white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            minimumSize: const Size(double.infinity, 48),
            padding: const EdgeInsets.symmetric(vertical: 12),
            textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
          ),
        ),
        textTheme: const TextTheme(
          headlineLarge: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: slate900),
          headlineMedium: TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: slate900),
          titleLarge: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: slate900),
          titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: slate900),
          bodyLarge: TextStyle(fontSize: 15, color: slate700),
          bodyMedium: TextStyle(fontSize: 14, color: slate600),
          labelLarge: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: slate600),
        ),
        dividerTheme: const DividerThemeData(color: slate200, space: 1, thickness: 1),
      );

  /// Sidebar drawer background color.
  static const Color drawerBackground = slate900;

  /// Sidebar active item background.
  static const Color drawerActive = flame600;

  /// Sidebar inactive text color.
  static const Color drawerInactive = slate400;
}
