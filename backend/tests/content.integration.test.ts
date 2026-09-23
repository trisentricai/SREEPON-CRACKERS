import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/prisma';
import * as bannersService from '../src/modules/banners/service';
import { createBannerSchema } from '../src/modules/banners/schema';
import { BannerPlacement, HomepageSectionType } from '../src/types/enums';
import * as homepageService from '../src/modules/homepage/service';

/**
 * Phase 6 content tests against a real database.
 * Business logic — banner CRUD/activate/duplicate/reorder and scheduled
 * windows, homepage section CRUD/reorder/config and the composed public
 * homepage — is exercised directly against the services; the public HTTP
 * surface (list + compose) is smoke-checked through the app.
 */
const hasDB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDB)('content against a real database', () => {
  const stamp = Date.now();
  const bannerIds: string[] = [];
  const sectionIds: string[] = [];
  const productId = randomUUID();
  const categoryId = randomUUID();

  const heroBanner = {
    placement: BannerPlacement.HOME_HERO,
    title: `Hero Sale ${stamp}`,
    imageUrl: `https://cdn.example.com/hero-${stamp}.png`,
    actionType: 'CUSTOM_URL' as const,
    actionTarget: 'https://example.com/sale',
    displayOrder: 0,
    isActive: true,
  };

  beforeAll(async () => {
    await prisma.product.create({
      data: {
        id: productId,
        name: `Featured Product ${stamp}`,
        slug: `featured-product-${stamp}`,
        sku: `FEAT-${stamp}`,
        basePrice: 500,
        unit: 'BOX',
        isActive: true,
        isApproved: true,
        isFeatured: true,
      },
    });
    await prisma.category.create({
      data: {
        id: categoryId,
        name: `Content Category ${stamp}`,
        slug: `content-category-${stamp}`,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    if (bannerIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: { resource: { in: bannerIds.map((id) => `banner:${id}`) } },
      });
      await prisma.banner.deleteMany({ where: { id: { in: bannerIds } } });
    }
    await prisma.homepageSection.deleteMany({ where: { id: { in: sectionIds } } });
    await prisma.siteSetting.deleteMany({ where: { key: 'homepage' } });
    await prisma.product.deleteMany({ where: { id: productId } });
    await prisma.category.deleteMany({ where: { id: categoryId } });
  });

  it('manages a banner through its full lifecycle', async () => {
    const created = await bannersService.createBanner({ ...heroBanner }, null);
    bannerIds.push(created.id);

    expect(created.placement).toBe(BannerPlacement.HOME_HERO);
    expect(created.displayOrder).toBe(0);
    expect(created.isActive).toBe(true);
    expect(created.category).toBeNull();

    const active = await bannersService.listActiveBanners();
    expect(active.some((b) => b.id === created.id)).toBe(true);

    const placed = await bannersService.listBannersForPlacement(BannerPlacement.HOME_HERO);
    expect(placed.some((b) => b.id === created.id)).toBe(true);

    const updated = await bannersService.updateBanner(
      created.id,
      { title: `Hero Sale v2 ${stamp}`, displayOrder: 3 },
      null,
    );
    expect(updated.title).toBe(`Hero Sale v2 ${stamp}`);
    expect(updated.displayOrder).toBe(3);

    const deactivated = await bannersService.activateBanner(created.id, { isActive: false }, null);
    expect(deactivated.isActive).toBe(false);
    expect((await bannersService.listActiveBanners()).some((b) => b.id === created.id)).toBe(false);

    await bannersService.activateBanner(created.id, { isActive: true }, null);

    const copy = await bannersService.duplicateBanner(created.id, null);
    bannerIds.push(copy.id);
    expect(copy.title).toContain('(copy)');
    expect(copy.isActive).toBe(false);

    const reordered = await bannersService.reorderBanners([{ id: created.id, displayOrder: 9 }]);
    const row = reordered.items.find((b) => b.id === created.id);
    expect(row?.displayOrder).toBe(9);

    const audit = await prisma.auditLog.findMany({
      where: { resource: `banner:${created.id}`, action: { in: ['BANNER_CREATED', 'BANNER_UPDATED'] } },
    });
    expect(audit.length).toBeGreaterThanOrEqual(2);

    await bannersService.deleteBanner(created.id, null);
    await expect(bannersService.getBanner(created.id)).rejects.toThrow(/Banner not found/);
  });

  it('hides scheduled and expired banners from the public queries', async () => {
    const future = await bannersService.createBanner(
      { ...heroBanner, title: `Future ${stamp}`, startAt: new Date(Date.now() + 86_400_000) },
      null,
    );
    const expired = await bannersService.createBanner(
      { ...heroBanner, title: `Expired ${stamp}`, endAt: new Date(Date.now() - 86_400_000) },
      null,
    );
    bannerIds.push(future.id, expired.id);

    const active = await bannersService.listActiveBanners();
    expect(active.some((b) => b.id === future.id)).toBe(false);
    expect(active.some((b) => b.id === expired.id)).toBe(false);

    const placed = await bannersService.listBannersForPlacement(BannerPlacement.HOME_HERO);
    expect(placed.some((b) => b.id === future.id)).toBe(false);
    expect(placed.some((b) => b.id === expired.id)).toBe(false);

    const invalidWindow = createBannerSchema.safeParse({
      ...heroBanner,
      startAt: new Date(Date.now() + 3600_000).toISOString(),
      endAt: new Date(Date.now() - 3600_000).toISOString(),
    });
    expect(invalidWindow.success).toBe(false);
  });

  it('composes a public homepage from sections, banners, products and categories', async () => {
    await homepageService.updateHomepageConfig({ heroTitle: `Big Diwali Sale ${stamp}`, heroTagline: 'Fresh stock' });

    const hero = await homepageService.createSection({ type: HomepageSectionType.HERO, displayOrder: 0, isActive: true });
    const featured = await homepageService.createSection({
      type: HomepageSectionType.FEATURED_PRODUCTS,
      title: 'Featured',
      config: { limit: 5 },
      displayOrder: 1,
      isActive: true,
    });
    const grid = await homepageService.createSection({ type: HomepageSectionType.CATEGORY_GRID, displayOrder: 2, isActive: true });
    sectionIds.push(hero.id, featured.id, grid.id);

    const homepage = await homepageService.getHomepage();
    expect(homepage.config).toEqual({ heroTitle: `Big Diwali Sale ${stamp}`, heroTagline: 'Fresh stock' });
    expect(homepage.sections.length).toBeGreaterThanOrEqual(3);

    const typedHero = homepage.sections.find((s) => s.type === HomepageSectionType.HERO);
    expect(typedHero).toBeDefined();
    expect((typedHero?.content as { banners: unknown[] }).banners).toEqual([]);

    const typedFeatured = homepage.sections.find((s) => s.type === HomepageSectionType.FEATURED_PRODUCTS);
    const featuredProducts = (typedFeatured?.content as { products: Array<{ id: string; basePrice: string; image: string | null }> }).products;
    expect(featuredProducts.some((p) => p.id === productId)).toBe(true);
    expect(featuredProducts.find((p) => p.id === productId)?.basePrice).toBe('500.00');

    const typedGrid = homepage.sections.find((s) => s.type === HomepageSectionType.CATEGORY_GRID);
    const gridCategories = (typedGrid?.content as { categories: Array<{ id: string }> }).categories;
    expect(gridCategories.some((c) => c.id === categoryId)).toBe(true);

    const prolonged = await homepageService.updateSection(hero.id, { isActive: false, title: 'Hero (draft)' });
    expect(prolonged.isActive).toBe(false);
    expect((await homepageService.getHomepage()).sections.some((s) => s.id === hero.id)).toBe(false);

    const all = await homepageService.listSections({});
    expect(all.some((s) => s.id === hero.id)).toBe(true);

    await homepageService.deleteSection(hero.id);
    await expect(homepageService.updateSection(hero.id, { title: 'nope' })).rejects.toThrow(
      /Homepage section not found/,
    );

    const reordered = await homepageService.reorderSections([
      { id: grid.id, displayOrder: 0 },
      { id: featured.id, displayOrder: 1 },
    ]);
    expect(reordered[0]?.id).toBe(grid.id);
    expect(reordered[1]?.id).toBe(featured.id);
  });

  it('serves the public banner + homepage routes over HTTP', async () => {
    const banners = await request(createApp()).get('/api/v1/banners');
    expect(banners.status).toBe(200);
    expect(banners.body.success).toBe(true);
    expect(Array.isArray(banners.body.data)).toBe(true);

    const placed = await request(createApp()).get(`/api/v1/banners/${BannerPlacement.HOME_HERO}`);
    expect(placed.status).toBe(200);
    expect(placed.body.success).toBe(true);

    const homepage = await request(createApp()).get('/api/v1/homepage');
    expect(homepage.status).toBe(200);
    expect(homepage.body.success).toBe(true);
    expect(Array.isArray(homepage.body.data.sections)).toBe(true);
    expect(Array.isArray(homepage.body.data.banners)).toBe(true);
  });
});