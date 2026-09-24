import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/firebase_service.dart' as fb;

/// Customer auth state for the SriPon mobile app.
///
/// Listens to Firebase's auth stream and exposes `user`, `isLoading`, and the
/// email/password + Google actions the screens need. Nothing here touches the
/// wallet/business rules — those live on the backend via the API client.
class AuthController extends Notifier<AuthState> {
  StreamSubscription<User?>? _subscription;

  @override
  AuthState build() {
    _subscription = fb.watchAuth().listen((User? user) {
      state = AuthState(user: user, isLoading: false);
    });
    ref.onDispose(() => _subscription?.cancel());
    return AuthState(user: fb.currentUser, isLoading: true);
  }

  Future<User> login(String email, String password) async {
    final user = await fb.loginWithEmail(email, password);
    state = AuthState(user: user, isLoading: false);
    return user;
  }

  Future<User> register(String email, String password) async {
    final user = await fb.registerWithEmail(email, password);
    state = AuthState(user: user, isLoading: false);
    return user;
  }

  Future<User> loginWithGoogle() async {
    final user = await fb.loginWithGoogle();
    state = AuthState(user: user, isLoading: false);
    return user;
  }

  Future<void> logout() async {
    await fb.logOut();
  }
}

final authControllerProvider =
    NotifierProvider<AuthController, AuthState>(AuthController.new);

/// Immutable auth state snapshot.
class AuthState {
  const AuthState({required this.user, required this.isLoading});

  final User? user;
  final bool isLoading;

  bool get isAuthenticated => user != null;
}

/// Convenience accessors used inside consumer widgets.
extension AuthStateRefX on Ref {
  AuthState get authState => read(authControllerProvider);
  bool get isAuthenticated => read(authControllerProvider).isAuthenticated;
}