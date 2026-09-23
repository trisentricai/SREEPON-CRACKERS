import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createApp } from '../src/app';
import { prisma } from '../src/infrastructure/prisma';
import * as settingsService from '../src/modules/settings/service';

/**
 * Phase 7 settings tests against a real database. Store/delivery/tax/social/
 * legal groups are persisted as `SiteSetting` JSON rows and composed for the
 * public read models. Admin updates are exercised through the service with an
 * audit context (the HTTP surface is Supabase-guarded and covered separately).
 */
const hasDB = Boolean(process.env.DATABASE_URL);
const GROUP_PREFIX = 'settings.';

describe.skipIf(!hasDB)('settings against a real database', () => {
  const app = createApp();

  beforeAll(async () => {
    await prisma.siteSetting.deleteMany({ where: { key: { startsWith: GROUP_PREFIX } } });
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { resource: 'settings', action: 'SETTINGS_CHANGED' } });
    await prisma.siteSetting.deleteMany({ where: { key: { startsWith: GROUP_PREFIX } } });
  });

  it('returns defaults when nothing is stored', async () => {
    const settings = await settingsService.getPublicSettings();
    expect(settings.store.name).toBe('SriPon');
    expect(settings.store.currency).toBe('INR');
    expect(settings.delivery.deliveryFee).toBe('0.00');
    expect(settings.tax.rate).toBe(0);
    expect(settings.social.whatsappNumber).toBeNull();
  });

  it('updates the store group and exposes it publicly', async () => {
    const ctx = { actorId: randomUUID(), requestId: randomUUID() };
    await settingsService.updateSettings(
      { store: { name: 'SriPon Customer Care', tagline: 'Premium snacks', supportPhone: '+919876543210' } },
      ctx,
    );

    const settings = await settingsService.getPublicSettings();
    expect(settings.store.name).toBe('SriPon Customer Care');
    expect(settings.store.tagline).toBe('Premium snacks');
    expect(settings.store.supportPhone).toBe('+919876543210');
  });

  it('records a settings-changed audit entry', async () => {
    const ctx = { actorId: randomUUID(), requestId: randomUUID() };
    await settingsService.updateSettings({ tax: { enabled: true, rate: 18, gstin: '27AAPFU0939F1ZV' } }, ctx);

    const entry = await prisma.auditLog.findFirst({
      where: { resource: 'settings', action: 'SETTINGS_CHANGED', actorId: ctx.actorId, requestId: ctx.requestId },
    });
    expect(entry).not.toBeNull();
  });

  it('persists delivery money as a string and free-shipping threshold', async () => {
    await settingsService.updateSettings(
      { delivery: { enabled: true, deliveryFee: 49, freeShippingAbove: 1500 } },
      { actorId: randomUUID(), requestId: randomUUID() },
    );

    const settings = await settingsService.getPublicSettings();
    expect(settings.delivery.deliveryFee).toBe('49.00');
    expect(settings.delivery.freeShippingAbove).toBe('1500.00');
  });

  it('clears a nullable free-shipping threshold', async () => {
    await settingsService.updateSettings(
      { delivery: { freeShippingAbove: null } },
      { actorId: randomUUID(), requestId: randomUUID() },
    );

    const settings = await settingsService.getPublicSettings();
    expect(settings.delivery.freeShippingAbove).toBeNull();
  });

  it('serves legal pages with defaults for missing policies', async () => {
    await settingsService.updateSettings(
      { legal: { policies: { privacy: { title: 'Privacy Policy', body: 'We protect your data.' } } } },
      { actorId: randomUUID(), requestId: randomUUID() },
    );

    const legal = await settingsService.getLegalSettings();
    expect(legal.policies.privacy.body).toBe('We protect your data.');
    expect(legal.policies.terms.title).toBe('Terms of Service');
    expect(legal.policies.returns.title).toBe('Returns Policy');
  });

  it('merges saved social URLs over defaults', async () => {
    await settingsService.updateSettings(
      { social: { facebookUrl: 'https://facebook.com/sripon', whatsappNumber: '+919876543210' } },
      { actorId: randomUUID(), requestId: randomUUID() },
    );

    const publicSettings = await settingsService.getPublicSettings();
    expect(publicSettings.social.facebookUrl).toBe('https://facebook.com/sripon');
    expect(publicSettings.social.whatsappNumber).toBe('+919876543210');
  });

  it('serves the public settings HTTP surface', async () => {
    const res = await request(app).get('/api/v1/settings/public');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.store.name).toBe('SriPon Customer Care');
    expect(res.body.data.tax.rate).toBe(18);
  });
});
