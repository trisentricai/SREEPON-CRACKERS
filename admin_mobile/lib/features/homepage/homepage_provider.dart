import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/models/homepage.dart';
import 'package:sreepon_admin/core/network/api_client.dart';

/// Homepage config (`GET /admin/homepage`) + ordered sections
/// (`GET /admin/homepage/sections`) in one future.
final homepageProvider = FutureProvider.autoDispose<HomepageResponse>((ref) async {
  final configEnvelope = await api.get<Map<String, dynamic>>(
    '/admin/homepage',
    fromJson: (json) => json as Map<String, dynamic>,
  );
  final sections = await api.get<List<dynamic>>(
    '/admin/homepage/sections',
    fromJson: (json) => json as List<dynamic>,
  );

  final config = configEnvelope['config'];
  return HomepageResponse(
    config: config is Map<String, dynamic> ? config : const <String, dynamic>{},
    sections: sections
        .whereType<Map<String, dynamic>>()
        .map(HomepageSection.fromJson)
        .toList(),
  );
});
