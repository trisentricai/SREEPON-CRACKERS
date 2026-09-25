import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/models/models.dart';
import '../../../core/network/api_client.dart';
import '../../../core/providers/api_providers.dart';
import '../../../core/widgets/storefront.dart';
import '../../auth/application/auth_controller.dart' show authControllerProvider;

/// Account tab: sign-in/register, the authenticated `/users/me` profile with
/// editable name/phone, saved addresses, and links to orders / wishlist.
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  final TextEditingController _email = TextEditingController();
  final TextEditingController _password = TextEditingController();
  String? _authError;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    if (auth.isLoading) {
      return Scaffold(appBar: AppBar(title: const Text('Account')), body: const Center(child: CircularProgressIndicator()));
    }
    if (auth.isAuthenticated) {
      return _ProfileView();
    }
    return _buildSignIn();
  }

  Widget _buildSignIn() {
    return Scaffold(
      appBar: AppBar(title: const Text('Account')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SizedBox(height: 8),
          Text('SriPon', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(
            'Sign in to track orders and manage your address book.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 24),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder(), isDense: true),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder(), isDense: true),
          ),
          if (_authError != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(_authError!, style: const TextStyle(color: SriPonColors.danger)),
            ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : () => _authenticate(_signIn),
            child: _busy
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                : const Text('Sign in'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: _busy ? null : () => _authenticate(_register),
            child: const Text('Create account'),
          ),
          const SizedBox(height: 8),
          TextButton.icon(
            onPressed: _busy ? null : () => _authenticate(_google),
            icon: const Icon(Icons.g_mobiledata),
            label: const Text('Continue with Google'),
          ),
        ],
      ),
    );
  }

  Future<void> _authenticate(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _authError = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(() => _authError = error.toString().replaceAll('Exception: ', '').replaceAll('PlatformException(', ''));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _signIn() async {
    await ref.read(authControllerProvider.notifier).login(_email.text.trim(), _password.text);
  }

  Future<void> _register() async {
    await ref.read(authControllerProvider.notifier).register(_email.text.trim(), _password.text);
  }

  Future<void> _google() async {
    await ref.read(authControllerProvider.notifier).loginWithGoogle();
  }
}

class _ProfileView extends ConsumerStatefulWidget {
  @override
  ConsumerState<_ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends ConsumerState<_ProfileView> {
  final TextEditingController _name = TextEditingController();
  final TextEditingController _phone = TextEditingController();
  bool _saving = false;
  bool _addressEditorOpen = false;

  final _addressForm = <String, TextEditingController>{};

  static const _addressFields = <String, String>{
    'label': 'Label',
    'fullName': 'Full name',
    'phone': 'Phone',
    'line1': 'Address line 1',
    'line2': 'Address line 2',
    'city': 'City',
    'state': 'State',
    'pincode': 'Pincode',
    'country': 'Country',
  };

  @override
  void initState() {
    super.initState();
    for (final field in _addressFields.keys) {
      _addressForm[field] = TextEditingController();
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    for (final controller in _addressForm.values) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final profile = ref.watch(profileProvider);
    final addresses = ref.watch(addressesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Account'),
        actions: [
          TextButton(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            child: const Text('Sign out'),
          ),
        ],
      ),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => ErrorView(error: error, onRetry: () => ref.invalidate(profileProvider)),
        data: (data) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  foregroundImage: data.avatarUrl != null ? NetworkImage(data.avatarUrl!) : null,
                  child: Text(
                    (data.name ?? data.email).substring(0, 1).toUpperCase(),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        data.name ?? 'No name yet',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      Text(
                        data.email,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _section(context, 'Edit profile', Column(
              children: [
                TextField(
                  controller: _name..text = data.name ?? '',
                  decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder(), isDense: true),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _phone..text = data.phone ?? '',
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Phone', border: OutlineInputBorder(), isDense: true),
                ),
                const SizedBox(height: 12),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton.tonal(
                    onPressed: _saving ? null : () => _saveProfile(data),
                    child: _saving
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Text('Save changes'),
                  ),
                ),
              ],
            )),
            _section(context, 'Your activity', Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.receipt_long_outlined),
                  title: const Text('Orders'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).pushNamed('/orders'),
                ),
                ListTile(
                  leading: const Icon(Icons.favorite_outline),
                  title: const Text('Wishlist'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).pushNamed('/wishlist'),
                ),
                ListTile(
                  leading: const Icon(Icons.shopping_cart_outlined),
                  title: const Text('Cart'),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.of(context).pop(),
                ),
              ],
            )),
            _section(context, 'Addresses', Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final address in addresses.value ?? const <Address>[])
                  _addressTile(context, address),
                if (addresses.value?.isEmpty ?? true)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(
                      'No saved addresses yet.',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ),
                if (_addressEditorOpen) ..._buildAddressEditor(context) else
                  Align(
                    alignment: Alignment.centerLeft,
                    child: TextButton.icon(
                      onPressed: () => setState(() => _addressEditorOpen = true),
                      icon: const Icon(Icons.add),
                      label: const Text('Add address'),
                    ),
                  ),
              ],
            )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _addressTile(BuildContext context, Address address) {
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        dense: true,
        title: Text('${address.fullName} · ${address.label}'),
        subtitle: Text(
          '${address.line1}${address.line2 != null ? ', ${address.line2}' : ''}, '
          '${address.city}, ${address.state} ${address.pincode}',
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!address.isDefault)
              IconButton(
                tooltip: 'Set default',
                icon: const Icon(Icons.star_outline, size: 20),
                onPressed: () => _setDefault(address),
              ),
            IconButton(
              tooltip: 'Remove',
              icon: const Icon(Icons.delete_outline, size: 20),
              onPressed: () => _removeAddress(address),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildAddressEditor(BuildContext context) {
    return [
      for (final entry in _addressFields.entries)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: TextField(
            controller: _addressForm[entry.key],
            keyboardType: entry.key == 'pincode' ? TextInputType.number : TextInputType.text,
            decoration: InputDecoration(
              labelText: entry.value,
              isDense: true,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            ),
          ),
        ),
      Row(
        children: [
          FilledButton(
            onPressed: () => _saveAddress(),
            child: const Text('Save address'),
          ),
          const SizedBox(width: 8),
          OutlinedButton(
            onPressed: () => setState(() => _addressEditorOpen = false),
            child: const Text('Cancel'),
          ),
        ],
      ),
      const SizedBox(height: 8),
    ];
  }

  Future<void> _saveProfile(PublicProfile profile) async {
    setState(() => _saving = true);
    try {
      await api.patch(
        '/users/me',
        body: {
          if (_name.text.trim() != (profile.name ?? '')) 'name': _name.text.trim(),
          if (_phone.text.trim() != (profile.phone ?? '')) 'phone': _phone.text.trim(),
        },
        fromJson: PublicProfile.fromJson,
      );
      ref.invalidate(profileProvider);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _saveAddress() async {
    try {
      await api.post(
        '/addresses',
        body: {
          for (final entry in _addressFields.entries)
            entry.key: _addressForm[entry.key]!.text.trim(),
        },
        fromJson: (json) => json,
      );
      ref.invalidate(addressesProvider);
      if (mounted) setState(() => _addressEditorOpen = false);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _setDefault(Address address) async {
    try {
      await api.patch('/addresses/${address.id}/default', fromJson: (json) => json);
      ref.invalidate(addressesProvider);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _removeAddress(Address address) async {
    try {
      await api.delete('/addresses/${address.id}');
      ref.invalidate(addressesProvider);
    } on ApiException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Widget _section(BuildContext context, String title, Widget child) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          child,
        ],
      ),
    );
  }
}