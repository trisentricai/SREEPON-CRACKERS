import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'config/env.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: SreeponAdminConfig.instance.supabaseUrl,
    publishableKey: SreeponAdminConfig.instance.supabaseAnonKey,
  );

  runApp(const ProviderScope(child: SreeponAdminApp()));
}
