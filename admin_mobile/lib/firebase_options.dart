import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

class DefaultFirebaseOptions {
  static FirebaseOptions get currentPlatform {
    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return android;
      case TargetPlatform.iOS:
        throw UnsupportedError(
          'iOS is not supported yet. Add GoogleService-Info.plist and configure iOS options.',
        );
      default:
        throw UnsupportedError(
          'DefaultFirebaseOptions are not supported for this platform.',
        );
    }
  }

  static const FirebaseOptions android = FirebaseOptions(
    apiKey: 'AIzaSyB4vnCxfwR2JnZJqvjtgimp6PeVDybTDtg',
    appId: '1:424126502999:android:7c5e6f838cd4e8b216eb12',
    messagingSenderId: '424126502999',
    projectId: 'admin-sreepon',
    storageBucket: 'admin-sreepon.firebasestorage.app',
  );
}
