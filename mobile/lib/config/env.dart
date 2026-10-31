/// Runtime configuration for the Sreepon Flutter app.
///
/// All values are injected at build time via `--dart-define`, so a single
/// release build can target dev / staging / production without recompiling
/// and without hard-coding credentials into the source tree. Nothing here is
/// a secret — secrets must never be embedded in a shipped app binary and are
/// only ever held by the backend.
library;

class SreeponConfig {
  const SreeponConfig({
    required this.apiBaseUrl,
    this.storeName = 'Sreepon',
    this.currency = 'INR',
    this.firebaseAuthEnabled = false,
  });

  final String apiBaseUrl;
  final String storeName;
  final String currency;
  final bool firebaseAuthEnabled;

  static final SreeponConfig instance = _load();

  static SreeponConfig _load() {
    const apiBaseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://sreepon-api.trisentricai.workers.dev/api/v1',
    );
    const firebaseAuthEnabled = bool.fromEnvironment('FIREBASE_AUTH_ENABLED');
    return SreeponConfig(
      apiBaseUrl: apiBaseUrl,
      firebaseAuthEnabled: firebaseAuthEnabled,
    );
  }
}