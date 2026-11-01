import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// User role returned by Supabase app_metadata.
enum AdminRole {
  superAdmin,
  admin,
  orderManager,
}

extension AdminRoleString on AdminRole {
  String get value {
    switch (this) {
      case AdminRole.superAdmin:
        return 'SUPER_ADMIN';
      case AdminRole.admin:
        return 'ADMIN';
      case AdminRole.orderManager:
        return 'ORDER_MANAGER';
    }
  }
}

/// Profile of an authenticated admin.
class AdminUser {
  AdminUser({
    required this.id,
    required this.email,
    this.name,
    this.role,
  });

  final String id;
  final String email;
  final String? name;
  final String? role;

  bool get isSuperAdmin => role == AdminRole.superAdmin.value;
  bool get canManageOrders => role != null;
  bool get canManageProducts => role == AdminRole.superAdmin.value || role == AdminRole.admin.value;
}

/// Notifies listeners when auth state changes.
class AuthNotifier extends StateNotifier<AsyncValue<AdminUser?>> {
  AuthNotifier() : super(const AsyncValue.loading()) {
    _listen();
    _loadCurrent();
  }

  void _listen() {
    Supabase.instance.client.auth.onAuthStateChange.listen((data) {
      final session = data.session;
      if (session == null) {
        state = const AsyncValue.data(null);
        return;
      }
      final user = session.user;
      state = AsyncValue.data(AdminUser(
        id: user.id,
        email: user.email ?? '',
        name: user.userMetadata?['name'],
        role: _roleFromMetadata(user.appMetadata ?? {}),
      ));
    });
  }

  Future<void> _loadCurrent() async {
    try {
      final session = Supabase.instance.client.auth.currentSession;
      if (session == null) {
        state = const AsyncValue.data(null);
        return;
      }
      final user = session.user;
      state = AsyncValue.data(AdminUser(
        id: user.id,
        email: user.email ?? '',
        name: user.userMetadata?['name'],
        role: _roleFromMetadata(user.appMetadata ?? {}),
      ));
    } catch (_) {
      state = const AsyncValue.data(null);
    }
  }

  String _roleFromMetadata(Map<String, dynamic> metadata) {
    final roles = metadata['roles'] as List<dynamic>?;
    if (roles != null && roles.isNotEmpty) {
      return roles.first.toString();
    }
    return 'ORDER_MANAGER';
  }

  /// Sign in with email + password via Supabase.
  Future<void> signIn({required String email, required String password}) async {
    state = const AsyncValue.loading();
    try {
      final response = await Supabase.instance.client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      if (response.user == null) {
        state = AsyncValue.error('Invalid email or password', StackTrace.empty);
        return;
      }
      state = AsyncValue.data(AdminUser(
        id: response.user!.id,
        email: response.user!.email ?? email,
        name: response.user!.userMetadata?['name'],
        role: _roleFromMetadata(response.user!.appMetadata ?? {}),
      ));
    } on AuthException catch (e) {
      state = AsyncValue.error(e.message, StackTrace.empty);
    } catch (e) {
      state = AsyncValue.error('Sign in failed: $e', StackTrace.empty);
    }
  }

  Future<void> signOut() async {
    try {
      await Supabase.instance.client.auth.signOut();
    } catch (_) {
      // Ignore errors signing out — clear local state regardless.
    }
    state = const AsyncValue.data(null);
  }
}

/// Provider exposing the current auth state.
final authProvider = StateNotifierProvider<AuthNotifier, AsyncValue<AdminUser?>>((ref) {
  return AuthNotifier();
});

/// Provider exposing the currently signed-in admin user (or null).
final currentUserProvider = Provider<AdminUser?>((ref) {
  final async = ref.watch(authProvider);
  return async.valueOrNull;
});

/// Guards: only allow building when authenticated.
final authGuardProvider = Provider<bool>((ref) {
  final async = ref.watch(authProvider);
  return async.valueOrNull != null;
});
