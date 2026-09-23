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