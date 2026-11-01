/// Runtime configuration for the Sreepon admin Flutter app.
///
/// Values are baked in below for this private app — no --dart-define flags
/// needed. Override at build time if you ever deploy to a different env.
class SreeponAdminConfig {
  const SreeponAdminConfig({
    required this.apiBaseUrl,
    required this.supabaseUrl,
    required this.supabaseAnonKey,
    this.storeName = 'Sreepon Admin',
    this.currency = 'INR',
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
      defaultValue: 'https://pnusriqjaewnipkumeka.supabase.co',
    );
    const supabaseAnonKey = String.fromEnvironment(
      'SUPABASE_ANON_KEY',
      defaultValue: 'sb_publishable_acG-16sU4CiODqUku0pi8A_NsNlqPor',
    );
    const firebaseApiKey = String.fromEnvironment(
      'FIREBASE_API_KEY',
      defaultValue: 'AIzaSyB4vnCxfwR2JnZJqvjtgimp6PeVDybTDtg',
    );
    const firebaseAppId = String.fromEnvironment(
      'FIREBASE_APP_ID',
      defaultValue: '1:424126502999:android:7c5e6f838cd4e8b216eb12',
    );
    const firebaseMessagingSenderId = String.fromEnvironment(
      'FIREBASE_MESSAGING_SENDER_ID',
      defaultValue: '424126502999',
    );
    const firebaseProjectId = String.fromEnvironment(
      'FIREBASE_PROJECT_ID',
      defaultValue: 'admin-sreepon',
    );
    return SreeponAdminConfig(
      apiBaseUrl: apiBaseUrl,
      supabaseUrl: supabaseUrl,
      supabaseAnonKey: supabaseAnonKey,
      firebaseApiKey: firebaseApiKey.isEmpty ? null : firebaseApiKey,
      firebaseAppId: firebaseAppId.isEmpty ? null : firebaseAppId,
      firebaseMessagingSenderId:
          firebaseMessagingSenderId.isEmpty ? null : firebaseMessagingSenderId,
      firebaseProjectId: firebaseProjectId.isEmpty ? null : firebaseProjectId,
    );
  }
}
