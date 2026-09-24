import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';
import { logger } from '../utils/logger';

let initialized = false;

/**
 * Returns a configured Cloudinary instance, or null when Cloudinary has not
 * been configured (e.g. local development without media features).
 */
export function getCloudinary(): typeof cloudinary | null {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    logger.warn('Cloudinary is not configured — media endpoints will fail closed');
    return null;
  }

  if (!initialized) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    initialized = true;
    logger.info({ cloud: env.CLOUDINARY_CLOUD_NAME }, 'Cloudinary configured');
  }

  return cloudinary;
}

export interface CloudinaryUploaded {
  publicId: string;
  secureUrl: string;
  resourceType: string;
  width: number;
  height: number;
}

/** Upload a file buffer to Cloudinary and normalize its metadata. */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder: string; publicId?: string; resourceType?: 'image' | 'video' | 'raw' },
): Promise<CloudinaryUploaded> {
  const client = getCloudinary();
  if (!client) {
    throw new Error('Cloudinary is not configured');
  }
  const result = await new Promise<CloudinaryUploaded>((resolve, reject) => {
    const uploadStream = client.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType ?? 'image',
        transformation: [{ quality: 'auto:good', fetch_format: 'auto' }],
      },
      (err, resultData) => {
        if (err || !resultData) {
          reject(err ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          publicId: resultData.public_id,
          secureUrl: resultData.secure_url,
          resourceType: resultData.resource_type,
          width: resultData.width ?? 0,
          height: resultData.height ?? 0,
        });
      },
    );
    uploadStream.end(buffer);
  });
  return result;
}

/** Delete a Cloudinary asset by public id. */
export async function deleteFromCloudinary(publicId: string, resourceType = 'image'): Promise<void> {
  const client = getCloudinary();
  if (!client) {
    throw new Error('Cloudinary is not configured');
  }
  await client.uploader.destroy(publicId, { resource_type: resourceType }).catch(() => undefined);
}

export interface SignedUploadPayload {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string | undefined;
  resourceType: string;
  signature: string;
}

/**
 * Build a signature for a direct (browser/app) upload to Cloudinary. The
 * client uploads bytes straight to Cloudinary using this payload; the backend
 * never proxies media bytes. Returns null when Cloudinary is not configured.
 */
export function createSignedUploadPayload(options: {
  folder?: string;
  resourceType?: 'image' | 'video' | 'raw';
}): SignedUploadPayload | null {
  const client = getCloudinary();
  if (!client) {
    return null;
  }
  const timestamp = Math.round(Date.now() / 1000);
  const resourceType = options.resourceType ?? 'image';
  const params: Record<string, string | number> = { timestamp };
  if (options.folder) {
    params.folder = options.folder;
  }
  const signature = client.utils.api_sign_request(params, client.config().api_secret ?? '');
  return {
    cloudName: client.config().cloud_name ?? '',
    apiKey: client.config().api_key ?? '',
    timestamp,
    folder: options.folder,
    resourceType,
    signature,
  };
}