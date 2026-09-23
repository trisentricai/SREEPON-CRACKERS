import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/infrastructure/prisma';
import * as service from '../src/modules/auth/service';

/**
 * Phase 3 identity bridge against a real database.
 * Exercises `findOrCreateFromFirebase` / `getProfileByUid` / `toPublicProfile`
 * directly with crafted identities — token verification itself is Firebase's
 * responsibility (and is covered by the DB-free validation suite).
 * Runs automatically when DATABASE_URL is configured; skipped otherwise.
 */
const hasDB = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDB)('auth identity service against a real database', () => {
  const stamp = Date.now();
  const uid = `it-uid-${stamp}`;
  const email = `it-${stamp}@example.com`;
  const linkUid = `it-uid-${stamp}-linked`;
  const linkEmail = `it-link-${stamp}@example.com`;
  const suspendedUid = `it-uid-${stamp}-suspended`;
  const suspendedEmail = `it-suspended-${stamp}@example.com`;

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        OR: [
          { firebaseUid: uid },
          { firebaseUid: linkUid },
          { firebaseUid: `${uid}-pre` },
          { email: linkEmail },
          { email: suspendedEmail },
        ],
      },
    });
  });

  it('creates a local User on first sign-in', async () => {
    const { user, created } = await service.findOrCreateFromFirebase({
      uid,
      email,
      name: 'Diwali Tester',
      phone_number: '+919876543210',
    });

    expect(created).toBe(true);
    expect(user.id).toBeTruthy();
    expect(user.email).toBe(email);
    expect(user.name).toBe('Diwali Tester');
    expect(user.phone).toBe('+919876543210');
    expect(user.isActive).toBe(true);
    expect(user.firebaseUid).toBe(uid);
  });

  it('is idempotent on subsequent sign-ins (same row, created=false)', async () => {
    const { user, created } = await service.findOrCreateFromFirebase({
      uid,
      email,
      name: 'Diwali Tester',
    });

    expect(created).toBe(false);
    const stored = await prisma.user.findUnique({ where: { firebaseUid: uid } });
    expect(stored?.id).toBe(user.id);
  });

  it('links an existing email-matched profile to the firebase uid', async () => {
    // A profile that pre-existed without auth (attached to a throwaway uid).
    await prisma.user.create({
      data: { firebaseUid: `${uid}-pre`, email: linkEmail, name: 'Pre Existing' },
    });

    const { created } = await service.findOrCreateFromFirebase({
      uid: linkUid,
      email: linkEmail,
      name: 'Renamed',
    });
    expect(created).toBe(false);

    const linked = await prisma.user.findUnique({ where: { firebaseUid: linkUid } });
    expect(linked?.email).toBe(linkEmail);
    expect(linked?.name).toBe('Renamed');
  });

  it('rejects a suspended user with 403 on sign-in', async () => {
    await prisma.user.create({
      data: { firebaseUid: suspendedUid, email: suspendedEmail, isActive: false },
    });

    await expect(service.findOrCreateFromFirebase({ uid: suspendedUid })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('exposes a public profile that never includes the firebaseUid', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: uid } });
    const profile = service.toPublicProfile(user);

    expect(profile).not.toHaveProperty('firebaseUid');
    expect(profile).not.toHaveProperty('password');
    expect(profile.id).toBe(user.id);
    expect(profile.email).toBe(email);
  });

  it('getProfileByUid fails closed for an unknown uid', async () => {
    await expect(service.getProfileByUid(`unknown-${stamp}`)).rejects.toMatchObject({
      status: 401,
    });
  });
});