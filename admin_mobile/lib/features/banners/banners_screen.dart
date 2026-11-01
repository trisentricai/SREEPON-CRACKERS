import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:sreepon_admin/core/models/banners.dart';
import 'package:sreepon_admin/core/network/api_client.dart';
import 'package:sreepon_admin/core/theme/sreepon_admin_theme.dart';
import 'package:sreepon_admin/core/utils/format.dart';
import 'package:sreepon_admin/core/widgets/widgets.dart';
import 'package:sreepon_admin/features/notifications/media_provider.dart';

final bannersProvider = FutureProvider<BannerListResponse>((ref) async {
  final data = await api.get<Map<String, dynamic>>(
    '/admin/banners',
    query: {'page': 1, 'limit': 20},
    fromJson: (json) => json as Map<String, dynamic>,
  );
  return BannerListResponse.fromJson(data);
});

class BannersScreen extends ConsumerStatefulWidget {
  const BannersScreen({super.key});

  @override
  ConsumerState<BannersScreen> createState() => _BannersScreenState();
}

class _BannersScreenState extends ConsumerState<BannersScreen> {
  Uint8List? _pickedImageBytes;
  String? _pickedImageName;
  String? _uploadedUrl;
  bool _uploading = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70, maxWidth: 1200);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    setState(() {
      _pickedImageBytes = bytes;
      _pickedImageName = picked.name;
      _uploadedUrl = null;
    });
  }

  Future<void> _uploadImage() async {
    if (_pickedImageBytes == null) return;
    setState(() => _uploading = true);
    try {
      final policy = await ref.read(signUploadProvider({
        'folder': 'sreepon/banners',
        'resourceType': 'image',
      }).future);
      final result = await uploadImageToCloudinary(
        policy: policy,
        bytes: _pickedImageBytes!,
        fileName: _pickedImageName ?? 'banner.jpg',
      );
      setState(() {
        _uploadedUrl = result['secure_url'] as String?;
        _uploading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Image uploaded to Cloudinary'), backgroundColor: SreeponAdminTheme.green600),
        );
      }
    } catch (e) {
      setState(() => _uploading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Upload failed: $e'), backgroundColor: SreeponAdminTheme.red600),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(bannersProvider);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SectionHeader(
                  title: 'Banners',
                  subtitle: 'Homepage and placement banners',
                  trailing: IconButton(icon: const Icon(Icons.refresh), onPressed: () => ref.refresh(bannersProvider)),
                ),
                // Image upload demo
                Card(
                  margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Upload banner image',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: SreeponAdminTheme.slate900)),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            OutlinedButton.icon(
                              onPressed: _uploading ? null : _pickImage,
                              icon: const Icon(Icons.image),
                              label: const Text('Pick image'),
                            ),
                            const SizedBox(width: 12),
                            if (_pickedImageBytes != null)
                              OutlinedButton.icon(
                                onPressed: _uploading ? null : _uploadImage,
                                icon: const Icon(Icons.cloud_upload),
                                label: const Text('Upload to Cloudinary'),
                              ),
                            if (_uploading) const SizedBox(width: 12, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
                          ],
                        ),
                        if (_pickedImageBytes != null) ...[
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.memory(_pickedImageBytes!, width: 160, height: 100, fit: BoxFit.cover),
                          ),
                        ],
                        if (_uploadedUrl != null) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: SreeponAdminTheme.slate50,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: SreeponAdminTheme.slate200),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Uploaded URL', style: TextStyle(fontSize: 12, color: SreeponAdminTheme.slate500)),
                                const SizedBox(height: 4),
                                SelectableText(_uploadedUrl!,
                                    style: const TextStyle(fontSize: 12, fontFamily: 'monospace', color: SreeponAdminTheme.indigo600)),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          async.when(
            data: (resp) => _buildList(context, resp),
            loading: () => const SliverFillRemaining(child: Spinner()),
            error: (e, _) => SliverFillRemaining(
              child: ErrorState(
                message: e is ApiException ? e.message : 'Failed to load banners',
                onRetry: () => ref.refresh(bannersProvider),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(onPressed: () {}, child: const Icon(Icons.add)),
    );
  }

  Widget _buildList(BuildContext context, BannerListResponse resp) {
    if (resp.items.isEmpty) {
      return const SliverFillRemaining(
        child: EmptyState(title: 'No banners yet.', icon: Icons.image_outlined),
      );
    }

    return SliverList(
      delegate: SliverChildBuilderDelegate(
        (context, index) {
          final banner = resp.items[index];
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: ListTile(
              leading: banner.imageUrl != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(banner.imageUrl!, width: 56, height: 56, fit: BoxFit.cover),
                    )
                  : const CircleAvatar(child: Icon(Icons.image_outlined)),
              title: Text(banner.title ?? 'Untitled', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 4),
                  Text('${banner.placement ?? '-'} · order #${banner.displayOrder}', style: const TextStyle(fontSize: 12, color: SreeponAdminTheme.slate600)),
                ],
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  StatusChip(text: banner.isActive ? 'Active' : 'Inactive', tone: banner.isActive ? 'green' : 'slate'),
                  const SizedBox(height: 6),
                  Switch(value: banner.isActive, onChanged: (_) {}, activeColor: SreeponAdminTheme.flame600),
                ],
              ),
            ),
          );
        },
        childCount: resp.items.length,
      ),
    );
  }
}
