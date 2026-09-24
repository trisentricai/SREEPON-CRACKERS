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
        'name': 'Rocket Bundle',
        'slug': 'rocket-bundle',
        'shortDescription': null,
        'description': null,
        'basePrice': '199.00',
        'mrpPrice': '249.00',
        'sku': 'RKT-001',
        'unit': 'PACKET',
        'piecesPerBox': 12,
        'weightPerBox': null,
        'minimumAge': 18,
        'isActive': true,
        'isFeatured': true,
        'isApproved': true,
        'createdAt': '2026-01-01T00:00:00Z',
        'updatedAt': '2026-01-01T00:00:00Z',
        'category': {'id': 'c1', 'name': 'Rockets', 'slug': 'rockets'},
        'images': [
          {'id': 'i1', 'url': 'https://cdn.example/1.jpg', 'altText': null, 'displayOrder': 0},
        ],
        'inventory': {'quantity': 50, 'lowStockThreshold': 5},
      });
      expect(product.name, 'Rocket Bundle');
      expect(product.unit, ProductUnit.packet);
      expect(product.category?.slug, 'rockets');
      expect(product.coverUrl, 'https://cdn.example/1.jpg');
    });
  });
}