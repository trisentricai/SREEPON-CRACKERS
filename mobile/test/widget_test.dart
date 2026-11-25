// Basic Flutter widget test for the SriPon shell.
//
// The real app requires Firebase to boot, so this test pins a lightweight
// model/format behaviour instead of rendering the rooted app.

import 'package:flutter_test/flutter_test.dart';

import 'package:sripon/core/models/api_envelope.dart';
import 'package:sripon/core/models/catalog.dart';

void main() {
  group('models', () {
    test('pagination parses from a page envelope', () {
      final page = PageResult.fromJson<int>(
        {'items': [1, 2, 3], 'pagination': {'page': 1, 'limit': 20, 'total': 3, 'pages': 1}},
        (dynamic json) => json as int,
      );
      expect(page.items, [1, 2, 3]);
      expect(page.pagination.total, 3);
      expect(page.pagination.pages, 1);
    });

    test('product parses the public catalog shape', () {
      final product = Product.fromJson({
        'id': 'p1',
        'name': 'Classic Salted Chips (150 g)',
        'slug': 'classic-salted-chips',
        'shortDescription': 'Crunchy classic salted chips.',
        'description': null,
        'basePrice': '35.00',
        'mrpPrice': '40.00',
        'sku': 'QC-SNK-001',
        'unit': 'PACKET',
        'piecesPerBox': 1,
        'weightPerBox': null,
        'minimumAge': null,
        'isActive': true,
        'isFeatured': true,
        'isApproved': true,
        'createdAt': '2026-01-01T00:00:00Z',
        'updatedAt': '2026-01-01T00:00:00Z',
        'category': {'id': 'c1', 'name': 'Chips & Snacks', 'slug': 'chips-snacks'},
        'images': [
          {'id': 'i1', 'url': 'https://cdn.example/1.jpg', 'altText': null, 'displayOrder': 0},
        ],
        'inventory': {'quantity': 300, 'lowStockThreshold': 5},
      });
      expect(product.name, 'Classic Salted Chips (150 g)');
      expect(product.unit, ProductUnit.packet);
      expect(product.category?.slug, 'chips-snacks');
      expect(product.coverUrl, 'https://cdn.example/1.jpg');
    });
  });
}