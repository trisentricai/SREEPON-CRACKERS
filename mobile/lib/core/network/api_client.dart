import 'package:dio/dio.dart';

import '../../config/env.dart';
import '../../features/auth/data/firebase_service.dart';

/// API error raised for non-2xx responses and transport failures.
class ApiException implements Exception {
  ApiException(this.message, this.status, {this.code, this.fieldErrors});

  factory ApiException.fromResponse(Response<dynamic> response) {
    final body = response.data;
    var message = 'Something went wrong (${response.statusCode ?? 0})';
    String? code;
    Map<String, List<String>>? fieldErrors;
    if (body is Map<String, dynamic>) {
      final fetchedMessage = body['message'];
      if (fetchedMessage is String && fetchedMessage.isNotEmpty) {
        message = fetchedMessage;
      }
      final fetchedCode = body['code'];
      if (fetchedCode is String) {
        code = fetchedCode;
      }
      final fetchedErrors = body['errors'];
      if (fetchedErrors is Map<String, dynamic>) {
        fieldErrors = fetchedErrors.map(
          (key, value) => MapEntry(key, (value as List<dynamic>).cast<String>()),
        );
      }
    }
    return ApiException(message, response.statusCode ?? 0, code: code, fieldErrors: fieldErrors);
  }

  final String message;
  final int status;
  final String? code;
  final Map<String, List<String>>? fieldErrors;

  bool get isNetwork => status == 0;

  @override
  String toString() => 'ApiException($status): $message';
}

/// Attaches the Firebase ID token for authenticated customer requests.
typedef TokenProvider = Future<String?> Function();

/// Thin wrapper over Dio that unwraps the `{ success, message, data }` envelope
/// so callers deal with domain data directly. Mirrors the web SDK behaviour.
class ApiClient {
  ApiClient({required this.baseUrl, required this.tokenProvider, Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: baseUrl,
              connectTimeout: const Duration(seconds: 30),
              receiveTimeout: const Duration(seconds: 30),
              headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
            )) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          try {
            final token = await tokenProvider();
            if (token != null && token.isNotEmpty) {
              options.headers['Authorization'] = 'Bearer $token';
            }
          } on DioException {
            // Proceed unauthenticated if the token lookup fails.
          }
          handler.next(options);
        },
      ),
    );
  }

  final Dio _dio;
  final String baseUrl;
  final TokenProvider tokenProvider;

  /// GET returning the decoded envelope data.
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? query,
    required T Function(Object? json) fromJson,
  }) async {
    final response = await _guard(() => _dio.get<dynamic>(path, queryParameters: query));
    return _unwrap<T>(response, fromJson);
  }

  Future<T> post<T>(
    String path, {
    Object? body,
    required T Function(Object? json) fromJson,
  }) async {
    final response = await _guard(() => _dio.post<dynamic>(path, data: body));
    return _unwrap<T>(response, fromJson);
  }

  Future<T> patch<T>(
    String path, {
    Object? body,
    required T Function(Object? json) fromJson,
  }) async {
    final response = await _guard(() => _dio.patch<dynamic>(path, data: body));
    return _unwrap<T>(response, fromJson);
  }

  Future<void> delete(String path) async {
    await _guard(() => _dio.delete<dynamic>(path));
  }

  /// Raw GET that returns the decoded domain object (for endpoints returning
  /// a bare object rather than a list envelope).
  Future<dynamic> getRaw(String path, {Map<String, dynamic>? query}) async {
    return _guard(() => _dio.get<dynamic>(path, queryParameters: query)).then((r) => r.data);
  }

  T _unwrap<T>(Response<dynamic> response, T Function(Object? json) fromJson) {
    if (response.data is! Map<String, dynamic>) {
      throw ApiException('Unexpected response shape', 0, code: 'server_error');
    }
    final envelope = response.data as Map<String, dynamic>;
    if (envelope['success'] == true && envelope.containsKey('data')) {
      return fromJson(envelope['data']);
    }
    throw ApiException.fromResponse(response);
  }

  /// Converts the transport/explicit errors the SDK surfaces into [ApiException].
  Future<Response<dynamic>> _guard(Future<Response<dynamic>> Function() run) async {
    try {
      return await run();
    } on DioException catch (error) {
      final response = error.response;
      if (response != null) {
        throw ApiException.fromResponse(response);
      }
      final timeout = error.type == DioExceptionType.connectionTimeout ||
          error.type == DioExceptionType.receiveTimeout;
      throw ApiException(
        timeout ? 'Request timed out' : 'Network error — check your connection',
        0,
        code: 'network_error',
      );
    }
  }
}

/// Global API client — configured once at startup.
final api = ApiClient(
  baseUrl: SriPonConfig.instance.apiBaseUrl,
  tokenProvider: authTokenProvider,
);