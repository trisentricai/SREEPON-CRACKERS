import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'config/env.dart';
import 'firebase_options.dart';
import 'features/notifications/fcm_service.dart';

/// Flag ensuring FCM is initialized exactly once.
final _fcmInitialized = StateProvider<bool>((ref) => false);

/// Initializes FCM push notifications once after the first frame — avoids
/// modifying providers during the widget build lifecycle.
class FcmInitializer extends ConsumerStatefulWidget {
  const FcmInitializer({required this.child, super.key});

  final Widget child;

  @override
  ConsumerState<FcmInitializer> createState() => _FcmInitializerState();
}

class _FcmInitializerState extends ConsumerState<FcmInitializer> {
  bool _started = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (_started) return;
      _started = true;
      if (!ref.read(_fcmInitialized)) {
        ref.read(_fcmInitialized.notifier).state = true;
        await ref.read(fcmServiceProvider).init();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

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
