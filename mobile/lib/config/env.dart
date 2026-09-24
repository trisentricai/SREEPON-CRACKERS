/// Runtime configuration for the SriPon Flutter app.
///
/// All values are injected at build time via `--dart-define`, so a single
/// release build can target dev / staging / production without recompiling
/// and without hard-coding credentials into the source tree. Nothing here is
/// a secret — secrets must never be embedded in a shipped app binary and are
/// only ever held by the backend.
library;

class SriPonConfig {
  const SriPonConfig({
    required this.apiBaseUrl,
    this.storeName = 'SriPon',
    this.currency = 'INR',
    this.firebaseAuthEnabled = false,
  });

  final String apiBaseUrl;
  final String storeName;
  final String currency;
  final bool firebaseAuthEnabled;

  static final SriPonConfig instance = _load();

  static SriPonConfig _load() {
    const apiBaseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://sreepon-crackers.onrender.com/api/v1',
    );
    const firebaseAuthEnabled = bool.fromEnvironment('FIREBASE_AUTH_ENABLED');
    return SriPonConfig(
      apiBaseUrl: apiBaseUrl,
      firebaseAuthEnabled: firebaseAuthEnabled,
    );
  }
}