/// Firebase Auth helpers for the SriPon Flutter app.
///
/// The SDK reads its config from the platform files each engine ships
/// (`google-services.json` / `GoogleService-Info.plist`), so nothing here is a
/// secret. These wrappers keep the UI and API layers free of Firebase plumbing.
///
/// IMPORTANT: call [initializeFirebase] once at startup (see `main.dart`)
/// before any screen touches auth, otherwise the SDK throws.
library;

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:google_sign_in/google_sign_in.dart';

/// Initializes Firebase core. Idempotent.
Future<void> initializeFirebase() async {
  if (Firebase.apps.isEmpty) {
    await Firebase.initializeApp();
  }
}

/// Resolve the current Firebase ID token, or null when signed out.
/// Used as the API client's token provider.
Future<String?> authTokenProvider() async {
  final user = FirebaseAuth.instance.currentUser;
  if (user == null) return null;
  return user.getIdToken(true);
}

/// Subscribe to auth state changes (mobile session).
Stream<User?> watchAuth() => FirebaseAuth.instance.authStateChanges();

User? get currentUser => FirebaseAuth.instance.currentUser;

Future<User> loginWithEmail(String email, String password) async {
  final credentials = await FirebaseAuth.instance.signInWithEmailAndPassword(
    email: email.trim(),
    password: password,
  );
  return credentials.user!;
}

Future<User> registerWithEmail(String email, String password) async {
  final credentials = await FirebaseAuth.instance.createUserWithEmailAndPassword(
    email: email.trim(),
    password: password,
  );
  return credentials.user!;
}

/// Google sign-in with the configured web client id used on Android/iOS.
Future<User> loginWithGoogle() async {
  final googleUser = await GoogleSignIn().signIn();
  if (googleUser == null) {
    throw Exception('Google sign-in was cancelled');
  }
  final googleAuth = await googleUser.authentication;
  final credential = GoogleAuthProvider.credential(
    accessToken: googleAuth.accessToken,
    idToken: googleAuth.idToken,
  );
  final result = await FirebaseAuth.instance.signInWithCredential(credential);
  return result.user!;
}

Future<void> resetPassword(String email) =>
    FirebaseAuth.instance.sendPasswordResetEmail(email: email.trim());

Future<void> logOut() async {
  await GoogleSignIn().signOut();
  await FirebaseAuth.instance.signOut();
}