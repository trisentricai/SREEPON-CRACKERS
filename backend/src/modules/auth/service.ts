import { UserStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { env, isDev } from '../../config/env';
import { getFirebaseAuth } from '../../infrastructure/firebase';
import { prisma } from '../../infrastructure/prisma';
import { ApiError } from '../../utils/http';

/**
 * The subset of Firebase claims the identity service depends on.
 * Controllers pass the fully-verified `DecodedIdToken`; tests can craft
 * minimal identities without a real Firebase backend.
 */
export interface FirebaseIdentity {
  uid: string;
  email?: string | null;
  name?: string | null;
  phone_number?: string | null;
}

/** Customer profile that is safe to expose to the client. */
export interface PublicProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}

export function toPublicProfile(user: {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
}): PublicProfile {
  // firebaseUid is an internal trust token and is never returned to clients.
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}

function assertNotSuspended(user: { isActive: boolean; status: UserStatus }) {
  if (!user.isActive || user.status === UserStatus.SUSPENDED) {
    throw ApiError.forbidden('This account has been suspended');
  }
}

/**
 * Bridge a Firebase-verified identity to the local customer profile.
 * - Matches by `firebaseUid`; falls back to an `email` match so profiles that
 *   pre-existed without auth get linked.
 * - Re-activates soft-deactivated accounts on sign-in.
 * - Falls back to a stable placeholder email for anonymous auth.
 */
export async function findOrCreateFromFirebase(identity: FirebaseIdentity): Promise<{
  user: PublicProfile & { firebaseUid: string };
  created: boolean;
}> {
  const existing = await prisma.user.findUnique({ where: { firebaseUid: identity.uid } });
  if (existing) {
    assertNotSuspended(existing);
    const user = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: identity.name ?? existing.name,
        phone: identity.phone_number ?? existing.phone,
        isActive: true,
        status: UserStatus.ACTIVE,
      },
    });
    return { user, created: false };
  }

  if (identity.email) {
    const byEmail = await prisma.user.findUnique({ where: { email: identity.email } });
    if (byEmail) {
      assertNotSuspended(byEmail);
      const user = await prisma.user.update({
        where: { id: byEmail.id },
        data: {
          firebaseUid: identity.uid,
          name: identity.name ?? byEmail.name,
          phone: identity.phone_number ?? byEmail.phone,
          isActive: true,
          status: UserStatus.ACTIVE,
        },
      });
      return { user, created: false };
    }
  }

  try {
    const user = await prisma.user.create({
      data: {
        firebaseUid: identity.uid,
        email: identity.email ?? `${identity.uid}@firebase.sripon.invalid`,
        name: identity.name ?? null,
        phone: identity.phone_number ?? null,
      },
    });
    return { user, created: true };
  } catch (err) {
    // Race: two concurrent sign-ins for the same brand-new user. Re-read the row.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const user = await prisma.user.findUniqueOrThrow({ where: { firebaseUid: identity.uid } });
      return { user, created: false };
    }
    throw err;
  }
}

/** Current customer profile from an authenticated Firebase uid. */
export async function getProfileByUid(
  uid: string,
): Promise<PublicProfile & { firebaseUid: string }> {
  const user = await prisma.user.findUnique({ where: { firebaseUid: uid } });
  if (!user) {
    throw ApiError.unauthorized('Profile not found — please sign in again');
  }
  assertNotSuspended(user);
  return user;
}

/**
 * Trigger a password reset email through Firebase Auth.
 * Always returns a generic success for known and unknown emails so the
 * endpoint cannot be abused to enumerate accounts. In development the
 * generated link is returned for convenience; production keeps it confidential.
 */
export async function requestPasswordReset(email: string): Promise<{ resetLink?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw ApiError.serviceUnavailable('Firebase authentication is not configured on this server');
  }

  const url = env.FIREBASE_PASSWORD_RESET_URL ?? (isDev ? 'http://localhost:5173' : null);
  if (!url) {
    throw ApiError.serviceUnavailable('Password reset is not configured on this server');
  }

  try {
    await auth.getUserByEmail(email);
  } catch {
    return {};
  }

  const resetLink = await auth.generatePasswordResetLink(email, { url });
  return isDev ? { resetLink } : {};
}

/** Revoke a customer's refresh tokens (full sign-out). */
export async function revokeRefreshTokens(uid: string): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) {
    throw ApiError.serviceUnavailable('Firebase authentication is not configured on this server');
  }
  await auth.revokeRefreshTokens(uid);
}