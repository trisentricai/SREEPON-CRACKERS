/// Runtime configuration for the Sreepon admin Flutter app.
///
/// Values are injected at build time via `--dart-define` so a single release
/// build can target dev / staging / production without recompiling:
///
///   flutter run --dart-define=API_BASE_URL=https://... \
///       --dart-define=SUPABASE_URL=... \
///       --dart-define=SUPABASE_ANON_KEY=...
class SreeponAdminConfig {
  const SreeponAdminConfig({
    required this.apiBaseUrl,
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    this.storeName = 'Sreepon Admin',
    this.currency = 'INR',
    // Firebase config for FCM push notifications (admin project).
    this.firebaseApiKey,
    this.firebaseAppId,
    this.firebaseMessagingSenderId,
    this.firebaseProjectId,
  });

  final String apiBaseUrl;
  final String supabaseUrl;
  final String supabaseAnonKey;
  final String storeName;
  final String currency;
  final String? firebaseApiKey;
  final String? firebaseAppId;
  final String? firebaseMessagingSenderId;
  final String? firebaseProjectId;

  static final SreeponAdminConfig instance = _load();

  static SreeponAdminConfig _load() {
    const apiBaseUrl = String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'https://sreepon-api.trisentricai.workers.dev/api/v1',
    );
    const supabaseUrl = String.fromEnvironment(
      'SUPABASE_URL',
      defaultValue: '',
    );
    const supabaseAnonKey = String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue: '',
    );
    const firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
    const firebaseAppId = String.fromEnvironment('FIREBASE_APP_ID');
    const firebaseMessagingSenderId = String.fromEnvironment('FIREBASE_MESSAGING_SENDER_ID');
    const firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
    return SreeponAdminConfig(
      apiBaseUrl: apiBaseUrl,
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: supabaseAnonKey,
      firebaseApiKey: firebaseApiKey.isEmpty ? null : firebaseApiKey,
      firebaseAppId: firebaseAppId.isEmpty ? null : firebaseAppId,
      firebaseMessagingSenderId: firebaseMessagingSenderId.isEmpty ? null : firebaseMessagingSenderId,
      firebaseProjectId: firebaseProjectId.isEmpty ? null : firebaseProjectId,
    );
  }
}
