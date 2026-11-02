import 'dart:async';
import 'dart:io';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/network/api_client.dart';

/// Token produced by FCM for this device.
final fcmTokenProvider = StateProvider<String?>((ref) => null);

/// Unread notification count shown on the bell badge.
final unreadCountProvider = StateProvider<int>((ref) => 0);

/// Manages Firebase Cloud Messaging for admin push notifications.
class FcmService {
  FcmService(this._ref);

  final Ref _ref;
  FirebaseMessaging? _messaging;
  FlutterLocalNotificationsPlugin? _localNotifications;
  String? _pendingRoute;

  /// Route carried by the notification that cold-started the app. Consumed
  /// once by the shell after the router is ready.
  String? takePendingRoute() {
    final route = _pendingRoute;
    _pendingRoute = null;
    return route;
  }

  /// Initialize FCM. Call once at app startup (Firebase is initialized in main.dart).
  Future<void> init() async {
    _messaging = FirebaseMessaging.instance;

    // Request permissions (required on iOS; a no-op on Android if already granted).
    await _messaging!.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Local notifications channel (Android 8+).
    _localNotifications = FlutterLocalNotificationsPlugin();
    const android = AndroidInitializationSettings('@mipmap/ic_launcher');
    const init = InitializationSettings(android: android);
    await _localNotifications!.initialize(
      init,
      onDidReceiveNotificationResponse: (details) {
        final payload = details.payload;
        if (payload != null && payload.isNotEmpty) {
          _handleNotificationTap(payload);
        }
      },
    );

    if (!kIsWeb) {
      const androidChannel = AndroidNotificationChannel(
        'sreepon_admin',
        'Sreepon Admin',
        description: 'Admin push notifications',
        importance: Importance.high,
      );
      await _localNotifications!
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
          ?.createNotificationChannel(androidChannel);
    }

    // Foreground messages (app open).
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      _showLocalNotification(message);
    });

    // Notification tapped while app in background (opened from terminated state).
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      _handleNotificationTap(message.data['route'] ?? '/notifications');
    });

    // FCM rotates tokens; re-register so pushes keep flowing without a restart.
    _messaging!.onTokenRefresh.listen((token) {
      _ref.read(fcmTokenProvider.notifier).state = token;
      _registerDevice(token);
    });

    // Notification that launched the app from a terminated state — keep the
    // route until the router has mounted (see takePendingRoute).
    final initialMessage = await _messaging!.getInitialMessage();
    final initialRoute = initialMessage?.data['route'];
    if (initialRoute is String && initialRoute.isNotEmpty) {
      _pendingRoute = initialRoute;
      // FCM init runs after the first frame, so the shell has usually wired its
      // handler already. Otherwise the shell consumes it when it mounts.
      final handler = onNotificationTap;
      if (handler != null) {
        _pendingRoute = null;
        handler(initialRoute);
      }
    }

    // Get current FCM token and register with the backend.
    await registerDevice();
  }

  /// Re-register this device (call after sign-in, when the admin JWT is available).
  Future<void> registerDevice() async {
    final token = await _messaging?.getToken();
    if (token != null && token.isNotEmpty) {
      _ref.read(fcmTokenProvider.notifier).state = token;
      await _registerDevice(token);
    }
  }

  Future<void> _registerDevice(String token) async {
    try {
      await api.post(
        path: '/admin/notifications/devices',
        body: {'token': token, 'platform': Platform.isAndroid ? 'android' : 'ios'},
        fromJson: (json) => json,
      );
      await _refreshUnreadCount();
    } catch (error) {
      // Registration may fail if the user isn't an admin; ignore so the app
      // keeps working, but keep a breadcrumb for debugging.
      debugPrint('FCM device registration failed: $error');
    }
  }

  Future<void> _refreshUnreadCount() async {
    try {
      final data = await api.get<Map<String, dynamic>>(
        '/admin/notifications/unread-count',
        fromJson: (json) => json as Map<String, dynamic>,
      );
      final count = (data['count'] ?? 0) as int;
      _ref.read(unreadCountProvider.notifier).state = count;
    } catch (_) {
      // Ignore; badge will show 0.
    }
  }

  void _showLocalNotification(RemoteMessage message) {
    final android = AndroidNotificationDetails(
      'sreepon_admin',
      'Sreepon Admin',
      channelDescription: 'Admin push notifications',
      importance: Importance.high,
      priority: Priority.high,
    );
    _localNotifications?.show(
      message.hashCode,
      message.notification?.title ?? 'Sreepon Admin',
      message.notification?.body ?? '',
      NotificationDetails(android: android),
      payload: message.data['route'] ?? '/notifications',
    );
  }

  void _handleNotificationTap(String route) {
    // Deep-link handled by the app via a global navigator key callback.
    onNotificationTap?.call(route);
  }

  /// Callback set by the app shell to navigate on notification tap.
  ValueSetter<String>? onNotificationTap;

  /// Refresh the unread badge (call after sign-in / mark-all-read).
  Future<void> refreshBadge() => _refreshUnreadCount();
}

/// Provider exposing the FcmService instance.
final fcmServiceProvider = Provider<FcmService>((ref) {
  return FcmService(ref);
});
