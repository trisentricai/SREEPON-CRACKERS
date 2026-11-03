import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/settings.dart';
import 'package:sreepon_admin/core/network/api_client.dart';

final settingsProvider = FutureProvider.autoDispose<SettingsView>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/settings',
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return SettingsView.fromJson(data);
});
