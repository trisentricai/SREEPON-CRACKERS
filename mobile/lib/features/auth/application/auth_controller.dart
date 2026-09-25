import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../data/firebase_service.dart' as fb;

/// Customer auth state for the SriPon mobile app.
///
/// Listens to Firebase's auth stream and exposes `user`, `isLoading`, and the
/// email/password + Google actions the screens need. Nothing here touches the
/// wallet/business rules — those live on the backend via the API client.
///
/// The Firebase session alone is not enough: gated endpoints (`/users/me`,
/// cart, orders, addresses) key off a local customer row that only exists
/// after the find-or-create bridge at `POST /auth/login`. Every auth-state
/// change therefore run the bridge once so first-time sign-ins (and restored
/// sessions) resolve to a backend profile before the UI hands control to the
/// gated screens. The bridge is idempotent and best-effort — a network hiccup
/// must not block sign-in; gated screens surface their own errors.
class AuthController extends Notifier<AuthState> {
  StreamSubscription<User?>? _subscription;
  bool _bridged = false;

  @override
  AuthState build() {
    _subscription = fb.watchAuth().listen((User? user) async {
      if (user == null) {
        _bridged = false;
        state = AuthState(user: null, isLoading: false);
        return;
      }
      if (_bridged) {
        state = AuthState(user: user, isLoading: false);
        return;
      }
      state = AuthState(user: user, isLoading: true);
      try {
        await _bridgeSession(user);
      } on Exception {
        // Best-effort; the gated providers will surface a retryable error.
      }
      _bridged = true;
      state = AuthState(user: user, isLoading: false);
    });
    ref.onDispose(() => _subscription?.cancel());
    return AuthState(user: fb.currentUser, isLoading: true);
  }

  /// Find-or-create the local customer profile for [user] at `POST /auth/login`.
  Future<void> _bridgeSession(User user) async {
    final idToken = await user.getIdToken(true);
    if (idToken == null) return;
    await api.post('/auth/login', body: {'idToken': idToken}, fromJson: (json) => json);
  }

  Future<User> login(String email, String password) => fb.loginWithEmail(email, password);

  Future<User> register(String email, String password) => fb.registerWithEmail(email, password);

  Future<User> loginWithGoogle() => fb.loginWithGoogle();

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