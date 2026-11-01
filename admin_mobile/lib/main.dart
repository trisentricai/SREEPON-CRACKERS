import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'config/env.dart';
import 'features/notifications/fcm_service.dart';

/// Flag ensuring FCM is initialized exactly once.
final _fcmInitialized = StateProvider<bool>((ref) => false);

/// Initializes FCM push notifications once the provider scope is mounted.
class FcmInitializer extends ConsumerWidget {
  const FcmInitializer({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (!ref.read(_fcmInitialized)) {
      ref.read(_fcmInitialized.notifier).state = true;
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        await ref.read(fcmServiceProvider).init();
      });
    }
    return child;
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: SreeponAdminConfig.instance.supabaseUrl,
    publishableKey: SreeponAdminConfig.instance.supabaseAnonKey,
  );

  runApp(
    ProviderScope(
      child: FcmInitializer(child: const SreeponAdminApp()),
    ),
  );
}
