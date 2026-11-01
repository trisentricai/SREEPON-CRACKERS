import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/network/api_client.dart';

class SignedUpload {
  const SignedUpload({
    required this.cloudName,
    required this.apiKey,
    required this.timestamp,
    required this.folder,
    required this.resourceType,
    required this.signature,
  });

  factory SignedUpload.fromJson(Map<String, dynamic> json) {
    return SignedUpload(
      cloudName: json['cloudName'] as String,
      apiKey: json['apiKey'] as String,
      timestamp: (json['timestamp'] ?? 0) as int,
      folder: json['folder'] as String?,
      resourceType: json['resourceType'] as String?,
      signature: json['signature'] as String?,
    );
  }

  final String cloudName;
  final String apiKey;
  final int timestamp;
  final String? folder;
  final String? resourceType;
  final String? signature;

  String get uploadUrl => 'https://api.cloudinary.com/v1_1/$cloudName/${resourceType ?? 'image'}/upload';
}

/// Provider: request a signed upload policy from the backend.
final signUploadProvider = FutureProvider.family<SignedUpload, Map<String, String>>((ref, args) async {
  final folder = args['folder']!;
  final resourceType = args['resourceType'] ?? 'image';
  final data = await api.post<Map<String, dynamic>>(
    path: '/admin/media/sign',
    body: {'folder': folder, 'resourceType': resourceType},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return SignedUpload.fromJson(data);
});

/// Upload image bytes directly to Cloudinary using a signed policy.
/// Returns Cloudinary's response (secure_url, public_id, etc.).
Future<Map<String, dynamic>> uploadImageToCloudinary({
  required SignedUpload policy,
  required Uint8List bytes,
  required String fileName,
}) async {
  final formData = FormData.fromMap({
    'file': MultipartFile.fromBytes(bytes, filename: fileName),
    'api_key': policy.apiKey,
    'timestamp': policy.timestamp.toString(),
    'signature': policy.signature,
    if (policy.folder != null && policy.folder!.isNotEmpty) 'folder': policy.folder,
    'resource_type': policy.resourceType ?? 'image',
  });

  final dio = _dioForUpload();
  final response = await dio.post<Map<String, dynamic>>(
    policy.uploadUrl,
    data: formData,
    options: Options(headers: {'Content-Type': 'multipart/form-data'}),
  );
  return response.data!;
}

Dio _dioForUpload() {
  return Dio(BaseOptions(
    connectTimeout: const Duration(seconds: 60),
    receiveTimeout: const Duration(seconds: 60),
    sendTimeout: const Duration(seconds: 60),
  ));
}
