import { createSignedUploadPayload, uploadToCloudinary } from '../../infrastructure/cloudinary';
import { prisma } from '../../infrastructure/prisma';
import { getProfileByUid } from '../auth/service';
import { ApiError } from '../../utils/http';
import type { AvatarUploadInput, SignUploadInput } from './schema';

/** Server-side signature for a straight-to-Cloudinary upload. */
export async function signUpload(input: SignUploadInput) {
  const payload = createSignedUploadPayload({
    folder: input.folder,
    resourceType: input.resourceType,
  });
  if (!payload) {
    throw ApiError.serviceUnavailable('Media uploads are not configured on this server');
  }
  return payload;
}

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Upload a customer avatar (base64 body) to Cloudinary and record the URL. */
export async function updateAvatar(uid: string, input: AvatarUploadInput) {
  const buffer = Buffer.from(input.image, 'base64');
  if (buffer.length === 0) {
    throw ApiError.badRequest('Image data could not be decoded');
  }
  if (buffer.length > AVATAR_MAX_BYTES) {
    throw ApiError.unprocessable('Avatar image must be 2 MB or smaller');
  }

  const profile = await getProfileByUid(uid);
  let secureUrl: string;
  try {
    const uploaded = await uploadToCloudinary(buffer, {
      folder: 'sripon/avatars',
      resourceType: 'image',
    });
    secureUrl = uploaded.secureUrl;
  } catch (err) {
    throw ApiError.serviceUnavailable('Avatar upload failed — media service unavailable');
  }

  const user = await prisma.user.update({
    where: { id: profile.id },
    data: { avatarUrl: secureUrl },
  });

  return {
    userId: user.id,
    avatarUrl: user.avatarUrl,
  };
}