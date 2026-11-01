import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/homepage.dart';
import 'package:sreepon_admin/core/models/settings.dart';
import 'package:sreepon_admin/core/network/api_client.dart';

final homepageProvider = FutureProvider<HomepageResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/homepage/sections',
    query: {'page': 1, 'limit': 50},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return HomepageResponse.fromJson(data);
});

final settingsProvider = FutureProvider<SettingsView>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/settings',
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return SettingsView.fromJson(data);
});
