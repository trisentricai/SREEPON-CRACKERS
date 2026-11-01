import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/features/auth/auth_provider.dart';

/// Admin login — Supabase email/password sign-in.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _loading = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    setState(() => _loading = true);
    try {
      await ref.read(authProvider.notifier).signIn(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
      if (!mounted) return;
      if (ref.read(authProvider).valueOrNull == null) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Invalid email or password'), backgroundColor: SreeponAdminTheme.red600),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Sign in failed: $e'), backgroundColor: SreeponAdminTheme.red600),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SreeponAdminTheme.slate50,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.store, size: 64, color: SreeponAdminTheme.flame600),
              const SizedBox(height: 16),
              Text('Sreepon Admin',
                  style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: SreeponAdminTheme.slate900,
                      )),
              const SizedBox(height: 8),
              Text('Operations sign-in',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: SreeponAdminTheme.slate600)),
              const SizedBox(height: 32),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _passwordController,
                obscureText: _obscure,
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
                    onPressed: () => setState(() => _obscure = !_obscure),
                  ),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: FilledButton(
                  onPressed: _loading ? null : _signIn,
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Sign in'),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: _loading ? null : () {
                  // Password reset not implemented in MVP.
                },
                child: const Text('Forgot password?'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
